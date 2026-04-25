// android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt
package com.anonymous.vestigia

import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.serenegiant.usb.IFrameCallback
import com.serenegiant.usb.USBMonitor
import com.serenegiant.usb.UVCCamera

class UVCModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private var connected = false
    private var connectPromise: Promise? = null

    override fun getName() = "UVCCamera"

    //USB device lifecycle
    private val deviceListener = object : USBMonitor.OnDeviceConnectListener {

        override fun onAttach(device: UsbDevice) {
            //Device plugged in — request USB permission
            usbMonitor?.requestPermission(device)
        }

        override fun onConnect(
            device: UsbDevice,
            ctrlBlock: USBMonitor.UsbControlBlock,
            createNew: Boolean
        ) {
            try {
                val camera = UVCCamera()
                camera.open(ctrlBlock)

                //Log all formats the device advertises — visible in adb logcat
                try {
                    val supported = camera.supportedSize
                    android.util.Log.i("UVCModule", "Supported formats: $supported")
                    sendEvent("onCameraFormats", supported)
                } catch (_: Exception) {}

                //Request YUYV (mode=0) — the only safe constant in the AAR's Java API.
                //Falls back to DEFAULT_PREVIEW_MODE if YUYV is rejected.
                var formatAcquired = false
                for (mode in listOf(UVCCamera.FRAME_FORMAT_YUYV, UVCCamera.DEFAULT_PREVIEW_MODE)) {
                    try {
                        camera.setPreviewSize(160, 120, mode)
                        android.util.Log.i("UVCModule", "setPreviewSize succeeded with mode=$mode")
                        formatAcquired = true
                        break
                    } catch (_: Exception) {}
                }
                if (!formatAcquired) throw Exception("No supported preview size found for 160×120")

                //Receive raw bytes — JS validates whether they are Y16 or YUYV
                camera.setFrameCallback(frameCallback, UVCCamera.PIXEL_FORMAT_RAW)
                camera.startPreview()

                uvcCamera = camera
                connected = true
                connectPromise?.resolve(true)
                connectPromise = null
                sendEvent("onCameraConnected", null)
            } catch (e: Exception) {
                connectPromise?.reject("UVC_OPEN_FAILED", e.message ?: "Failed to open UVC camera")
                connectPromise = null
            }
        }

        override fun onDisconnect(device: UsbDevice, ctrlBlock: USBMonitor.UsbControlBlock) {
            handleDisconnect()
        }

        override fun onDettach(device: UsbDevice) {
            handleDisconnect()
        }

        override fun onCancel(device: UsbDevice) {
            connectPromise?.reject("PERMISSION_DENIED", "USB permission denied by user")
            connectPromise = null
        }
    }

    //Frame callback — encode raw bytes as Base64 and emit to JS
    private val frameCallback = IFrameCallback { frame ->
        frame ?: return@IFrameCallback
        val bytes = ByteArray(frame.remaining())
        frame.get(bytes)
        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        sendEvent("onFrame", b64)
    }

    @ReactMethod
    fun connect(promise: Promise) {
        if (connected) {
            promise.resolve(true)
            return
        }
        connectPromise = promise
        val monitor = USBMonitor(reactApplicationContext, deviceListener)
        usbMonitor = monitor
        monitor.register()
        //Auto-request permission for any device already plugged in
        val usbManager = reactApplicationContext.getSystemService(Context.USB_SERVICE) as UsbManager
        usbManager.deviceList.values.forEach { device ->
            monitor.requestPermission(device)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        cleanup()
        promise.resolve(true)
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(connected)
    }

    private fun handleDisconnect() {
        cleanup()
        sendEvent("onCameraDisconnected", null)
    }

    private fun cleanup() {
        try {
            uvcCamera?.stopPreview()
            uvcCamera?.close()
            uvcCamera?.destroy()
        } catch (_: Exception) {}
        uvcCamera = null
        try {
            usbMonitor?.unregister()
            usbMonitor?.destroy()
        } catch (_: Exception) {}
        usbMonitor = null
        connected = false
    }

    private fun sendEvent(name: String, data: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, data)
    }

    @ReactMethod
    fun getSupportedFormats(promise: Promise) {
        try {
            promise.resolve(uvcCamera?.supportedSize ?: "")
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
