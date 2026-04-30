// android/app/src/main/cpp/thermal_uvc.cpp
// Direct UVC-over-usbdevfs isochronous streaming — bypasses saki4510t wrapper.
// Matches the libuvc approach used by nExt Camera on the same hardware.

#include <jni.h>
#include <android/log.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <errno.h>
#include <pthread.h>
#include <linux/usbdevice_fs.h>
#include <sys/ioctl.h>
#include <asm/byteorder.h>

#define LOG_TAG "ThermalUVC"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// UVC control request types
#define USB_DIR_OUT             0x00
#define USB_DIR_IN              0x80
#define USB_TYPE_CLASS          0x20
#define USB_RECIP_INTERFACE     0x01
#define UVC_SET_CUR             0x01
#define UVC_GET_CUR             0x81
#define UVC_GET_MIN             0x82
#define UVC_GET_MAX             0x83
#define UVC_VS_PROBE_CONTROL    0x01
#define UVC_VS_COMMIT_CONTROL   0x02

// UVC VideoStreaming interface and endpoint for PureThermal Mini Pro
// Interface 1 = VideoStreaming; altsetting 0 = zero-bandwidth, 1 = isochronous
#define UVC_STREAM_IFACE    1
#define UVC_ISO_EP          0x81    // IN endpoint
#define UVC_ALT_ZERO        0
#define UVC_ALT_ISO         1

// URB pool: 4 URBs × 4 packets × 1024 bytes.
// PureThermal Mini Pro at 9Hz is low-bandwidth enough that 16 packets in flight
// keeps the pipeline saturated. Actual stride = pkt_stride from UVC negotiation.
// Samsung kernels enforce iso_frame_desc[p].length <= wMaxPacketSize exactly.
#define NUM_URBS        4
#define PKTS_PER_URB    4
#define PKT_SIZE_MAX    1024                        // static buffer upper bound per packet
#define URB_BUF_SIZE    (PKTS_PER_URB * PKT_SIZE_MAX)

// Full 160×120 Y16 frame = 38400 bytes. The blind accumulator delivers at
// exactly this boundary so each onNativeFrame call contains a complete frame.
#define FRAME_TARGET_BYTES  (160 * 120 * 2)     // 38400 — full 160×120 frame
#define FRAME_BUF_SIZE      (FRAME_TARGET_BYTES + 1024)

// UVC Probe/Commit control layout (26 bytes, little-endian)
struct __attribute__((packed)) uvc_stream_ctrl {
    uint16_t bmHint;
    uint8_t  bFormatIndex;
    uint8_t  bFrameIndex;
    uint32_t dwFrameInterval;
    uint16_t wKeyFrameRate;
    uint16_t wPFrameRate;
    uint16_t wCompQuality;
    uint16_t wCompWindowSize;
    uint16_t wDelay;
    uint32_t dwMaxVideoFrameSize;
    uint32_t dwMaxPayloadTransferSize;
};

struct UrbEntry {
    struct usbdevfs_urb urb;
    struct usbdevfs_iso_packet_desc pkts[PKTS_PER_URB];
    uint8_t buf[URB_BUF_SIZE];
};

struct ThermalDevice {
    int fd;
    bool running;
    pthread_t thread;
    uint32_t pkt_stride;  // exact dwMaxPayloadTransferSize from UVC negotiation (e.g. 642)

    UrbEntry urbs[NUM_URBS];

    // Frame assembly
    uint8_t frame_buf[FRAME_BUF_SIZE];
    size_t  frame_len;
    int8_t  last_fid;   // -1 = uninitialized; 0/1 = last seen FID bit

    // JNI back-ref
    JavaVM*  jvm;
    jobject  module_obj; // global ref to UVCModule Kotlin instance
    jmethodID on_frame_mid;
};

static ThermalDevice* g_dev = nullptr;
// 0=auto (UYVY first), 1=UYVY only (RGB false-color), 2=Y16 first (radiometric)
static int g_format_pref = 0;

