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
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

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
    @Volatile private var palette       = "ironbow" // ironbow | rainbow | rainbow_hc | white_hot | black_hot | arctic | sepia

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
            "ironbow", "rainbow", "rainbow_hc", "white_hot", "black_hot", "arctic", "sepia" -> pal
            else -> "ironbow"
        }
        promise.resolve(palette)
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
    fun processCapture(promise: Promise) {
        val frames = synchronized(frameBufferLock) { frameBuffer.toList() }
        if (frames.isEmpty()) {
            promise.reject("NO_FRAMES", "No thermal frames buffered. Ensure the camera is streaming in Y16 mode.")
            return
        }
        Thread {
            try {
                val result = processThermalFrames(frames)
                val map = Arguments.createMap()
                map.putString("displayPngB64",    result.displayPngB64)
                map.putString("isolatedPngB64",   result.isolatedPngB64)
                map.putString("tiffB64",          result.tiffB64)
                map.putString("csvContent",       result.csvContent)
                map.putString("maskedCsvContent", result.maskedCsvContent)
                map.putInt   ("frameCount",       result.frameCount)
                map.putInt   ("width",            result.width)
                map.putInt   ("height",           result.height)
                map.putDouble("minTemp",          result.minTemp)
                map.putDouble("maxTemp",          result.maxTemp)
                map.putDouble("meanTemp",         result.meanTemp)
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
        val n = frame.size / 2
        var sum = 0.0; var sumSq = 0.0
        val temps = FloatArray(n)
        for (i in 0 until n) {
            val lo = frame[i * 2].toInt() and 0xFF
            val hi = frame[i * 2 + 1].toInt() and 0xFF
            val t = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
            temps[i] = t; sum += t; sumSq += t * t
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

        val map = Arguments.createMap()
        map.putDouble("variance",   variance.toDouble())
        map.putDouble("frameDiff",  frameDiff.toDouble())
        map.putInt   ("frameIndex", idx)
        sendEvent("onFrameStats", map)
    }

    // Y16 → JPEG via the current displayMode and palette. Single frame, no averaging.
    private fun y16ToDisplayJpeg(frame: ByteArray): String {
        val rows = frame.size / ROW_BYTES
        val cols = FRAME_COLS

        val temps = FloatArray(rows * cols)
        for (i in 0 until rows * cols) {
            val lo = frame[i * 2].toInt() and 0xFF
            val hi = frame[i * 2 + 1].toInt() and 0xFF
            temps[i] = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
        }

        val sorted = temps.copyOf().also { it.sort() }
        val p1    = sorted[(sorted.size * 0.01f).toInt()]
        val p99   = sorted[(sorted.size * 0.99f).toInt()]
        val range = (p99 - p1).takeIf { it > 0f } ?: 1f

        val pixels = IntArray(rows * cols)
        when (displayMode) {
            "raw" -> {
                // Linear full-range grayscale — no percentile clip, true sensor range
                val minT    = sorted[0]
                val rawRange = (sorted[sorted.size - 1] - minT).takeIf { it > 0f } ?: 1f
                for (i in 0 until rows * cols) {
                    val v = (((temps[i] - minT) / rawRange).coerceIn(0f, 1f) * 255).toInt()
                    pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                }
            }
            "agc" -> {
                // Percentile-clipped grayscale — simulates camera hardware AGC output
                for (i in 0 until rows * cols) {
                    val v = (((temps[i] - p1) / range).coerceIn(0f, 1f) * 255).toInt()
                    pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                }
            }
            else -> {
                // RGB — percentile-clipped + selected palette
                for (i in 0 until rows * cols) {
                    val t = ((temps[i] - p1) / range).coerceIn(0f, 1f)
                    val (r, g, b) = paletteRgb(t, palette)
                    pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                }
            }
        }

        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, 90, out)
        bmp.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    // ── Color palettes ────────────────────────────────────────────────────────

    private fun paletteRgb(t: Float, pal: String): Triple<Int, Int, Int> = when (pal) {
        "rainbow"    -> rainbowRgb(t)
        "rainbow_hc" -> rainbowHcRgb(t)
        "white_hot"  -> whiteHotRgb(t)
        "black_hot"  -> blackHotRgb(t)
        "arctic"     -> arcticRgb(t)
        "sepia"      -> sepiaRgb(t)
        else         -> ironbowRgb(t)
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

    // Rainbow HC — 6-band high-contrast: dark→blue→cyan→green→yellow→red→magenta
    private fun rainbowHcRgb(t: Float): Triple<Int, Int, Int> {
        val n = t.coerceIn(0f, 1f)
        return when {
            n < 0.167f -> { val f = n/0.167f;            Triple(0,                    0,                  (128+127*f).toInt()) }
            n < 0.333f -> { val f = (n-0.167f)/0.167f;   Triple(0,                    (255*f).toInt(),    255)                 }
            n < 0.500f -> { val f = (n-0.333f)/0.167f;   Triple(0,                    255,                (255*(1-f)).toInt()) }
            n < 0.667f -> { val f = (n-0.500f)/0.167f;   Triple((255*f).toInt(),      255,                0)                  }
            n < 0.833f -> { val f = (n-0.667f)/0.167f;   Triple(255,                  (255*(1-f)).toInt(),0)                  }
            else       -> { val f = (n-0.833f)/0.167f;   Triple(255,                  0,                  (200*f).toInt())    }
        }
    }

    // White Hot — linear grayscale, white = warmest
    private fun whiteHotRgb(t: Float): Triple<Int, Int, Int> {
        val v = (t.coerceIn(0f, 1f) * 255).toInt()
        return Triple(v, v, v)
    }

    // Black Hot — inverted grayscale, black = warmest
    private fun blackHotRgb(t: Float): Triple<Int, Int, Int> {
        val v = ((1f - t.coerceIn(0f, 1f)) * 255).toInt()
        return Triple(v, v, v)
    }

    // Arctic — cold=deep blue, warm=golden yellow
    private fun arcticRgb(t: Float): Triple<Int, Int, Int> {
        val n = t.coerceIn(0f, 1f)
        return when {
            n < 0.40f -> { val f = n/0.40f;              Triple((20*f).toInt(),       (40*f).toInt(),     (180+75*f).toInt())    }
            n < 0.65f -> { val f = (n-0.40f)/0.25f;      Triple((20+180*f).toInt(),   (40+160*f).toInt(), (255-255*f).toInt())   }
            else      -> { val f = (n-0.65f)/0.35f;      Triple((200+55*f).toInt(),   (200+55*f).toInt(), (50*f).toInt())        }
        }
    }

    // Sepia — warm brown/golden gradient; reduces eye fatigue in prolonged viewing
    private fun sepiaRgb(t: Float): Triple<Int, Int, Int> {
        val v = t.coerceIn(0f, 1f)
        return Triple(
            (255 * v).toInt().coerceIn(0, 255),
            (200 * v).toInt().coerceIn(0, 255),
            (140 * v * v).toInt().coerceIn(0, 255),
        )
    }

    // ── Capture processing ────────────────────────────────────────────────────

    private data class ThermalResult(
        val displayPngB64:   String,
        val isolatedPngB64:  String,
        val tiffB64:         String,
        val csvContent:      String,
        val maskedCsvContent:String,
        val frameCount:      Int,
        val width:           Int,
        val height:          Int,
        val minTemp:         Double,
        val maxTemp:         Double,
        val meanTemp:        Double,
        val log:             List<String>,
    )

    private fun processThermalFrames(frames: List<ByteArray>): ThermalResult {
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

        val tempFlat = FloatArray(rows * cols) { i -> (rawAvg[i] - KELVIN_OFFSET) / 100f }

        val inRange = tempFlat.count { it in -50f..150f }
        if (inRange < tempFlat.size / 2)
            throw Exception("Frame data does not look like Y16 radiometric. Switch camera to Y16 mode.")

        // 3×3 median filter
        val filtered = FloatArray(rows * cols)
        val buf      = FloatArray(9)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                var k = 0
                for (dr in -1..1) for (dc in -1..1) {
                    buf[k++] = tempFlat[(r+dr).coerceIn(0, rows-1) * cols + (c+dc).coerceIn(0, cols-1)]
                }
                buf.sort()
                filtered[r * cols + c] = buf[4]
            }
        }
        log.add("Median 3×3 filter applied")

        // Temperature stats
        var minT = Float.MAX_VALUE; var maxT = -Float.MAX_VALUE; var sumT = 0.0
        for (v in filtered) { if (v < minT) minT = v; if (v > maxT) maxT = v; sumT += v }
        val meanT = sumT / filtered.size
        log.add("Stats: min=%.2f°C max=%.2f°C mean=%.2f°C".format(minT, maxT, meanT))

        // CSV (°C, 2 dp)
        val csvSB = StringBuilder(rows * cols * 8)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                if (c > 0) csvSB.append(',')
                csvSB.append("%.2f".format(filtered[r * cols + c]))
            }
            csvSB.append('\n')
        }

        // Display PNG — use current mode/palette so captured image matches live view
        val sorted  = filtered.copyOf().also { it.sort() }
        val p1      = sorted[(sorted.size * 0.01f).toInt()]
        val p99     = sorted[(sorted.size * 0.99f).toInt()]
        val range   = (p99 - p1).takeIf { it > 0f } ?: 1f
        val minVal  = sorted[0]
        val rawRange = (sorted[sorted.size - 1] - minVal).takeIf { it > 0f } ?: 1f

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
        val pngOut = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, pngOut)
        bmp.recycle()
        val displayPngB64 = Base64.encodeToString(pngOut.toByteArray(), Base64.NO_WRAP)
        log.add("Display PNG encoded (mode=$displayMode palette=$palette)")

        // 16-bit TIFF (always radiometric Kelvin×100, independent of display mode)
        val tiffBytes = encodeTiff16(rawAvg, cols, rows)
        val tiffB64   = Base64.encodeToString(tiffBytes, Base64.NO_WRAP)
        log.add("TIFF encoded (${tiffBytes.size} bytes)")
        log.add("Processing complete")

        // Foot isolation
        val mask             = isolateFootMask(filtered, rows, cols)
        val isolatedPngB64   = buildIsolatedPng(filtered, mask, rows, cols, p1, range)
        val maskedCsvContent = buildMaskedCsv(filtered, mask, rows, cols)
        log.add("Foot isolation complete")

        return ThermalResult(
            displayPngB64    = displayPngB64,
            isolatedPngB64   = isolatedPngB64,
            tiffB64          = tiffB64,
            csvContent       = csvSB.toString(),
            maskedCsvContent = maskedCsvContent,
            frameCount       = n,
            width            = cols,
            height           = rows,
            minTemp          = minT.toDouble(),
            maxTemp          = maxT.toDouble(),
            meanTemp         = meanT,
            log              = log,
        )
    }

    // ── Foot isolation ────────────────────────────────────────────────────────

    // Works for both hot subjects (warm foot on cold floor) and cold subjects (cold dumbbell on warm table).
    private fun isolateFootMask(filtered: FloatArray, rows: Int, cols: Int): BooleanArray {
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
        rows: Int, cols: Int, p1: Float, range: Float
    ): String {
        val pixels = IntArray(rows * cols)
        for (i in 0 until rows * cols) {
            if (!mask[i]) {
                pixels[i] = 0
            } else {
                val t = ((filtered[i] - p1) / range).coerceIn(0f, 1f)
                val (r, g, b) = paletteRgb(t, palette)
                pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }
        val bmp = Bitmap.createBitmap(cols, rows, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, cols, 0, 0, cols, rows)
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        bmp.recycle()
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
