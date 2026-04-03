// android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt
package com.anonymous.vestigia

import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.serenegiant.usb.USBMonitor
import com.serenegiant.usb.USBMonitor.OnDeviceConnectListener
import com.serenegiant.usb.USBMonitor.UsbControlBlock
import com.serenegiant.usb.UVCCamera

class UVCModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "UVCCamera"
        const val VENDOR_ID = 0x1e4e   // PureThermal Mini Pro
        const val PRODUCT_ID = 0x0100
        const val FRAME_WIDTH = 160
        const val FRAME_HEIGHT = 120
    }

    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private var isStreaming = false
    private var connectPromise: Promise? = null

    override fun getName() = NAME

    //Connect
    @ReactMethod
    fun connect(promise: Promise) {
        connectPromise = promise

        try {
            usbMonitor = USBMonitor(reactContext, object : OnDeviceConnectListener {

                override fun onAttach(device: UsbDevice?) {
                    device?.let {
                        if (it.vendorId == VENDOR_ID && it.productId == PRODUCT_ID) {
                            usbMonitor?.requestPermission(it)
                        }
                    }
                }

                override fun onDettach(device: UsbDevice?) {
                    stopCamera()
                    sendEvent("onCameraDisconnected", null)
                }

                override fun onConnect(
                    device: UsbDevice?,
                    ctrlBlock: UsbControlBlock?,
                    createNew: Boolean
                ) {
                    try {
                        uvcCamera = UVCCamera()
                        uvcCamera?.open(ctrlBlock)

                        // Y16 = raw 16-bit radiometric data (2 bytes per pixel = temperature)
                        // Falls back to YUYV if device does not support RAW at this resolution
                        try {
                            uvcCamera?.setPreviewSize(
                                FRAME_WIDTH,
                                FRAME_HEIGHT,
                                UVCCamera.FRAME_FORMAT_RAW
                            )
                        } catch (e: IllegalArgumentException) {
                            // Fallback to YUYV for initial connectivity testing
                            uvcCamera?.setPreviewSize(
                                FRAME_WIDTH,
                                FRAME_HEIGHT,
                                UVCCamera.FRAME_FORMAT_YUYV
                            )
                        }

                        uvcCamera?.setFrameCallback({ frame ->
                            if (frame != null && isStreaming) {
                                val bytes = ByteArray(frame.remaining())
                                frame.get(bytes)
                                // Encode as base64 — decoded in lib/thermal/preprocessing.ts
                                val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
                                sendEvent("onFrame", encoded)
                            }
                        }, UVCCamera.PIXEL_FORMAT_RAW)

                        uvcCamera?.startPreview()
                        isStreaming = true

                        sendEvent("onCameraConnected", null)
                        connectPromise?.resolve(true)
                        connectPromise = null

                    } catch (e: Exception) {
                        connectPromise?.reject("CONNECT_ERROR", e.message)
                        connectPromise = null
                    }
                }

                override fun onDisconnect(device: UsbDevice?, ctrlBlock: UsbControlBlock?) {
                    stopCamera()
                    sendEvent("onCameraDisconnected", null)
                }

                override fun onCancel(device: UsbDevice?) {
                    connectPromise?.reject("PERMISSION_DENIED", "USB permission denied by user")
                    connectPromise = null
                }
            })

            usbMonitor?.register()

            // Check if device is already plugged in
            val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
            val device = usbManager.deviceList.values.find {
                it.vendorId == VENDOR_ID && it.productId == PRODUCT_ID
            }

            if (device != null) {
                usbMonitor?.requestPermission(device)
            } else {
                promise.reject("NO_DEVICE", "PureThermal not found. Plug in the camera via USB-C.")
                connectPromise = null
            }

        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
            connectPromise = null
        }
    }

    //Disconnect
    @ReactMethod
    fun disconnect(promise: Promise) {
        stopCamera()
        promise.resolve(true)
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(isStreaming)
    }

    //Cleanup
    private fun stopCamera() {
        try {
            isStreaming = false
            uvcCamera?.stopPreview()
            uvcCamera?.close()
            uvcCamera?.destroy()
            uvcCamera = null
            usbMonitor?.unregister()
            usbMonitor?.destroy()
            usbMonitor = null
        } catch (_: Exception) {}
    }

    //Events
    private fun sendEvent(eventName: String, data: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    // Required by React Native event emitter — do not remove
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    override fun onCatalystInstanceDestroy() {
        stopCamera()
        super.onCatalystInstanceDestroy()
    }
}