// Send a USB control transfer via usbdevfs
static int uvc_control(int fd, uint8_t bmRequestType, uint8_t bRequest,
                        uint16_t wValue, uint16_t wIndex,
                        void* data, uint16_t wLength) {
    struct usbdevfs_ctrltransfer ctrl = {};
    ctrl.bRequestType = bmRequestType;
    ctrl.bRequest     = bRequest;
    ctrl.wValue       = wValue;
    ctrl.wIndex       = wIndex;
    ctrl.wLength      = wLength;
    ctrl.data         = data;
    ctrl.timeout      = 1000;
    int r = ioctl(fd, USBDEVFS_CONTROL, &ctrl);
    if (r < 0) {
        LOGW("uvc_control req=0x%02x val=0x%04x idx=%d len=%d err=%d (%s)",
             bRequest, wValue, wIndex, wLength, errno, strerror(errno));
    }
    return r;
}

// Negotiate and commit UVC stream parameters.
// out_max_payload receives dwMaxPayloadTransferSize from the device's GET_CUR response.
static int uvc_negotiate(int fd, uint8_t format_index, uint8_t frame_index,
                         uint32_t frame_interval, uint32_t* out_max_payload) {
    struct uvc_stream_ctrl ctrl = {};
    ctrl.bmHint         = __cpu_to_le16(1);  // dwFrameInterval is fixed
    ctrl.bFormatIndex   = format_index;
    ctrl.bFrameIndex    = frame_index;
    ctrl.dwFrameInterval = __cpu_to_le32(frame_interval);

    // SET_CUR Probe
    int r = uvc_control(fd,
        USB_DIR_OUT | USB_TYPE_CLASS | USB_RECIP_INTERFACE, UVC_SET_CUR,
        UVC_VS_PROBE_CONTROL << 8, UVC_STREAM_IFACE,
        &ctrl, sizeof(ctrl));
    if (r < 0) { LOGE("Probe SET_CUR failed"); return -1; }

    // GET_CUR Probe — read back negotiated values
    memset(&ctrl, 0, sizeof(ctrl));
    r = uvc_control(fd,
        USB_DIR_IN | USB_TYPE_CLASS | USB_RECIP_INTERFACE, UVC_GET_CUR,
        UVC_VS_PROBE_CONTROL << 8, UVC_STREAM_IFACE,
        &ctrl, sizeof(ctrl));
    if (r < 0) { LOGE("Probe GET_CUR failed"); return -1; }

    uint32_t max_payload = __le32_to_cpu(ctrl.dwMaxPayloadTransferSize);
    LOGI("Negotiated: fmt=%d frm=%d interval=%u maxFrame=%u maxPayload=%u",
         ctrl.bFormatIndex, ctrl.bFrameIndex,
         __le32_to_cpu(ctrl.dwFrameInterval),
         __le32_to_cpu(ctrl.dwMaxVideoFrameSize),
         max_payload);

    // SET_CUR Commit
    r = uvc_control(fd,
        USB_DIR_OUT | USB_TYPE_CLASS | USB_RECIP_INTERFACE, UVC_SET_CUR,
        UVC_VS_COMMIT_CONTROL << 8, UVC_STREAM_IFACE,
        &ctrl, sizeof(ctrl));
    if (r < 0) { LOGE("Commit SET_CUR failed"); return -1; }

    if (out_max_payload) *out_max_payload = max_payload;
    return 0;
}

// Submit one isochronous URB
static int submit_urb(ThermalDevice* dev, int i) {
    UrbEntry* e = &dev->urbs[i];
    memset(&e->urb, 0, sizeof(e->urb));
    e->urb.type          = USBDEVFS_URB_TYPE_ISO;
    e->urb.endpoint      = UVC_ISO_EP;
    e->urb.flags         = USBDEVFS_URB_ISO_ASAP;
    e->urb.buffer        = e->buf;
    e->urb.buffer_length = dev->pkt_stride * PKTS_PER_URB;
    e->urb.number_of_packets = PKTS_PER_URB;
    e->urb.usercontext   = (void*)(intptr_t)i;
    for (int p = 0; p < PKTS_PER_URB; p++) {
        e->pkts[p].length = dev->pkt_stride;  // must equal wMaxPacketSize exactly
    }
    // iso_frame_desc must be contiguous after the urb struct
    // Use the kernel's layout expectation via the ioctl directly
    int r = ioctl(dev->fd, USBDEVFS_SUBMITURB, &e->urb);
    if (r < 0) LOGW("SUBMITURB[%d] err=%d (%s)", i, errno, strerror(errno));
    return r;
}

