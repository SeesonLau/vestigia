// android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt
package com.anonymous.vestigia

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.sqrt

class UVCModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        var nativeLibLoaded = false
            private set
        init {
            try {
                System.loadLibrary("thermal_uvc")
                nativeLibLoaded = true
            } catch (e: UnsatisfiedLinkError) {
                android.util.Log.e("UVCModule", "thermal_uvc load failed: ${e.message}")
            }
        }
        private const val ACTION_USB_PERMISSION = "com.anonymous.vestigia.USB_PERMISSION"
        private const val VID = 0x1e4e
        private const val PID = 0x0100
        private const val FRAME_COLS   = 160
        private const val FRAME_ROWS   = 120
        private const val ROW_BYTES    = FRAME_COLS * 2   // 320 bytes per Y16 row
        private const val FRAME_BUF_MAX = 5
        private const val KELVIN_OFFSET = 27315
        // Upscaled working resolution. The temperature matrix coming off the
        // Lepton at 160x120 is bilinear-upscaled to OUT_COLS x OUT_ROWS
        // (exact 2x per axis = 4x cells) before any artifact is encoded, so
        // every downstream output (display PNG, isolated PNG, unprocessed
        // PNG, full + masked CSV) shares a single high-density source.
        private const val OUT_ROWS = 240
        private const val OUT_COLS = 320
    }

    private external fun nativeOpen(fd: Int): Int
    private external fun nativeClose()
    private external fun nativeSetFormat(pref: Int)

    @Volatile private var connected = false
    private var usbConnection: UsbDeviceConnection? = null
    private var connectPromise: Promise? = null
    private var permReceiver: BroadcastReceiver? = null

    // Rolling frame buffer — last FRAME_BUF_MAX Y16 frames for capture processing
    private val frameBuffer     = ArrayDeque<ByteArray>(FRAME_BUF_MAX)
    private val frameBufferLock = Any()

    // Display pipeline — latest-frame-only queue, display thread, volatile config
    private val displayQueue = LinkedBlockingQueue<ByteArray>(1)
    @Volatile private var displayRunning = false
    @Volatile private var streamPaused  = false
    @Volatile private var displayMode   = "rgb"    // raw | agc | rgb
    @Volatile private var palette       = "medical" // medical | ironbow | rainbow | white_hot
    // displayEnhanced flips the live preview between two regimes:
    //   true  -> 3x3 median + motion-adaptive EMA + CLAHE + palette + bilinear
    //            upscale to OUT_COLS x OUT_ROWS (320x240) + unsharp mask.
    //   false -> raw Y16 -> palette -> JPEG at native 160x120 with no
    //            spatial / temporal filtering.
    // Toggled from JS via setLiveProcessing. Takes effect on the next frame.
    @Volatile private var displayEnhanced = false

    // Temporal EMA state for the live preview pipeline. Holds the last
    // smoothed FloatArray so each new frame blends with the running average,
    // dampening per-frame microbolometer flicker without softening edges
    // (the spatial median already suppresses speckle).
    @Volatile private var prevDisplayFiltered: FloatArray? = null

    // Radiometric correction parameters. Applied to every decoded pixel
    // (live preview AND capture pipeline) so the displayed and captured
    // temperatures reflect the real surface, not the apparent temperature
    // the sensor reports against an idealised black-body.
    //   emissivity    : 0.10 .. 1.00 (skin ≈ 0.98)
    //   reflectedTempC: ambient surroundings, typical clinic ≈ 22 °C
    // When emissivity == 1.0 the correction is a no-op and the raw decoded
    // temperatures pass through unchanged.
    @Volatile private var emissivity     = 0.98f
    @Volatile private var reflectedTempC = 22.0f

    // Frame readiness tracking
    private var prevFrameForDiff: ByteArray? = null
    private var frameIndex = 0

    override fun getName() = "UVCCamera"

    // Called from C++ stream thread — receives a complete 38400-byte Y16 frame
    fun onNativeFrame(bytes: ByteArray) {
        val copy = bytes.copyOf()
        synchronized(frameBufferLock) {
            if (frameBuffer.size >= FRAME_BUF_MAX) frameBuffer.removeFirst()
            frameBuffer.addLast(copy)
        }
        displayQueue.offer(copy)
    }

    @ReactMethod
    fun connect(promise: Promise) {
        if (!nativeLibLoaded) {
            promise.reject("UVC_NO_LIB", "thermal_uvc native library failed to load")
            return
        }
        if (connected) { promise.resolve(true); return }

        val usbManager = reactApplicationContext.getSystemService(Context.USB_SERVICE) as UsbManager
        val device = findPureThermal(usbManager)
        if (device == null) {
            promise.reject("UVC_NO_DEVICE", "PureThermal not found. Plug in the camera and try again.")
            return
        }

        connectPromise = promise
        registerPermissionReceiver(usbManager, device)

        if (usbManager.hasPermission(device)) {
            openDevice(usbManager, device)
        } else {
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                PendingIntent.FLAG_IMMUTABLE else 0
            val pi = PendingIntent.getBroadcast(
                reactApplicationContext, 0,
                Intent(ACTION_USB_PERMISSION), flags
            )
            usbManager.requestPermission(device, pi)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        cleanupAll()
        promise.resolve(true)
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(connected)
    }

    @ReactMethod
    fun getSupportedFormats(promise: Promise) {
        promise.resolve("""[{"formatIndex":2,"format":"Y16","width":160,"height":120,"fps":9}]""")
    }

    @ReactMethod
    fun setFormatPreference(format: String, promise: Promise) {
        val pref = when (format) { "y16" -> 2; "uyvy" -> 1; else -> 0 }
        if (nativeLibLoaded) nativeSetFormat(pref)
        promise.resolve(pref)
    }

    // Switch live display mode — safe to call mid-stream, takes effect on next frame.
    // mode: "raw" = linear full-range grayscale, "agc" = percentile-clipped grayscale, "rgb" = palette
    @ReactMethod
    fun setDisplayMode(mode: String, promise: Promise) {
        displayMode = when (mode) { "raw", "agc", "rgb" -> mode; else -> "rgb" }
        promise.resolve(displayMode)
    }

    // Set active palette for RGB mode — safe to call mid-stream.
    @ReactMethod
    fun setPalette(pal: String, promise: Promise) {
        palette = when (pal) {
            "medical", "ironbow", "rainbow", "white_hot" -> pal
            else -> "medical"
        }
        promise.resolve(palette)
    }

    // Toggle live preview processing mode -- safe to call mid-stream.
    //   true  = Enhanced: median + EMA + CLAHE + bilinear upscale + unsharp.
    //   false = Raw: Y16 -> palette -> JPEG at native 160x120 only.
    @ReactMethod
    fun setLiveProcessing(enhanced: Boolean, promise: Promise) {
        displayEnhanced = enhanced
        // Drop the EMA history when switching modes so the next Enhanced
        // frame doesn't blend with stale Raw-mode data.
        if (!enhanced) prevDisplayFiltered = null
        promise.resolve(displayEnhanced)
    }

    // Set radiometric correction parameters. Safe to call mid-stream.
    // emissivity is clamped to [0.10, 1.00]; reflectedTempC to [-50, 150] °C.
    // Drop the EMA history so the next frame doesn't blend across regimes.
    @ReactMethod
    fun setMeasurementParams(emissivityIn: Double, reflectedTempCIn: Double, promise: Promise) {
        emissivity     = emissivityIn.toFloat().coerceIn(0.10f, 1.00f)
        reflectedTempC = reflectedTempCIn.toFloat().coerceIn(-50f, 150f)
        prevDisplayFiltered = null
        val map = Arguments.createMap()
        map.putDouble("emissivity",     emissivity.toDouble())
        map.putDouble("reflectedTempC", reflectedTempC.toDouble())
        promise.resolve(map)
    }

    // Pause display — no more onDisplayFrame events; Y16 frames still buffered for capture.
    @ReactMethod
    fun pauseCamera(promise: Promise) {
        streamPaused = true
        promise.resolve(true)
    }

    // Resume display after pauseCamera().
    @ReactMethod
    fun resumeCamera(promise: Promise) {
        streamPaused = false
        promise.resolve(true)
    }

    @ReactMethod
    fun processCapture(opts: ReadableMap?, promise: Promise) {
        val frames = synchronized(frameBufferLock) { frameBuffer.toList() }
        if (frames.isEmpty()) {
            promise.reject("NO_FRAMES", "No thermal frames buffered. Ensure the camera is streaming in Y16 mode.")
            return
        }
        //Optional capture-time options:
        //  crop        ROI rect, normalized [0..1] over the sensor matrix
        //  isolatedBg  "transparent" (default) or "black" for the bg fill
        //  enhanced    false (default) -> native 160x120, no enhancement.
        //              true -> bilinear upscale to 320x240 + full processing.
        //  Capture artifacts always follow the 3-slot 'unprocessed' shape:
        //    [1] grayscale unprocessed, [2] palette processed, [3] isolated.
        val cropMap = opts?.takeIf { it.hasKey("crop") && !it.isNull("crop") }?.getMap("crop")
        val crop: CropRoi? = cropMap?.let {
            CropRoi(
                x = it.getDouble("x").toFloat(),
                y = it.getDouble("y").toFloat(),
                w = it.getDouble("w").toFloat(),
                h = it.getDouble("h").toFloat(),
            )
        }
        val isolatedBgBlack = opts?.takeIf { it.hasKey("isolatedBg") }
            ?.getString("isolatedBg") == "black"
        val enhanced = if (opts?.hasKey("enhanced") == true && !opts.isNull("enhanced")) opts.getBoolean("enhanced") else false
        val upscale  = enhanced
        val feedMode = "unprocessed"
        Thread {
            try {
                val result = processThermalFrames(frames, crop, isolatedBgBlack, upscale, feedMode)
                val map = Arguments.createMap()
                map.putString("slot1ImageB64", result.slot1ImageB64)
                if (result.slot2ImageB64 != null) map.putString("slot2ImageB64", result.slot2ImageB64)
                else map.putNull("slot2ImageB64")
                map.putString("slot3ImageB64", result.slot3ImageB64)
                map.putString("feedMode",      result.feedMode)
                map.putString("tiffB64",       result.tiffB64)
                map.putString("csvContent",    result.csvContent)
                map.putString("maskedCsvContent", result.maskedCsvContent)
                map.putInt   ("frameCount",    result.frameCount)
                map.putInt   ("width",         result.width)
                map.putInt   ("height",        result.height)
                map.putDouble("minTemp",       result.minTemp)
                map.putDouble("maxTemp",       result.maxTemp)
                map.putDouble("meanTemp",      result.meanTemp)
                val logs = Arguments.createArray()
                result.log.forEach { logs.pushString(it) }
                map.putArray("log", logs)
                promise.resolve(map)
            } catch (e: Exception) {
                android.util.Log.e("UVCModule", "processCapture failed: ${e.message}", e)
                promise.reject("PROCESS_ERROR", e.message ?: "Thermal processing failed")
            }
        }.start()
    }

    @ReactMethod
    fun savePngToDevice(filename: String, base64Png: String, promise: Promise) {
        Thread {
            try {
                val bytes = Base64.decode(base64Png, Base64.NO_WRAP)
                savePngToMediaStore(bytes, filename)
                promise.resolve(filename)
            } catch (e: Exception) {
                promise.reject("SAVE_ERROR", e.message ?: "Failed to save PNG")
            }
        }.start()
    }

    @ReactMethod
    fun saveCsvToDevice(filename: String, csvContent: String, promise: Promise) {
        Thread {
            try {
                saveCsvToMediaStore(csvContent, filename)
                promise.resolve(filename)
            } catch (e: Exception) {
                promise.reject("SAVE_ERROR", e.message ?: "Failed to save CSV")
            }
        }.start()
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Display loop ──────────────────────────────────────────────────────────

    private fun startDisplayLoop() {
        displayRunning = true
        prevFrameForDiff = null
        prevDisplayFiltered = null
        frameIndex = 0
        Thread {
            while (displayRunning) {
                val frame = displayQueue.poll(500, TimeUnit.MILLISECONDS) ?: continue

                // Compute and emit readiness stats for every frame regardless of pause state
                try { emitFrameStats(frame) } catch (_: Exception) {}

                if (streamPaused) continue
                try {
                    val jpegB64 = y16ToDisplayJpeg(frame)
                    sendEvent("onDisplayFrame", jpegB64)
                } catch (e: Exception) {
                    android.util.Log.w("UVCModule", "Display conversion failed: ${e.message}")
                }
            }
        }.apply { name = "ThermalDisplay"; isDaemon = true }.start()
    }

    private fun emitFrameStats(frame: ByteArray) {
        val rows = frame.size / ROW_BYTES
        val cols = FRAME_COLS
        val n = rows * cols
        val eps     = emissivity
        val correct = eps < 0.999f
        val refl4   = if (correct) computeRefl4() else 0f
        var sum = 0.0; var sumSq = 0.0
        var hotT  = -Float.MAX_VALUE; var hotIdx  = 0
        var coldT =  Float.MAX_VALUE; var coldIdx = 0
        val temps = FloatArray(n)
        for (i in 0 until n) {
            val lo = frame[i * 2].toInt() and 0xFF
            val hi = frame[i * 2 + 1].toInt() and 0xFF
            val apparent = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
            val t = if (correct) emissivityCorrect(apparent, eps, refl4) else apparent
            temps[i] = t; sum += t; sumSq += t * t
            if (t > hotT)  { hotT  = t; hotIdx  = i }
            if (t < coldT) { coldT = t; coldIdx = i }
        }
        val mean     = (sum / n).toFloat()
        val variance = ((sumSq / n) - mean * mean).toFloat().coerceAtLeast(0f)

        val prev = prevFrameForDiff
        val frameDiff = if (prev != null && prev.size == frame.size) {
            var diffSum = 0.0
            for (i in 0 until n) {
                val lo = prev[i * 2].toInt() and 0xFF
                val hi = prev[i * 2 + 1].toInt() and 0xFF
                val t  = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
                diffSum += Math.abs(temps[i] - t)
            }
            (diffSum / n).toFloat()
        } else 0f

        prevFrameForDiff = frame.copyOf()
        val idx = ++frameIndex

        // Normalised crosshair coordinates (0..1) over the sensor matrix so
        // the JS overlay can place markers regardless of preview scale.
        val hotR  = hotIdx  / cols; val hotC  = hotIdx  % cols
        val coldR = coldIdx / cols; val coldC = coldIdx % cols
        val map = Arguments.createMap()
        map.putDouble("variance",   variance.toDouble())
        map.putDouble("frameDiff",  frameDiff.toDouble())
        map.putInt   ("frameIndex", idx)
        map.putDouble("hotX",       hotC.toDouble() / (cols - 1))
        map.putDouble("hotY",       hotR.toDouble() / (rows - 1))
        map.putDouble("hotTemp",    hotT.toDouble())
        map.putDouble("coldX",      coldC.toDouble() / (cols - 1))
        map.putDouble("coldY",      coldR.toDouble() / (rows - 1))
        map.putDouble("coldTemp",   coldT.toDouble())
        map.putDouble("meanTemp",   mean.toDouble())
        sendEvent("onFrameStats", map)
    }

    // Y16 -> JPEG via the current displayMode and palette. Two regimes
    // controlled by the displayEnhanced flag:
    //   Raw      : Y16 -> palette -> JPEG at native 160x120. No spatial /
    //              temporal filtering. Cheapest path; matches what the
    //              sensor actually sees.
    //   Enhanced : Y16 -> 3x3 median -> motion-adaptive EMA -> CLAHE ->
    //              palette -> bilinear upscale to OUT_COLS x OUT_ROWS ->
    //              unsharp mask -> JPEG.
    private fun y16ToDisplayJpeg(frame: ByteArray): String {
        val rows = frame.size / ROW_BYTES
        val cols = FRAME_COLS

        val eps     = emissivity
        val correct = eps < 0.999f
        val refl4   = if (correct) computeRefl4() else 0f
        val temps = FloatArray(rows * cols)
        for (i in 0 until rows * cols) {
            val lo = frame[i * 2].toInt() and 0xFF
            val hi = frame[i * 2 + 1].toInt() and 0xFF
            val apparent = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
            temps[i] = if (correct) emissivityCorrect(apparent, eps, refl4) else apparent
        }

        val pixels = IntArray(rows * cols)
        if (!displayEnhanced) {
            // ── Raw path ─────────────────────────────────────────────────
            // Single global percentile clip + palette, no spatial / temporal
            // filtering, no upscale. Snappy switch with zero hysteresis.
            val sorted = temps.copyOf().also { it.sort() }
            val p1     = sorted[(sorted.size * 0.01f).toInt()]
            val p99    = sorted[(sorted.size * 0.99f).toInt()]
            val range  = (p99 - p1).takeIf { it > 0f } ?: 1f
            when (displayMode) {
                "raw" -> {
                    val minT = sorted[0]
                    val rawRange = (sorted[sorted.size - 1] - minT).takeIf { it > 0f } ?: 1f
                    for (i in 0 until rows * cols) {
                        val v = (((temps[i] - minT) / rawRange).coerceIn(0f, 1f) * 255).toInt()
                        pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                    }
                }
                "agc" -> for (i in 0 until rows * cols) {
                    val v = (((temps[i] - p1) / range).coerceIn(0f, 1f) * 255).toInt()
                    pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                }
                else -> for (i in 0 until rows * cols) {
                    val t = ((temps[i] - p1) / range).coerceIn(0f, 1f)
                    val (r, g, b) = paletteRgb(t, palette)
                    pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                }
            }
            val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
            bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, 90, out)
            bmp.recycle()
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }

        // ── Enhanced path ────────────────────────────────────────────────
        // 3x3 median filter -- removes salt-and-pepper microbolometer noise.
        val median = FloatArray(rows * cols)
        val medBuf = FloatArray(9)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                var k = 0
                for (dr in -1..1) for (dc in -1..1) {
                    medBuf[k++] = temps[(r + dr).coerceIn(0, rows - 1) * cols + (c + dc).coerceIn(0, cols - 1)]
                }
                medBuf.sort()
                median[r * cols + c] = medBuf[4]
            }
        }

        // Motion-adaptive temporal EMA -- per-pixel alpha based on inter-frame
        // delta. Stationary pixels get heavy smoothing, moving pixels bypass
        // blending entirely. Tuned around Lepton 3.5 NETD (~50 mK).
        val motionLow  = 0.15f
        val motionHigh = 0.80f
        val alphaStill  = 0.20f
        val alphaMotion = 1.00f
        val prev = prevDisplayFiltered
        val filtered = if (prev != null && prev.size == median.size) {
            FloatArray(median.size) { i ->
                val delta = abs(median[i] - prev[i])
                val a = when {
                    delta <= motionLow  -> alphaStill
                    delta >= motionHigh -> alphaMotion
                    else -> {
                        val t = (delta - motionLow) / (motionHigh - motionLow)
                        alphaStill + t * (alphaMotion - alphaStill)
                    }
                }
                a * median[i] + (1f - a) * prev[i]
            }
        } else median.copyOf()
        prevDisplayFiltered = filtered

        when (displayMode) {
            "raw" -> {
                var minT = filtered[0]
                var maxT = filtered[0]
                for (v in filtered) {
                    if (v < minT) minT = v
                    if (v > maxT) maxT = v
                }
                val rawRange = (maxT - minT).takeIf { it > 0f } ?: 1f
                for (i in 0 until rows * cols) {
                    val v = (((filtered[i] - minT) / rawRange).coerceIn(0f, 1f) * 255).toInt()
                    pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                }
            }
            else -> {
                val normalised = claheNormalise(filtered, rows, cols)
                if (displayMode == "agc") {
                    for (i in 0 until rows * cols) {
                        val v = (normalised[i].coerceIn(0f, 1f) * 255).toInt()
                        pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                    }
                } else {
                    for (i in 0 until rows * cols) {
                        val (r, g, b) = paletteRgb(normalised[i].coerceIn(0f, 1f), palette)
                        pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                    }
                }
            }
        }

        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)

        // Bilinear upscale to OUT_COLS x OUT_ROWS, then unsharp mask to
        // recover edges softened by the upscale.
        val target = if (cols != OUT_COLS || rows != OUT_ROWS) {
            Bitmap.createScaledBitmap(bmp, OUT_COLS, OUT_ROWS, true).also { bmp.recycle() }
        } else bmp
        val w = target.width
        val h = target.height
        val targetPixels = IntArray(w * h)
        target.getPixels(targetPixels, 0, w, 0, 0, w, h)
        unsharpMaskInPlace(targetPixels, w, h, 0.6f)
        target.setPixels(targetPixels, 0, w, 0, 0, w, h)

        val out = ByteArrayOutputStream()
        target.compress(Bitmap.CompressFormat.JPEG, 95, out)
        target.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    // CLAHE -- Contrast-Limited Adaptive Histogram Equalisation. Splits the
    // matrix into an 8x8 grid; per tile, builds a histogram, clips bin peaks
    // (clipLimit x average), redistributes the excess uniformly, and converts
    // to a normalised CDF lookup. Per-pixel output is bilinear interpolation
    // between the four neighbouring tile LUTs to avoid tile-boundary seams.
    // Replaces the global p1/p99 stretch -- gives much higher local contrast,
    // especially for cool feet against a slightly cooler background.
    private fun claheNormalise(
        src: FloatArray,
        rows: Int,
        cols: Int,
        tilesX: Int = 8,
        tilesY: Int = 8,
        bins: Int = 256,
        clipLimit: Float = 3.0f,
    ): FloatArray {
        var tMin = src[0]
        var tMax = src[0]
        for (v in src) {
            if (v < tMin) tMin = v
            if (v > tMax) tMax = v
        }
        val span = (tMax - tMin).takeIf { it > 0.01f } ?: 0.01f
        val binScale = (bins - 1) / span

        // Tile boundaries (integer pixel indices) and per-tile LUTs (0..1).
        val rowEdges = IntArray(tilesY + 1) { (it * rows / tilesY) }
        val colEdges = IntArray(tilesX + 1) { (it * cols / tilesX) }
        val luts = Array(tilesY) { Array(tilesX) { FloatArray(bins) } }
        val hist = FloatArray(bins)

        for (ty in 0 until tilesY) {
            val rStart = rowEdges[ty]
            val rEnd   = rowEdges[ty + 1]
            for (tx in 0 until tilesX) {
                val cStart = colEdges[tx]
                val cEnd   = colEdges[tx + 1]

                hist.fill(0f)
                var pixCount = 0
                for (r in rStart until rEnd) {
                    val rowOff = r * cols
                    for (c in cStart until cEnd) {
                        val bin = ((src[rowOff + c] - tMin) * binScale).toInt().coerceIn(0, bins - 1)
                        hist[bin] += 1f
                        pixCount++
                    }
                }

                if (pixCount == 0) continue
                val avg = pixCount.toFloat() / bins
                val clipThresh = clipLimit * avg
                var excess = 0f
                for (k in 0 until bins) {
                    if (hist[k] > clipThresh) {
                        excess += hist[k] - clipThresh
                        hist[k] = clipThresh
                    }
                }
                val redistribute = excess / bins
                val lut = luts[ty][tx]
                var cum = 0f
                val total = pixCount.toFloat()
                for (k in 0 until bins) {
                    cum += hist[k] + redistribute
                    lut[k] = (cum / total).coerceIn(0f, 1f)
                }
            }
        }

        // Per-pixel bilinear blend across the four nearest tile LUTs.
        val tileWf = cols.toFloat() / tilesX
        val tileHf = rows.toFloat() / tilesY
        val out = FloatArray(rows * cols)
        for (r in 0 until rows) {
            val fy = (r + 0.5f) / tileHf - 0.5f
            val fyFloor = floor(fy).toInt()
            val ty0 = fyFloor.coerceIn(0, tilesY - 1)
            val ty1 = (fyFloor + 1).coerceIn(0, tilesY - 1)
            val wy = if (ty1 == ty0) 0f else (fy - fyFloor).coerceIn(0f, 1f)
            val rowOff = r * cols

            for (c in 0 until cols) {
                val fx = (c + 0.5f) / tileWf - 0.5f
                val fxFloor = floor(fx).toInt()
                val tx0 = fxFloor.coerceIn(0, tilesX - 1)
                val tx1 = (fxFloor + 1).coerceIn(0, tilesX - 1)
                val wx = if (tx1 == tx0) 0f else (fx - fxFloor).coerceIn(0f, 1f)

                val bin = ((src[rowOff + c] - tMin) * binScale).toInt().coerceIn(0, bins - 1)
                val v00 = luts[ty0][tx0][bin]
                val v10 = luts[ty0][tx1][bin]
                val v01 = luts[ty1][tx0][bin]
                val v11 = luts[ty1][tx1][bin]
                val top = v00 * (1f - wx) + v10 * wx
                val bot = v01 * (1f - wx) + v11 * wx
                out[rowOff + c] = top * (1f - wy) + bot * wy
            }
        }
        return out
    }

    // Radiometric correction -- map an apparent temperature (what the sensor
    // reports against an idealised black-body) to the real surface
    // temperature given emissivity eps and reflected ambient temperature
    // (precomputed as reflectedTempK^4 = refl4). Uses the standard
    // black-body radiative form:
    //     T_corrected^4 = (T_apparent^4 - (1 - eps) * T_reflected^4) / eps
    // sqrt(sqrt(x)) is ~5x faster than pow(x, 0.25) on Android. Caller
    // skips the call entirely when eps == 1.0 (no correction needed).
    private fun emissivityCorrect(tApparentC: Float, eps: Float, refl4: Float): Float {
        val tApparentK = tApparentC + 273.15f
        val ta4        = tApparentK * tApparentK * tApparentK * tApparentK
        val corrected4 = ((ta4 - (1f - eps) * refl4) / eps).coerceAtLeast(1f)
        val correctedK = sqrt(sqrt(corrected4))
        return correctedK - 273.15f
    }

    // Compute reflectedTempK^4 once per frame so per-pixel corrections only
    // pay one multiply + one subtract + one divide + two sqrt calls.
    private fun computeRefl4(): Float {
        val rk = reflectedTempC + 273.15f
        return rk * rk * rk * rk
    }

    // Unsharp mask -- pixel = pixel + amount * (pixel - blurred). 3x3 box blur
    // per channel gives a 1-pixel sharpening radius, which matches the level
    // of softening introduced by bilinear upscaling. amount = 0.6 punches up
    // edges noticeably without producing halos around hot regions.
    private fun unsharpMaskInPlace(pixels: IntArray, w: Int, h: Int, amount: Float) {
        val n = w * h
        val rA = IntArray(n)
        val gA = IntArray(n)
        val bA = IntArray(n)
        for (i in 0 until n) {
            val p = pixels[i]
            rA[i] = (p shr 16) and 0xFF
            gA[i] = (p shr 8)  and 0xFF
            bA[i] =  p         and 0xFF
        }
        val rB = boxBlur3x3(rA, w, h)
        val gB = boxBlur3x3(gA, w, h)
        val bB = boxBlur3x3(bA, w, h)
        for (i in 0 until n) {
            val r = (rA[i] + amount * (rA[i] - rB[i])).toInt().coerceIn(0, 255)
            val g = (gA[i] + amount * (gA[i] - gB[i])).toInt().coerceIn(0, 255)
            val b = (bA[i] + amount * (bA[i] - bB[i])).toInt().coerceIn(0, 255)
            pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
    }

    private fun boxBlur3x3(src: IntArray, w: Int, h: Int): IntArray {
        val out = IntArray(w * h)
        for (y in 0 until h) {
            val y0 = (y - 1).coerceAtLeast(0)
            val y2 = (y + 1).coerceAtMost(h - 1)
            for (x in 0 until w) {
                val x0 = (x - 1).coerceAtLeast(0)
                val x2 = (x + 1).coerceAtMost(w - 1)
                val sum =
                    src[y0 * w + x0] + src[y0 * w + x] + src[y0 * w + x2] +
                    src[y  * w + x0] + src[y  * w + x] + src[y  * w + x2] +
                    src[y2 * w + x0] + src[y2 * w + x] + src[y2 * w + x2]
                out[y * w + x] = sum / 9
            }
        }
        return out
    }

    // ── Color palettes ────────────────────────────────────────────────────────

    private fun paletteRgb(t: Float, pal: String): Triple<Int, Int, Int> = when (pal) {
        "ironbow"   -> ironbowRgb(t)
        "rainbow"   -> rainbowRgb(t)
        "white_hot" -> whiteHotRgb(t)
        else        -> medicalRgb(t)  // default + the renamed rainbow3 LUT
    }

    // Ironbow — heated metal: black→purple→red→orange→yellow→white
    private fun ironbowRgb(t: Float): Triple<Int, Int, Int> {
        val n = t.coerceIn(0f, 1f)
        return when {
            n < 0.20f -> { val f = n / 0.20f;            Triple((80*f).toInt(),       0,               (120*f).toInt())      }
            n < 0.45f -> { val f = (n-0.20f)/0.25f;      Triple((80+120*f).toInt(),   0,               (120-60*f).toInt())   }
            n < 0.65f -> { val f = (n-0.45f)/0.20f;      Triple((200+55*f).toInt(),   (100*f).toInt(), (60-60*f).toInt())    }
            n < 0.85f -> { val f = (n-0.65f)/0.20f;      Triple(255,                  (100+120*f).toInt(), 0)                }
            else      -> { val f = (n-0.85f)/0.15f;      Triple(255,                  (220+35*f).toInt(), (200*f).toInt())   }
        }
    }

    // Rainbow — blue→cyan→green→yellow→red
    private fun rainbowRgb(t: Float): Triple<Int, Int, Int> {
        val n = t.coerceIn(0f, 1f)
        return when {
            n < 0.25f -> { val f = n/0.25f;              Triple(0,                    (255*f).toInt(),    255)                }
            n < 0.50f -> { val f = (n-0.25f)/0.25f;      Triple(0,                    255,                (255*(1-f)).toInt())}
            n < 0.75f -> { val f = (n-0.50f)/0.25f;      Triple((255*f).toInt(),      255,                0)                 }
            else      -> { val f = (n-0.75f)/0.25f;      Triple(255,                  (255*(1-f)).toInt(),0)                 }
        }
    }

    // Medical — clinical 8-step LUT (renamed from "rainbow3").
    // Purple → Blue → Cyan → Green → Yellow → Orange → Red → White.
    private fun medicalRgb(t: Float): Triple<Int, Int, Int> {
        val n = t.coerceIn(0f, 1f)
        val stops = arrayOf(
            intArrayOf(149,   0, 181),  // 0.000 — purple (coldest)
            intArrayOf(  0,   0, 255),  // 0.143 — blue
            intArrayOf(  0, 255, 255),  // 0.286 — cyan
            intArrayOf(  0, 255,   0),  // 0.429 — green
            intArrayOf(255, 255,   0),  // 0.571 — yellow
            intArrayOf(255, 165,   0),  // 0.714 — orange
            intArrayOf(255,   0,   0),  // 0.857 — red
            intArrayOf(255, 255, 255),  // 1.000 — white (hottest)
        )
        val seg = (stops.size - 1).toFloat()
        val pos = n * seg
        val idx = pos.toInt().coerceAtMost(stops.size - 2)
        val f   = pos - idx
        val a = stops[idx]
        val b = stops[idx + 1]
        val r = (a[0] + (b[0] - a[0]) * f).toInt().coerceIn(0, 255)
        val g = (a[1] + (b[1] - a[1]) * f).toInt().coerceIn(0, 255)
        val bl = (a[2] + (b[2] - a[2]) * f).toInt().coerceIn(0, 255)
        return Triple(r, g, bl)
    }

    // White Hot — linear grayscale, white = warmest
    private fun whiteHotRgb(t: Float): Triple<Int, Int, Int> {
        val v = (t.coerceIn(0f, 1f) * 255).toInt()
        return Triple(v, v, v)
    }

    // ── Capture processing ────────────────────────────────────────────────────

    // Bundle artifacts as a 3-slot pipeline. Slot content depends on feedMode:
    //   'unprocessed': [1] grayscale unprocessed, [2] palette processed, [3] isolated
    //   'processed':   [1] palette processed full-frame, [2] palette processed
    //                  cropped to ROI (null when no ROI), [3] isolated
    // All slots that *do* exist are cropped to the framing rect when one is
    // supplied -- except slot [1] in 'processed' mode, which is always full.
    private data class ThermalResult(
        val slot1ImageB64:    String,
        val slot2ImageB64:    String?,
        val slot3ImageB64:    String,
        val feedMode:         String,
        val tiffB64:          String,
        val csvContent:       String,
        val maskedCsvContent: String,
        val frameCount:       Int,
        val width:            Int,
        val height:           Int,
        val minTemp:          Double,
        val maxTemp:          Double,
        val meanTemp:         Double,
        val log:              List<String>,
    )

    /** Foot-frame region of interest from the live UI, normalized [0..1]. */
    private data class CropRoi(val x: Float, val y: Float, val w: Float, val h: Float)

    /** Crop a bitmap by a normalized ROI, with safety clamping. */
    private fun cropBitmapByRoi(src: Bitmap, roi: CropRoi): Bitmap {
        val srcW = src.width
        val srcH = src.height
        val x = (roi.x * srcW).toInt().coerceIn(0, srcW - 1)
        val y = (roi.y * srcH).toInt().coerceIn(0, srcH - 1)
        val w = (roi.w * srcW).toInt().coerceAtLeast(1).coerceAtMost(srcW - x)
        val h = (roi.h * srcH).toInt().coerceAtLeast(1).coerceAtMost(srcH - y)
        return Bitmap.createBitmap(src, x, y, w, h)
    }

    private fun processThermalFrames(
        frames: List<ByteArray>,
        crop: CropRoi? = null,
        isolatedBgBlack: Boolean = false,
        upscale: Boolean = true,
        feedMode: String = "unprocessed",
    ): ThermalResult {
        val log = mutableListOf<String>()
        log.add("Received ${frames.size} frame(s)")

        val refLen = frames[0].size
        if (refLen < ROW_BYTES || refLen % ROW_BYTES != 0)
            throw Exception("Invalid frame size: ${refLen}B (not a multiple of $ROW_BYTES)")

        val valid = frames.filter { it.size == refLen }
        log.add("Valid: ${valid.size}/${frames.size}  →  ${refLen / ROW_BYTES}×$FRAME_COLS")

        val rows = refLen / ROW_BYTES
        val cols = FRAME_COLS
        val n    = valid.size

        // Temporal averaging
        val sumBuf = LongArray(rows * cols)
        for (frame in valid) {
            for (i in 0 until rows * cols) {
                val lo = frame[i * 2].toInt() and 0xFF
                val hi = frame[i * 2 + 1].toInt() and 0xFF
                sumBuf[i] += (hi shl 8) or lo
            }
        }
        val rawAvg = IntArray(rows * cols) { i -> (sumBuf[i] / n).toInt() }
        log.add("Temporal average: $n frame(s)")

        // Decode averaged Y16 -> apparent °C, then apply emissivity /
        // reflected-temp correction so captured artifacts and CSVs reflect
        // the real surface temperature, not the sensor's black-body reading.
        val eps     = emissivity
        val correct = eps < 0.999f
        val refl4   = if (correct) computeRefl4() else 0f
        val tempFlat = FloatArray(rows * cols) { i ->
            val apparent = (rawAvg[i] - KELVIN_OFFSET) / 100f
            if (correct) emissivityCorrect(apparent, eps, refl4) else apparent
        }
        if (correct) log.add("Emissivity correction applied (ε=%.2f, T_refl=%.1f°C)".format(eps, reflectedTempC))

        val inRange = tempFlat.count { it in -50f..150f }
        if (inRange < tempFlat.size / 2)
            throw Exception("Frame data does not look like Y16 radiometric. Switch camera to Y16 mode.")

        // 3×3 median filter at native sensor resolution.
        val filteredNative = FloatArray(rows * cols)
        val buf            = FloatArray(9)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                var k = 0
                for (dr in -1..1) for (dc in -1..1) {
                    buf[k++] = tempFlat[(r+dr).coerceIn(0, rows-1) * cols + (c+dc).coerceIn(0, cols-1)]
                }
                buf.sort()
                filteredNative[r * cols + c] = buf[4]
            }
        }
        log.add("Median 3×3 filter applied")

        // 16-bit TIFF — radiometric raw at NATIVE sensor resolution.
        val tiffBytes = encodeTiff16(rawAvg, cols, rows)
        val tiffB64   = Base64.encodeToString(tiffBytes, Base64.NO_WRAP)
        log.add("TIFF encoded (${tiffBytes.size} bytes, ${rows}×${cols} native)")

        // Optional bilinear upscale of the temperature matrix from native
        // (120×160) to OUT_ROWS×OUT_COLS (240×320). When upscale is false
        // every artifact below is encoded at native sensor resolution.
        val filtered: FloatArray
        val rowsW: Int
        val colsW: Int
        if (upscale) {
            filtered = upscaleBilinear(filteredNative, rows, cols, OUT_ROWS, OUT_COLS)
            rowsW = OUT_ROWS
            colsW = OUT_COLS
            log.add("Upscaled $rows×$cols → $rowsW×$colsW (bilinear)")
        } else {
            filtered = filteredNative
            rowsW = rows
            colsW = cols
            log.add("Native scale retained ($rowsW×$colsW)")
        }

        // Temperature stats from the working matrix.
        var minT = Float.MAX_VALUE; var maxT = -Float.MAX_VALUE; var sumT = 0.0
        for (v in filtered) { if (v < minT) minT = v; if (v > maxT) maxT = v; sumT += v }
        val meanT = sumT / filtered.size
        log.add("Stats: min=%.2f°C max=%.2f°C mean=%.2f°C".format(minT, maxT, meanT))

        // CSV (°C, 2 dp) — full working-resolution matrix.
        val csvSB = StringBuilder(rowsW * colsW * 8)
        for (r in 0 until rowsW) {
            for (c in 0 until colsW) {
                if (c > 0) csvSB.append(',')
                csvSB.append("%.2f".format(filtered[r * colsW + c]))
            }
            csvSB.append('\n')
        }

        // Percentile statistics for display + unprocessed PNGs.
        val sorted  = filtered.copyOf().also { it.sort() }
        val p1      = sorted[(sorted.size * 0.01f).toInt()]
        val p99     = sorted[(sorted.size * 0.99f).toInt()]
        val range   = (p99 - p1).takeIf { it > 0f } ?: 1f
        val minVal  = sorted[0]
        val rawRange = (sorted[sorted.size - 1] - minVal).takeIf { it > 0f } ?: 1f

        // Foot isolation — always cropped to ROI when supplied. Slot [3].
        val mask           = isolateFootMask(filtered, rowsW, colsW, crop)
        val slot3ImageB64  = buildIsolatedPng(filtered, mask, rowsW, colsW, p1, range, crop, isolatedBgBlack)
        val maskedCsv      = buildMaskedCsv(filtered, mask, rowsW, colsW)
        log.add("Foot isolation complete" + (if (crop != null) " · cropped to ROI" else "")
            + (if (isolatedBgBlack) " · black bg" else ""))

        // Slots [1] and [2] depend on feedMode.
        val slot1ImageB64: String
        val slot2ImageB64: String?
        if (feedMode == "processed") {
            // [1] palette processed FULL FRAME (no crop, even if ROI is set)
            slot1ImageB64 = buildProcessedPng(filtered, rowsW, colsW, p1, range, minVal, rawRange, crop = null)
            log.add("Slot1 processed PNG encoded · full frame (mode=$displayMode palette=$palette)")
            // [2] same processed image cropped to ROI; null if no ROI
            slot2ImageB64 = if (crop != null) {
                val s = buildProcessedPng(filtered, rowsW, colsW, p1, range, minVal, rawRange, crop)
                log.add("Slot2 processed PNG encoded · cropped to ROI")
                s
            } else {
                log.add("Slot2 skipped (no ROI in processed feed mode)")
                null
            }
        } else {
            // 'unprocessed' (default): legacy 3-artifact pipeline. All slots
            // cropped to ROI when one is set.
            slot1ImageB64 = buildUnprocessedPng(filtered, rowsW, colsW, minVal, rawRange, crop)
            log.add("Slot1 unprocessed PNG encoded" + (if (crop != null) " · cropped to ROI" else ""))
            slot2ImageB64 = buildProcessedPng(filtered, rowsW, colsW, p1, range, minVal, rawRange, crop)
            log.add("Slot2 processed PNG encoded (mode=$displayMode palette=$palette)" + (if (crop != null) " · cropped to ROI" else ""))
        }

        log.add("Processing complete · feedMode=$feedMode")

        return ThermalResult(
            slot1ImageB64    = slot1ImageB64,
            slot2ImageB64    = slot2ImageB64,
            slot3ImageB64    = slot3ImageB64,
            feedMode         = feedMode,
            tiffB64          = tiffB64,
            csvContent       = csvSB.toString(),
            maskedCsvContent = maskedCsv,
            frameCount       = n,
            width            = colsW,
            height           = rowsW,
            minTemp          = minT.toDouble(),
            maxTemp          = maxT.toDouble(),
            meanTemp         = meanT,
            log              = log,
        )
    }

    // Build a palette-mapped PNG honouring the current displayMode. Mirrors
    // the previous inline display-PNG logic; factored out so processThermal
    // Frames can call it twice in 'processed' feed mode (once full-frame for
    // slot 1, once cropped for slot 2).
    private fun buildProcessedPng(
        filtered: FloatArray, rows: Int, cols: Int,
        p1: Float, range: Float,
        minVal: Float, rawRange: Float,
        crop: CropRoi?,
    ): String {
        val pixels = IntArray(rows * cols)
        when (displayMode) {
            "raw" -> for (i in 0 until rows * cols) {
                val v = (((filtered[i] - minVal) / rawRange).coerceIn(0f, 1f) * 255).toInt()
                pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
            }
            "agc" -> for (i in 0 until rows * cols) {
                val v = (((filtered[i] - p1) / range).coerceIn(0f, 1f) * 255).toInt()
                pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
            }
            else -> for (i in 0 until rows * cols) {
                val t = ((filtered[i] - p1) / range).coerceIn(0f, 1f)
                val (ri, gi, bi) = paletteRgb(t, palette)
                pixels[i] = (0xFF shl 24) or (ri shl 16) or (gi shl 8) or bi
            }
        }
        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
        val outBmp = if (crop != null) cropBitmapByRoi(bmp, crop).also { bmp.recycle() } else bmp
        val out = ByteArrayOutputStream()
        outBmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        outBmp.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    // ── Bilinear upscale for FloatArray temperature matrices ──────────────────
    /**
     * Upscale a row-major float matrix using bilinear interpolation.
     * Source: srcRows × srcCols. Destination: dstRows × dstCols.
     * For OUT 240×320 from src 120×160 the per-axis scale is exactly 2×,
     * so each destination cell maps to a source coordinate halfway between
     * two integer source rows / cols — bilinear yields true averages there.
     */
    private fun upscaleBilinear(
        src: FloatArray, srcRows: Int, srcCols: Int,
        dstRows: Int, dstCols: Int,
    ): FloatArray {
        if (srcRows == dstRows && srcCols == dstCols) return src.copyOf()
        val dst = FloatArray(dstRows * dstCols)
        val rowScale = if (dstRows > 1) (srcRows - 1).toFloat() / (dstRows - 1) else 0f
        val colScale = if (dstCols > 1) (srcCols - 1).toFloat() / (dstCols - 1) else 0f
        for (or in 0 until dstRows) {
            val ir = or * rowScale
            val r0 = ir.toInt().coerceIn(0, srcRows - 1)
            val r1 = (r0 + 1).coerceAtMost(srcRows - 1)
            val fr = ir - r0
            val r0Off = r0 * srcCols
            val r1Off = r1 * srcCols
            val outRowOff = or * dstCols
            for (oc in 0 until dstCols) {
                val ic = oc * colScale
                val c0 = ic.toInt().coerceIn(0, srcCols - 1)
                val c1 = (c0 + 1).coerceAtMost(srcCols - 1)
                val fc = ic - c0
                val v00 = src[r0Off + c0]
                val v01 = src[r0Off + c1]
                val v10 = src[r1Off + c0]
                val v11 = src[r1Off + c1]
                val vL = v00 + (v01 - v00) * fc
                val vH = v10 + (v11 - v10) * fc
                dst[outRowOff + oc] = vL + (vH - vL) * fr
            }
        }
        return dst
    }

    // ── Unprocessed PNG (grayscale, no palette, no isolation) ─────────────────
    /**
     * Encode a grayscale PNG from the (already-upscaled) filtered float
     * matrix using the same min/range normalisation as the "raw" display
     * mode. Produces the bundle's "unprocessed" artifact — what the sensor
     * sees, with zero interpretive layers applied.
     */
    private fun buildUnprocessedPng(
        filtered: FloatArray, rows: Int, cols: Int,
        minVal: Float, range: Float,
        crop: CropRoi?,
    ): String {
        val pixels = IntArray(rows * cols)
        for (i in 0 until rows * cols) {
            val v = (((filtered[i] - minVal) / range).coerceIn(0f, 1f) * 255).toInt()
            pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }
        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
        val outBmp = if (crop != null) cropBitmapByRoi(bmp, crop).also { bmp.recycle() } else bmp
        val out = ByteArrayOutputStream()
        outBmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        outBmp.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    // ── Foot isolation ────────────────────────────────────────────────────────

    /**
     * Build a subject mask from the filtered thermal frame.
     *
     * When the user has a framing rectangle on the live feed (crop != null),
     * we use it as ground truth: pixels OUTSIDE the rectangle are guaranteed
     * background (the user said so by drawing the box around the subject), so
     * we sample the background reference from there and threshold absolute
     * deviation INSIDE the rectangle. This is direction-agnostic — it works
     * whether the subject is hotter or colder than its surroundings, fixing
     * the previous "warmer = subject" assumption that erased cold subjects
     * like an aircon against a warmer wall.
     *
     * When no rectangle is provided (crop == null), we fall back to the
     * Otsu / largest-component approach as before.
     */
    private fun isolateFootMask(
        filtered: FloatArray, rows: Int, cols: Int, crop: CropRoi? = null,
    ): BooleanArray {
        if (crop != null) return isolateByRoiBackground(filtered, rows, cols, crop)

        val (threshold, bestVar) = otsuThresholdWithVariance(filtered)

        // Guardrail kept very loose — only catches truly uniform frames; even mild bimodality passes.
        if (bestVar < 1.0) return BooleanArray(rows * cols) { false }

        val hotRaw  = BooleanArray(rows * cols) { filtered[it] >= threshold }
        val coldRaw = BooleanArray(rows * cols) { !hotRaw[it] }

        // Close BOTH masks independently — closing only the hot mask would erase a cold subject
        // (it appears as a "hole" in the hot region); closing each separately fills internal holes
        // in whichever class is the subject without destroying the other.
        val closedHot  = morphClose(hotRaw,  rows, cols, 5, 5)
        val closedCold = morphClose(coldRaw, rows, cols, 5, 5)

        // BFS on both classes — largest component + border pixel count + size
        val (hotMask,  hotBorder,  hotSize)  = largestComponentWithBorderCount(closedHot,  rows, cols)
        val (coldMask, coldBorder, coldSize) = largestComponentWithBorderCount(closedCold, rows, cols)

        // Border-to-area ratio: background hugs the perimeter (high ratio), subject is compact (low).
        // More robust than raw border count when the subject touches one edge of the frame.
        val hotRatio  = if (hotSize  > 0) hotBorder.toDouble()  / hotSize  else Double.MAX_VALUE
        val coldRatio = if (coldSize > 0) coldBorder.toDouble() / coldSize else Double.MAX_VALUE

        val subjectMask = if (hotRatio <= coldRatio) hotMask else coldMask

        // Opening (erode 2 → dilate 2) — trims ragged boundary fringe pixels
        return morphDilate(morphErode(subjectMask, rows, cols, 2), rows, cols, 2)
    }

    /**
     * ROI-aware isolation. Samples the background reference temperature
     * from pixels OUTSIDE the user's framing rectangle (which the user
     * has guaranteed as background by drawing the box around the subject)
     * and marks INSIDE pixels as subject if their |T − T_bg| exceeds a
     * threshold computed from the background's median absolute deviation.
     *
     * Pixels outside the rectangle are always background regardless of
     * temperature. Pixels inside but near the background reading are
     * also background (e.g. the empty space surrounding a centred foot).
     */
    private fun isolateByRoiBackground(
        filtered: FloatArray, rows: Int, cols: Int, roi: CropRoi,
    ): BooleanArray {
        // ROI bounds in pixel coords.
        val x0 = (roi.x * cols).toInt().coerceIn(0, cols - 1)
        val y0 = (roi.y * rows).toInt().coerceIn(0, rows - 1)
        val x1 = ((roi.x + roi.w) * cols).toInt().coerceIn(x0 + 1, cols)
        val y1 = ((roi.y + roi.h) * rows).toInt().coerceIn(y0 + 1, rows)

        // Collect background samples from pixels outside the ROI rectangle.
        val outside = ArrayList<Float>(rows * cols - (y1 - y0) * (x1 - x0))
        for (r in 0 until rows) {
            val rowOff = r * cols
            val inRowBand = r in y0 until y1
            for (c in 0 until cols) {
                if (inRowBand && c in x0 until x1) continue
                outside.add(filtered[rowOff + c])
            }
        }
        // Pathological case: ROI fills the whole frame -- no background to learn from.
        // Fall back to the Otsu path, which still helps in most setups.
        if (outside.size < 32) return isolateFootMask(filtered, rows, cols, crop = null)

        // Robust statistics: median (centre) + MAD (spread) of the background.
        val bgArr = outside.toFloatArray().also { java.util.Arrays.sort(it) }
        val bgMedian = bgArr[bgArr.size / 2]

        val absDevs = FloatArray(bgArr.size) { Math.abs(bgArr[it] - bgMedian) }
        java.util.Arrays.sort(absDevs)
        val mad = absDevs[absDevs.size / 2]

        // Threshold: 3·σ_bg (where σ ≈ 1.4826·MAD), with a floor of 1.0°C so
        // a rock-steady background with σ near zero doesn't flag every speckle.
        val sigma     = 1.4826f * mad
        val threshold = maxOf(1.0f, 3.0f * sigma)

        val mask = BooleanArray(rows * cols)
        for (r in y0 until y1) {
            val rowOff = r * cols
            for (c in x0 until x1) {
                val i = rowOff + c
                if (Math.abs(filtered[i] - bgMedian) > threshold) mask[i] = true
            }
        }

        // Same morphology as the legacy path: close (dilate→erode) to fill
        // small interior holes, then open (erode→dilate) to trim fringes.
        // Operates on the FULL frame so any spillover outside the ROI is
        // automatically clipped away (we never set those pixels true above).
        val closed = morphClose(mask, rows, cols, 3, 3)
        val opened = morphDilate(morphErode(closed, rows, cols, 1), rows, cols, 1)

        // Re-clip to ROI in case morphology dilated past the rectangle edge.
        for (r in 0 until rows) {
            val rowOff = r * cols
            val inRowBand = r in y0 until y1
            for (c in 0 until cols) {
                if (!(inRowBand && c in x0 until x1)) opened[rowOff + c] = false
            }
        }
        return opened
    }

    private fun morphDilate(src: BooleanArray, rows: Int, cols: Int, r: Int): BooleanArray {
        val dst = BooleanArray(rows * cols)
        for (row in 0 until rows) {
            for (col in 0 until cols) {
                if (!src[row * cols + col]) continue
                for (dr in -r..r) {
                    for (dc in -r..r) {
                        val nr = row + dr; val nc = col + dc
                        if (nr in 0 until rows && nc in 0 until cols) dst[nr * cols + nc] = true
                    }
                }
            }
        }
        return dst
    }

    private fun morphErode(src: BooleanArray, rows: Int, cols: Int, r: Int): BooleanArray {
        val dst = BooleanArray(rows * cols)
        for (row in 0 until rows) {
            for (col in 0 until cols) {
                if (!src[row * cols + col]) continue
                var keep = true
                outer@ for (dr in -r..r) {
                    for (dc in -r..r) {
                        val nr = row + dr; val nc = col + dc
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !src[nr * cols + nc]) {
                            keep = false; break@outer
                        }
                    }
                }
                dst[row * cols + col] = keep
            }
        }
        return dst
    }

    private fun morphClose(src: BooleanArray, rows: Int, cols: Int, dilateR: Int, erodeR: Int): BooleanArray =
        morphErode(morphDilate(src, rows, cols, dilateR), rows, cols, erodeR)

    private fun largestComponentWithBorderCount(mask: BooleanArray, rows: Int, cols: Int): Triple<BooleanArray, Int, Int> {
        val labels = IntArray(rows * cols) { -1 }
        val sizes  = mutableListOf<Int>()
        val borderCounts = mutableListOf<Int>()
        val queue  = IntArray(rows * cols)

        for (r in 0 until rows) {
            for (c in 0 until cols) {
                val i = r * cols + c
                if (!mask[i] || labels[i] >= 0) continue
                val label = sizes.size; sizes.add(0); borderCounts.add(0)
                var head = 0; var tail = 0
                queue[tail++] = i; labels[i] = label
                while (head < tail) {
                    val cur = queue[head++]
                    val cr = cur / cols; val cc = cur % cols
                    sizes[label] = sizes[label] + 1
                    if (cr == 0 || cr == rows - 1 || cc == 0 || cc == cols - 1)
                        borderCounts[label] = borderCounts[label] + 1
                    val up    = if (cr > 0)      (cr-1)*cols+cc else -1
                    val down  = if (cr < rows-1) (cr+1)*cols+cc else -1
                    val left  = if (cc > 0)      cr*cols+(cc-1) else -1
                    val right = if (cc < cols-1) cr*cols+(cc+1) else -1
                    for (ni in intArrayOf(up, down, left, right)) {
                        if (ni < 0 || !mask[ni] || labels[ni] >= 0) continue
                        labels[ni] = label; queue[tail++] = ni
                    }
                }
            }
        }

        if (sizes.isEmpty()) return Triple(BooleanArray(rows * cols), 0, 0)
        val best = sizes.indices.maxByOrNull { sizes[it] } ?: 0
        return Triple(BooleanArray(rows * cols) { labels[it] == best }, borderCounts[best], sizes[best])
    }

    // Otsu's method: finds the threshold + between-class variance over 256 bins.
    private fun otsuThresholdWithVariance(temps: FloatArray): Pair<Float, Double> {
        var minT = Float.MAX_VALUE; var maxT = -Float.MAX_VALUE
        for (v in temps) { if (v < minT) minT = v; if (v > maxT) maxT = v }
        val range = maxT - minT
        if (range <= 0f) return Pair(minT, 0.0)

        val BINS = 256
        val hist = IntArray(BINS)
        for (v in temps) {
            val bin = ((v - minT) / range * (BINS - 1)).toInt().coerceIn(0, BINS - 1)
            hist[bin]++
        }

        val n = temps.size.toDouble()
        var totalSum = 0.0
        for (i in 0 until BINS) totalSum += i.toDouble() * hist[i]

        var w0 = 0; var sum0 = 0.0
        var bestVar = 0.0; var bestBin = 0
        for (t in 0 until BINS - 1) {
            w0 += hist[t]; val w1 = n - w0
            if (w0 == 0 || w1 == 0.0) continue
            sum0 += t.toDouble() * hist[t]
            val mu0 = sum0 / w0
            val mu1 = (totalSum - sum0) / w1
            val diff = mu0 - mu1
            val bv   = (w0 / n) * (w1 / n) * diff * diff
            if (bv > bestVar) { bestVar = bv; bestBin = t }
        }
        return Pair(minT + (bestBin.toFloat() / (BINS - 1)) * range, bestVar)
    }

    private fun buildIsolatedPng(
        filtered: FloatArray, mask: BooleanArray,
        rows: Int, cols: Int, p1: Float, range: Float,
        crop: CropRoi? = null,
        bgBlack: Boolean = false,
    ): String {
        //Background fill: 0 (transparent) by default, opaque black when bgBlack=true.
        val bgPixel = if (bgBlack) (0xFF shl 24) else 0
        val pixels = IntArray(rows * cols)
        for (i in 0 until rows * cols) {
            if (!mask[i]) {
                pixels[i] = bgPixel
            } else {
                val t = ((filtered[i] - p1) / range).coerceIn(0f, 1f)
                val (r, g, b) = paletteRgb(t, palette)
                pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }
        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
        val outBmp = if (crop != null) cropBitmapByRoi(bmp, crop).also { bmp.recycle() } else bmp
        val out = ByteArrayOutputStream()
        outBmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        outBmp.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    private fun buildMaskedCsv(filtered: FloatArray, mask: BooleanArray, rows: Int, cols: Int): String {
        val sb = StringBuilder(rows * cols * 8)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                if (c > 0) sb.append(',')
                val i = r * cols + c
                sb.append(if (mask[i]) "%.2f".format(filtered[i]) else "0.00")
            }
            sb.append('\n')
        }
        return sb.toString()
    }

    // 16-bit grayscale TIFF encoder (little-endian, uncompressed)
    private fun encodeTiff16(rawU16: IntArray, width: Int, height: Int): ByteArray {
        val NUM_TAGS = 11; val xresOff = 146; val yresOff = 154; val dataOff = 162
        val buf = ByteArray(dataOff + rawU16.size * 2)
        val bb  = ByteBuffer.wrap(buf).order(ByteOrder.LITTLE_ENDIAN)
        bb.putShort(0x4949.toShort()); bb.putShort(42); bb.putInt(8)
        bb.putShort(NUM_TAGS.toShort())
        fun tag(t: Int, type: Int, count: Int, value: Int) {
            bb.putShort(t.toShort()); bb.putShort(type.toShort()); bb.putInt(count); bb.putInt(value)
        }
        tag(256, 4, 1, width);  tag(257, 4, 1, height); tag(258, 3, 1, 16)
        tag(259, 3, 1, 1);      tag(262, 3, 1, 1);      tag(273, 4, 1, dataOff)
        tag(278, 4, 1, height); tag(279, 4, 1, rawU16.size * 2)
        tag(282, 5, 1, xresOff);tag(283, 5, 1, yresOff);tag(296, 3, 1, 2)
        bb.putInt(0)
        bb.putInt(72); bb.putInt(1); bb.putInt(72); bb.putInt(1)
        for (v in rawU16) bb.putShort(v.toShort())
        return buf
    }

    // ── MediaStore file saving ────────────────────────────────────────────────

    private fun savePngToMediaStore(pngBytes: ByteArray, filename: String) {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Vestigia")
        }
        val uri = reactApplicationContext.contentResolver.insert(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values
        ) ?: throw Exception("MediaStore insert failed for $filename")
        reactApplicationContext.contentResolver.openOutputStream(uri)?.use { it.write(pngBytes) }
            ?: throw Exception("openOutputStream failed for $filename")
    }

    private fun saveCsvToMediaStore(csvContent: String, filename: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "text/csv")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Vestigia")
            }
            val uri = reactApplicationContext.contentResolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI, values
            ) ?: throw Exception("MediaStore Downloads insert failed for $filename")
            reactApplicationContext.contentResolver.openOutputStream(uri)?.use {
                it.write(csvContent.toByteArray(Charsets.UTF_8))
            } ?: throw Exception("openOutputStream failed for $filename")
        } else {
            // Pre-Q fallback: save alongside images
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "text/csv")
            }
            val uri = reactApplicationContext.contentResolver.insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values
            ) ?: return
            reactApplicationContext.contentResolver.openOutputStream(uri)?.use {
                it.write(csvContent.toByteArray(Charsets.UTF_8))
            }
        }
    }

    // ── USB helpers ───────────────────────────────────────────────────────────

    private fun findPureThermal(usbManager: UsbManager): UsbDevice? {
        val all = usbManager.deviceList.values
        val found = all.firstOrNull { it.vendorId == VID && it.productId == PID }
        if (found != null) android.util.Log.i("UVCModule", "Found PureThermal: ${found.deviceName}")
        else android.util.Log.w("UVCModule", "PureThermal not found. Devices: ${all.map { "${it.vendorId}:${it.productId}" }}")
        return found
    }

    private fun registerPermissionReceiver(usbManager: UsbManager, device: UsbDevice) {
        if (permReceiver != null) return
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != ACTION_USB_PERMISSION) return
                val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                if (granted) openDevice(usbManager, device)
                else {
                    android.util.Log.w("UVCModule", "USB permission denied by user")
                    connectPromise?.reject("PERMISSION_DENIED", "USB permission denied by user")
                    connectPromise = null
                }
            }
        }
        val filter = IntentFilter(ACTION_USB_PERMISSION)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            Context.RECEIVER_NOT_EXPORTED else 0
        reactApplicationContext.registerReceiver(receiver, filter, flags)
        permReceiver = receiver
    }

    private fun openDevice(usbManager: UsbManager, device: UsbDevice) {
        Thread {
            try {
                val conn = usbManager.openDevice(device)
                    ?: throw Exception("openDevice returned null — check USB_HOST feature or manifest")
                usbConnection = conn
                val fd = conn.fileDescriptor
                android.util.Log.i("UVCModule", "openDevice OK fd=$fd")
                nativeSetFormat(2) // force Y16 radiometric — required for temperature data
                val result = nativeOpen(fd)
                if (result < 0) {
                    conn.close(); usbConnection = null
                    throw Exception("nativeOpen failed: $result")
                }
                connected = true
                streamPaused = false
                startDisplayLoop()
                connectPromise?.resolve(true)
                connectPromise = null
                sendEvent("onCameraConnected", null)
            } catch (e: Exception) {
                android.util.Log.e("UVCModule", "openDevice failed: ${e.message}")
                connectPromise?.reject("UVC_OPEN_FAILED", e.message ?: "Failed to open camera")
                connectPromise = null
            }
        }.start()
    }

    private fun cleanupAll() {
        displayRunning = false
        streamPaused   = false
        displayQueue.clear()
        prevFrameForDiff = null
        prevDisplayFiltered = null
        frameIndex = 0
        if (connected || usbConnection != null) {
            try { nativeClose() } catch (_: Exception) {}
            try { usbConnection?.close() } catch (_: Exception) {}
            usbConnection = null
            connected = false
        }
        permReceiver?.let {
            try { reactApplicationContext.unregisterReceiver(it) } catch (_: Exception) {}
        }
        permReceiver = null
        synchronized(frameBufferLock) { frameBuffer.clear() }
    }

    private fun sendEvent(name: String, data: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, data)
    }
}
