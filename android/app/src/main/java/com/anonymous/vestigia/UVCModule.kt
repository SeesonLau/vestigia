// android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt
// STUB — saki4510t/UVCCamera cannot be built with modern Gradle/NDK.
// All methods resolve successfully but do nothing. The live-feed screen
// will show "Camera Disconnected" until the real AAR is available.
package com.anonymous.vestigia

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class UVCModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "UVCCamera"

    @ReactMethod
    fun connect(promise: Promise) {
        promise.reject("STUB", "UVC camera not available in this build. Add libuvccamera-release.aar to android/app/libs/ to enable.")
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(false)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