// Deliver a complete frame to Java
static void deliver_frame(ThermalDevice* dev, JNIEnv* env) {
    if (dev->frame_len == 0) return;
    LOGI("deliver_frame bytes=%zu", dev->frame_len);
    jbyteArray arr = env->NewByteArray((jsize)dev->frame_len);
    if (!arr) { dev->frame_len = 0; return; }
    env->SetByteArrayRegion(arr, 0, (jsize)dev->frame_len,
                             reinterpret_cast<const jbyte*>(dev->frame_buf));
    env->CallVoidMethod(dev->module_obj, dev->on_frame_mid, arr);
    env->DeleteLocalRef(arr);
    if (env->ExceptionCheck()) env->ExceptionClear();
    dev->frame_len = 0;
}

// Streaming thread — reaps URBs, parses UVC payload headers, assembles frames
static void* stream_thread(void* arg) {
    ThermalDevice* dev = (ThermalDevice*)arg;
    JNIEnv* env = nullptr;
    JavaVMAttachArgs attach_args = { JNI_VERSION_1_6, "ThermalStream", nullptr };
    dev->jvm->AttachCurrentThread(&env, &attach_args);

    LOGI("stream_thread started");

    while (dev->running) {
        struct usbdevfs_urb* reaped = nullptr;
        int r = ioctl(dev->fd, USBDEVFS_REAPURBNDELAY, &reaped);
        if (r < 0) {
            if (errno == EAGAIN) {
                usleep(500);
                continue;
            }
            // Fatal: device gone or teardown in progress
            if (errno == ENODEV || errno == ESHUTDOWN || errno == ENOENT) {
                LOGE("REAPURB fatal err=%d (%s)", errno, strerror(errno));
                break;
            }
            // Transient: overflow, stall, comm error — skip and continue
            LOGW("REAPURB transient err=%d (%s)", errno, strerror(errno));
            usleep(2000);
            continue;
        }
        if (!reaped) continue;

        int idx = (int)(intptr_t)reaped->usercontext;
        UrbEntry* e = &dev->urbs[idx];

        // UVC header-aware frame assembly.
        // FID (bit 0) toggles at each true frame boundary — use it to resync.
        // EOF (bit 1) marks the last packet of a frame — deliver on receipt.
        // Fallback: deliver at FRAME_TARGET_BYTES in case FID/EOF are absent.
        uint8_t* ptr = e->buf;
        for (int p = 0; p < PKTS_PER_URB; p++) {
            int actual = (int)e->urb.iso_frame_desc[p].actual_length;
            if (actual < 2) { ptr += dev->pkt_stride; continue; }

            uint8_t hdr_len   = ptr[0];
            uint8_t hdr_flags = ptr[1];

            if (hdr_len < 2 || hdr_len > actual || (hdr_flags & 0x40)) {
                ptr += dev->pkt_stride;
                continue;
            }

            uint8_t fid = hdr_flags & 0x01;
            bool    eof = (hdr_flags & 0x02) != 0;

            // FID toggle → true frame boundary.
            // Accept if ≥90% accumulated (handles slight telemetry-row size variance).
            if (dev->last_fid >= 0 && fid != (uint8_t)dev->last_fid) {
                if (dev->frame_len >= (size_t)(FRAME_TARGET_BYTES * 9 / 10)) {
                    if (dev->frame_len > FRAME_TARGET_BYTES) dev->frame_len = FRAME_TARGET_BYTES;
                    deliver_frame(dev, env);
                } else if (dev->frame_len > 0) {
                    LOGW("FID resync: dropping %zu-byte partial frame", dev->frame_len);
                    dev->frame_len = 0;
                }
            }
            dev->last_fid = (int8_t)fid;

            // Append payload
            int payload_len = actual - hdr_len;
            if (payload_len > 0) {
                size_t space = FRAME_BUF_SIZE - dev->frame_len;
                if ((size_t)payload_len > space) payload_len = (int)space;
                memcpy(dev->frame_buf + dev->frame_len, ptr + hdr_len, payload_len);
                dev->frame_len += payload_len;
            }

            // EOF → deliver complete frame
            if (eof && dev->frame_len >= FRAME_TARGET_BYTES) {
                dev->frame_len = FRAME_TARGET_BYTES;
                deliver_frame(dev, env);
            }

            // Fallback: deliver if buffer is full (handles missing FID/EOF)
            if (dev->frame_len >= FRAME_TARGET_BYTES) {
                dev->frame_len = FRAME_TARGET_BYTES;
                deliver_frame(dev, env);
            }

            ptr += dev->pkt_stride;
        }

        // Resubmit this URB
        if (dev->running) {
            submit_urb(dev, idx);
        }
    }

    LOGI("stream_thread exiting");
    dev->jvm->DetachCurrentThread();
    return nullptr;
}

extern "C" {

// Called from Kotlin: UVCModule.nativeOpen(fd: Int): Int
// fd = file descriptor from UsbDeviceConnection.fileDescriptor
// Returns 0 on success, negative on error.
JNIEXPORT jint JNICALL
Java_com_anonymous_vestigia_UVCModule_nativeOpen(JNIEnv* env, jobject thiz, jint fd) {
    if (g_dev) {
        LOGW("nativeOpen called while already open — closing previous");
        // signal thread stop (best-effort)
        if (g_dev->running) {
            g_dev->running = false;
            pthread_join(g_dev->thread, nullptr);
        }
        delete g_dev;
        g_dev = nullptr;
    }

    LOGI("nativeOpen fd=%d", fd);

    // Disconnect from the kernel UVC driver so we can claim the interface
    struct usbdevfs_ioctl disc = {};
    disc.ifno = UVC_STREAM_IFACE;
    disc.ioctl_code = USBDEVFS_DISCONNECT;
    disc.data = nullptr;
    ioctl(fd, USBDEVFS_IOCTL, &disc); // best-effort; may fail if not bound

    // Claim interface 1 (VideoStreaming)
    int iface = UVC_STREAM_IFACE;
    if (ioctl(fd, USBDEVFS_CLAIMINTERFACE, &iface) < 0) {
        LOGE("CLAIMINTERFACE 1 failed: %d (%s)", errno, strerror(errno));
        return -1;
    }
    LOGI("CLAIMINTERFACE 1 OK");

    // Set altsetting 0 (zero-bandwidth) before negotiation
    struct usbdevfs_setinterface si0 = { UVC_STREAM_IFACE, UVC_ALT_ZERO };
    ioctl(fd, USBDEVFS_SETINTERFACE, &si0);

    // Try formats in order based on preference.
    // 1=UYVY (RGB false-color), 2=Y16 (radiometric). Default: UYVY first.
    int neg_ok = -1;
    uint32_t negotiated_pkt_size = 0;
    uint8_t fmt_indices[2];
    int n_fmts;
    if (g_format_pref == 2) {
        fmt_indices[0] = 2; fmt_indices[1] = 1; n_fmts = 2;  // Y16 preferred
    } else if (g_format_pref == 1) {
        fmt_indices[0] = 1; n_fmts = 1;  // UYVY only
    } else {
        fmt_indices[0] = 1; fmt_indices[1] = 2; n_fmts = 2;  // auto: UYVY first
    }
    for (int _fi = 0; _fi < n_fmts; _fi++) {
        uint8_t fi = fmt_indices[_fi];
        neg_ok = uvc_negotiate(fd, fi, 1, 1111111, &negotiated_pkt_size);
        if (neg_ok == 0) {
            LOGI("Negotiated format index %d pkt_size=%u", fi, negotiated_pkt_size);
            break;
        }
    }
    if (neg_ok < 0) {
        LOGE("UVC negotiation failed for all formats");
        ioctl(fd, USBDEVFS_RELEASEINTERFACE, &iface);
        return -2;
    }
    // Clamp pkt_size to valid range; fall back to 642 (PureThermal known value) if negotiation
    // returned 0 or an unreasonably large value for our static buffers.
    if (negotiated_pkt_size < 64 || negotiated_pkt_size > PKT_SIZE_MAX) {
        LOGW("Unexpected pkt_stride=%u, clamping to 642", negotiated_pkt_size);
        negotiated_pkt_size = 642;
    }

    // Switch to isochronous altsetting to enable bandwidth
    struct usbdevfs_setinterface si1 = { UVC_STREAM_IFACE, UVC_ALT_ISO };
    if (ioctl(fd, USBDEVFS_SETINTERFACE, &si1) < 0) {
        LOGE("SETINTERFACE alt=1 failed: %d (%s)", errno, strerror(errno));
        // Non-fatal on some devices — continue
    } else {
        LOGI("SETINTERFACE alt=1 OK");
    }

    ThermalDevice* dev = new ThermalDevice();
    memset(dev, 0, sizeof(*dev));
    dev->fd = fd;
    dev->last_fid = -1;
    dev->running = true;
    dev->pkt_stride = negotiated_pkt_size;
    LOGI("URB pool: %d URBs × %d pkts × stride=%u = %u bytes/URB",
         NUM_URBS, PKTS_PER_URB, negotiated_pkt_size,
         negotiated_pkt_size * PKTS_PER_URB);

    // Store JNI refs
    env->GetJavaVM(&dev->jvm);
    dev->module_obj = env->NewGlobalRef(thiz);
    jclass cls = env->GetObjectClass(thiz);
    dev->on_frame_mid = env->GetMethodID(cls, "onNativeFrame", "([B)V");
    if (!dev->on_frame_mid) {
        LOGE("onNativeFrame method not found");
        env->DeleteGlobalRef(dev->module_obj);
        delete dev;
        ioctl(fd, USBDEVFS_RELEASEINTERFACE, &iface);
        return -3;
    }

    // Submit initial URB pool
    int submitted = 0;
    for (int i = 0; i < NUM_URBS; i++) {
        if (submit_urb(dev, i) == 0) submitted++;
    }
    LOGI("Submitted %d/%d URBs", submitted, NUM_URBS);

    if (submitted == 0) {
        LOGE("No URBs submitted — giving up");
        env->DeleteGlobalRef(dev->module_obj);
        delete dev;
        ioctl(fd, USBDEVFS_RELEASEINTERFACE, &iface);
        return -4;
    }

    g_dev = dev;
    pthread_create(&dev->thread, nullptr, stream_thread, dev);
    LOGI("nativeOpen complete — streaming started");
    return 0;
}

// Called from Kotlin: UVCModule.nativeClose()
JNIEXPORT void JNICALL
Java_com_anonymous_vestigia_UVCModule_nativeClose(JNIEnv* env, jobject thiz) {
    if (!g_dev) return;
    LOGI("nativeClose");

    ThermalDevice* dev = g_dev;
    g_dev = nullptr;
    dev->running = false;

    // Discard queued URBs so REAPURB unblocks
    for (int i = 0; i < NUM_URBS; i++) {
        ioctl(dev->fd, USBDEVFS_DISCARDURB, &dev->urbs[i].urb);
    }

    pthread_join(dev->thread, nullptr);

    int iface = UVC_STREAM_IFACE;
    struct usbdevfs_setinterface si0 = { UVC_STREAM_IFACE, UVC_ALT_ZERO };
    ioctl(dev->fd, USBDEVFS_SETINTERFACE, &si0);
    ioctl(dev->fd, USBDEVFS_RELEASEINTERFACE, &iface);

    env->DeleteGlobalRef(dev->module_obj);
    delete dev;
    LOGI("nativeClose done");
}

// Called from Kotlin: UVCModule.nativeSetFormat(pref: Int)
// 0=auto, 1=UYVY only, 2=Y16 first. Takes effect on the next nativeOpen call.
JNIEXPORT void JNICALL
Java_com_anonymous_vestigia_UVCModule_nativeSetFormat(JNIEnv*, jobject, jint pref) {
    g_format_pref = (int)pref;
    LOGI("Format preference set to %d", g_format_pref);
}

} // extern "C"
