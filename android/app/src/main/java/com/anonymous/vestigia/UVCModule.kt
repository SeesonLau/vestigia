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

    // Optional rectangular bound (normalized [0..1]) for the hot/cold/mean
    // crosshair scan in emitFrameStats. When non-null, the scan is limited
    // to the pixels inside this rect; outside pixels are ignored. JS pushes
    // this whenever the framing rectangle is shown so the on-screen
    // crosshair markers stay inside the user's ROI. null = scan whole frame.
    @Volatile private var statsRoiX: Float = 0f
    @Volatile private var statsRoiY: Float = 0f
    @Volatile private var statsRoiW: Float = 1f
    @Volatile private var statsRoiH: Float = 1f
    @Volatile private var statsRoiActive: Boolean = false

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

    // Constrain the hot/cold/mean crosshair scan to a rectangle (normalized
    // [0..1] over the sensor matrix). Any field outside [0..1] is treated as
    // "no ROI" and the scan reverts to the full frame.
    @ReactMethod
    fun setStatsRoi(x: Double, y: Double, w: Double, h: Double, promise: Promise) {
        val xf = x.toFloat(); val yf = y.toFloat()
        val wf = w.toFloat(); val hf = h.toFloat()
        val valid = wf > 0f && hf > 0f && xf >= 0f && yf >= 0f && xf + wf <= 1.001f && yf + hf <= 1.001f
        if (valid) {
            statsRoiX = xf; statsRoiY = yf; statsRoiW = wf; statsRoiH = hf
            statsRoiActive = true
        } else {
            statsRoiActive = false
        }
        promise.resolve(statsRoiActive)
    }

    // Clear the ROI bound — crosshair scan goes back to full-frame.
    @ReactMethod
    fun clearStatsRoi(promise: Promise) {
        statsRoiActive = false
        promise.resolve(true)
    }

    // Set radiometric correction parameters. Safe to call mid-stream.
    // emissivity is clamped to [0.10, 1.00]; reflectedTempC to [-50, 150] °C.
    @ReactMethod
    fun setMeasurementParams(emissivityIn: Double, reflectedTempCIn: Double, promise: Promise) {
        emissivity     = emissivityIn.toFloat().coerceIn(0.10f, 1.00f)
        reflectedTempC = reflectedTempCIn.toFloat().coerceIn(-50f, 150f)
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
        //
        //The bundle is always three 320×240 slots:
        //  [1] raw         — palette over the bilinear-upscaled temperatures.
        //                    Identical pipeline to the live preview.
        //  [2] processed   — 3×3 median + CLAHE on the native matrix, then
        //                    upscale and palette. Cropped to the ROI when one
        //                    is drawn; otherwise the full 320×240 frame.
        //  [3] isolated    — foot mask over slot 2, cropped to the same ROI.
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
        Thread {
            try {
                val result = processThermalFrames(frames, crop, isolatedBgBlack)
                val map = Arguments.createMap()
                map.putString("slot1ImageB64", result.slot1ImageB64)
                map.putString("slot2ImageB64", result.slot2ImageB64)
                map.putString("slot3ImageB64", result.slot3ImageB64)
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

        // ROI bounds in pixel coordinates. When statsRoiActive is false the
        // bounds cover the whole frame so the loops below stay branch-free.
        val roiActive = statsRoiActive
        val rcStart = if (roiActive) (statsRoiX * cols).toInt().coerceIn(0, cols - 1) else 0
        val rcEnd   = if (roiActive) ((statsRoiX + statsRoiW) * cols).toInt().coerceIn(rcStart + 1, cols) else cols
        val rrStart = if (roiActive) (statsRoiY * rows).toInt().coerceIn(0, rows - 1) else 0
        val rrEnd   = if (roiActive) ((statsRoiY + statsRoiH) * rows).toInt().coerceIn(rrStart + 1, rows) else rows

        // Whole-frame loop — variance/frameDiff stay whole-frame because the
        // ReadinessIndicator's FFC + motion checks need the full sensor
        // signal. ROI-bounded hot/cold/mean are accumulated in a second
        // (cheap) inner loop afterwards.
        var sum = 0.0; var sumSq = 0.0
        val temps = FloatArray(n)
        for (i in 0 until n) {
            val lo = frame[i * 2].toInt() and 0xFF
            val hi = frame[i * 2 + 1].toInt() and 0xFF
            val apparent = ((hi shl 8 or lo) - KELVIN_OFFSET) / 100f
            val t = if (correct) emissivityCorrect(apparent, eps, refl4) else apparent
            temps[i] = t; sum += t; sumSq += t * t
        }
        val frameMean = (sum / n).toFloat()
        val variance  = ((sumSq / n) - frameMean * frameMean).toFloat().coerceAtLeast(0f)

        // ROI-bounded crosshair stats. Falls back to whole-frame indices.
        var hotT  = -Float.MAX_VALUE; var hotIdx  = rrStart * cols + rcStart
        var coldT =  Float.MAX_VALUE; var coldIdx = hotIdx
        var roiSum = 0.0; var roiCount = 0
        for (r in rrStart until rrEnd) {
            val rowOff = r * cols
            for (c in rcStart until rcEnd) {
                val i = rowOff + c
                val t = temps[i]
                roiSum += t; roiCount++
                if (t > hotT)  { hotT  = t; hotIdx  = i }
                if (t < coldT) { coldT = t; coldIdx = i }
            }
        }
        val roiMean = if (roiCount > 0) (roiSum / roiCount).toFloat() else frameMean

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
        map.putDouble("meanTemp",   roiMean.toDouble())
        sendEvent("onFrameStats", map)
    }

    // Y16 -> JPEG, single regime:
    //   Y16 -> emissivity correct -> bilinear upscale 160x120 -> 320x240
    //          -> percentile clip + palette -> JPEG.
    //
    // No median, no temporal EMA, no CLAHE, no unsharp. The live preview
    // is what the Raw capture slot will look like; if the operator wants
    // the median + CLAHE enhanced view, they look at slot 2 of the saved
    // bundle. Keeping the live path light minimises latency and avoids the
    // temporal-blur artefacts the EMA used to introduce.
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

        // Bilinear upscale temperatures from native 160x120 to OUT 320x240
        // BEFORE palette mapping. Upscaling on temperatures (rather than
        // pixels) avoids palette-LUT discontinuities at sub-pixel offsets.
        val upTemps = if (cols == OUT_COLS && rows == OUT_ROWS) temps
            else upscaleBilinear(temps, rows, cols, OUT_ROWS, OUT_COLS)

        // Percentile clip + palette mapping at the final resolution.
        val sorted = upTemps.copyOf().also { it.sort() }
        val p1     = sorted[(sorted.size * 0.01f).toInt()]
        val p99    = sorted[(sorted.size * 0.99f).toInt()]
        val range  = (p99 - p1).takeIf { it > 0f } ?: 1f
        val pixels = IntArray(OUT_COLS * OUT_ROWS)
        when (displayMode) {
            "raw" -> {
                val minT = sorted[0]
                val rawRange = (sorted[sorted.size - 1] - minT).takeIf { it > 0f } ?: 1f
                for (i in 0 until OUT_COLS * OUT_ROWS) {
                    val v = (((upTemps[i] - minT) / rawRange).coerceIn(0f, 1f) * 255).toInt()
                    pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
                }
            }
            "agc" -> for (i in 0 until OUT_COLS * OUT_ROWS) {
                val v = (((upTemps[i] - p1) / range).coerceIn(0f, 1f) * 255).toInt()
                pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
            }
            else -> for (i in 0 until OUT_COLS * OUT_ROWS) {
                val t = ((upTemps[i] - p1) / range).coerceIn(0f, 1f)
                val (r, g, b) = paletteRgb(t, palette)
                pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }

        val bmp = Bitmap.createBitmap(OUT_COLS, OUT_ROWS, Bitmap.Config.ARGB_8888)
        bmp.setPixels(pixels, 0, OUT_COLS, 0, 0, OUT_COLS, OUT_ROWS)
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, 90, out)
        bmp.recycle()
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
        val slot2ImageB64:    String,
        val slot3ImageB64:    String,
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

        // Temporal averaging across the buffered Y16 frames.
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
        // reflected-temp correction. The corrected temperatures feed both
        // the visual slots and the CSV / TIFF radiometric outputs.
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

        // 16-bit TIFF — radiometric raw at NATIVE sensor resolution.
        val tiffBytes = encodeTiff16(rawAvg, cols, rows)
        val tiffB64   = Base64.encodeToString(tiffBytes, Base64.NO_WRAP)
        log.add("TIFF encoded (${tiffBytes.size} bytes, ${rows}×${cols} native)")

        // ── Slot 1 — Raw ────────────────────────────────────────────────
        // Bilinear upscale of the temperature matrix only — no spatial
        // filter, no CLAHE, no unsharp. Matches the live preview exactly.
        val rawUp = upscaleBilinear(tempFlat, rows, cols, OUT_ROWS, OUT_COLS)
        log.add("Slot 1 (Raw) — upscaled $rows×$cols → $OUT_ROWS×$OUT_COLS")

        // Stats reported to JS come from the raw upscaled matrix so the
        // numbers match what the operator saw on the live feed at capture
        // time. The processed matrix is for the visual rendering, not the
        // headline temperature readout.
        var minT = Float.MAX_VALUE; var maxT = -Float.MAX_VALUE; var sumT = 0.0
        for (v in rawUp) { if (v < minT) minT = v; if (v > maxT) maxT = v; sumT += v }
        val meanT = sumT / rawUp.size
        log.add("Stats (from raw): min=%.2f°C max=%.2f°C mean=%.2f°C".format(minT, maxT, meanT))

        // Percentile statistics for slot 1's palette mapping.
        val rawSorted   = rawUp.copyOf().also { it.sort() }
        val rawP1       = rawSorted[(rawSorted.size * 0.01f).toInt()]
        val rawP99      = rawSorted[(rawSorted.size * 0.99f).toInt()]
        val rawRangeP   = (rawP99 - rawP1).takeIf { it > 0f } ?: 1f
        val rawMin      = rawSorted[0]
        val rawSpan     = (rawSorted[rawSorted.size - 1] - rawMin).takeIf { it > 0f } ?: 1f

        val slot1ImageB64 = buildProcessedPng(
            rawUp, OUT_ROWS, OUT_COLS, rawP1, rawRangeP, rawMin, rawSpan, crop = null,
        )
        log.add("Slot 1 PNG encoded · raw, full frame (mode=$displayMode palette=$palette)")

        // ── Slot 2 — Post-processed + cropped ───────────────────────────
        // 3×3 median at native sensor resolution (kills dead pixels before
        // upscale smears them), then CLAHE at native res (more meaningful
        // on real sensor values than on the interpolated ones), then
        // bilinear upscale to 320×240. Crop to ROI if one was drawn;
        // otherwise the full frame.
        val medianNative = FloatArray(rows * cols)
        val medBuf       = FloatArray(9)
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                var k = 0
                for (dr in -1..1) for (dc in -1..1) {
                    medBuf[k++] = tempFlat[(r+dr).coerceIn(0, rows-1) * cols + (c+dc).coerceIn(0, cols-1)]
                }
                medBuf.sort()
                medianNative[r * cols + c] = medBuf[4]
            }
        }
        log.add("Slot 2 — 3×3 median applied (native res)")

        val claheNative  = claheNormalise(medianNative, rows, cols)  // returns [0..1] floats
        log.add("Slot 2 — CLAHE normalised (8×8 grid, clip=2.0)")

        val claheUp = upscaleBilinear(claheNative, rows, cols, OUT_ROWS, OUT_COLS)
        log.add("Slot 2 — upscaled CLAHE matrix to $OUT_ROWS×$OUT_COLS")

        val slot2ImageB64 = buildClahePng(claheUp, OUT_ROWS, OUT_COLS, crop)
        log.add("Slot 2 PNG encoded · post-processed" + (if (crop != null) " · cropped to ROI" else " · full frame (no ROI)"))

        // ── Slot 3 — Isolated foot ──────────────────────────────────────
        // Uses the median-filtered temperatures so the mask is built off the
        // same cleaner matrix slot 2 was rendered from. Crops to ROI too.
        val medianUp = upscaleBilinear(medianNative, rows, cols, OUT_ROWS, OUT_COLS)
        val sortedM  = medianUp.copyOf().also { it.sort() }
        val mP1      = sortedM[(sortedM.size * 0.01f).toInt()]
        val mP99     = sortedM[(sortedM.size * 0.99f).toInt()]
        val mRange   = (mP99 - mP1).takeIf { it > 0f } ?: 1f

        val mask          = isolateFootMask(medianUp, OUT_ROWS, OUT_COLS, crop)
        val slot3ImageB64 = buildIsolatedPng(medianUp, mask, OUT_ROWS, OUT_COLS, mP1, mRange, crop, isolatedBgBlack)
        val maskedCsv     = buildMaskedCsv(medianUp, mask, OUT_ROWS, OUT_COLS)
        log.add("Slot 3 — foot isolation complete" + (if (crop != null) " · cropped to ROI" else "")
            + (if (isolatedBgBlack) " · black bg" else ""))

        // CSV (°C, 2 dp) — full 320×240 matrix, using the raw upscaled
        // temperatures so the recorded values match the headline stats
        // and the live preview.
        val csvSB = StringBuilder(OUT_ROWS * OUT_COLS * 8)
        for (r in 0 until OUT_ROWS) {
            for (c in 0 until OUT_COLS) {
                if (c > 0) csvSB.append(',')
                csvSB.append("%.2f".format(rawUp[r * OUT_COLS + c]))
            }
            csvSB.append('\n')
        }

        log.add("Processing complete")

        return ThermalResult(
            slot1ImageB64    = slot1ImageB64,
            slot2ImageB64    = slot2ImageB64,
            slot3ImageB64    = slot3ImageB64,
            tiffB64          = tiffB64,
            csvContent       = csvSB.toString(),
            maskedCsvContent = maskedCsv,
            frameCount       = n,
            width            = OUT_COLS,
            height           = OUT_ROWS,
            minTemp          = minT.toDouble(),
            maxTemp          = maxT.toDouble(),
            meanTemp         = meanT,
            log              = log,
        )
    }

    // Build a palette-mapped PNG from a CLAHE-normalised [0..1] matrix.
    // Used exclusively by slot 2 (post-processed). The matrix is already
    // contrast-stretched so we skip the percentile clip step.
    private fun buildClahePng(
        normalised: FloatArray, rows: Int, cols: Int, crop: CropRoi?,
    ): String {
        val pixels = IntArray(rows * cols)
        when (displayMode) {
            "raw", "agc" -> for (i in 0 until rows * cols) {
                val v = (normalised[i].coerceIn(0f, 1f) * 255).toInt()
                pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
            }
            else -> for (i in 0 until rows * cols) {
                val (r, g, b) = paletteRgb(normalised[i].coerceIn(0f, 1f), palette)
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

        // Fill any large interior holes (cool spots inside a warm foot, etc.)
        // that the 5-px close above couldn't reach.
        val filled = fillHoles(subjectMask, rows, cols)

        // Opening (erode 2 → dilate 2) — trims ragged boundary fringe pixels.
        return morphDilate(morphErode(filled, rows, cols, 2), rows, cols, 2)
    }

    /**
     * ROI-aware isolation. Samples the background reference temperature
     * from a thin "moat" of pixels hugging the OUTSIDE of the user's
     * framing rectangle. The moat is much less polluted than the entire
     * outside-ROI region: when the subject (e.g. a foot) extends past the
     * box on one side, sampling all outside pixels biases the background
     * median toward the subject's own temperature, which inflates the
     * threshold and causes the algorithm to under-isolate. Sampling close
     * to the ROI edge is far more representative.
     *
     * Then computes a *one-sided* threshold based on whether the inside-ROI
     * is hotter or colder than the moat. One-sided is tighter than two-
     * sided so we can use a smaller floor without flagging speckle.
     *
     * After thresholding we take the largest connected component and fill
     * any holes inside it (a cool spot in the centre of a warm foot that
     * fell below threshold should still be part of the foot, not a donut).
     */
    private fun isolateByRoiBackground(
        filtered: FloatArray, rows: Int, cols: Int, roi: CropRoi,
    ): BooleanArray {
        // ROI bounds in pixel coords.
        val x0 = (roi.x * cols).toInt().coerceIn(0, cols - 1)
        val y0 = (roi.y * rows).toInt().coerceIn(0, rows - 1)
        val x1 = ((roi.x + roi.w) * cols).toInt().coerceIn(x0 + 1, cols)
        val y1 = ((roi.y + roi.h) * rows).toInt().coerceIn(y0 + 1, rows)

        // Moat: pixels inside an expanded ROI but outside the original. The
        // moat width is 8% of the smaller frame dimension (≈ 10 px at
        // 160×120, ≈ 19 px at 320×240) — wide enough to give a stable
        // sample, narrow enough to avoid the foot's bottom in cases where
        // the user framed only the upper part.
        val moat = maxOf(6, (minOf(rows, cols) * 0.08f).toInt())
        val mx0 = maxOf(0,    x0 - moat)
        val my0 = maxOf(0,    y0 - moat)
        val mx1 = minOf(cols, x1 + moat)
        val my1 = minOf(rows, y1 + moat)

        val moatSamples = ArrayList<Float>()
        for (r in my0 until my1) {
            val rowOff = r * cols
            val inRowBand = r in y0 until y1
            for (c in mx0 until mx1) {
                if (inRowBand && c in x0 until x1) continue   // skip inside-ROI
                moatSamples.add(filtered[rowOff + c])
            }
        }
        // Pathological case: ROI is too close to the frame edges or fills it
        // entirely → no moat to learn from. Fall back to Otsu.
        if (moatSamples.size < 32) return isolateFootMask(filtered, rows, cols, crop = null)

        // Robust stats over the moat: median (centre) + MAD (spread).
        val bgArr = moatSamples.toFloatArray().also { java.util.Arrays.sort(it) }
        val bgMedian = bgArr[bgArr.size / 2]
        val absDevs = FloatArray(bgArr.size) { Math.abs(bgArr[it] - bgMedian) }
        java.util.Arrays.sort(absDevs)
        val mad   = absDevs[absDevs.size / 2]
        val sigma = 1.4826f * mad

        // Decide subject direction: compare the median of inside-ROI to the
        // moat median. If inside is hotter, subject is "warmer than bg".
        val inside = ArrayList<Float>((y1 - y0) * (x1 - x0))
        for (r in y0 until y1) {
            val rowOff = r * cols
            for (c in x0 until x1) inside.add(filtered[rowOff + c])
        }
        val insideArr = inside.toFloatArray().also { java.util.Arrays.sort(it) }
        val insideMedian = insideArr[insideArr.size / 2]
        val warmer = insideMedian >= bgMedian

        // One-sided threshold. Floor 0.6 °C so a rock-steady moat with
        // sigma≈0 still discriminates above sensor noise. 2·sigma keeps
        // recall high without flagging warm-floor speckle.
        val threshold = maxOf(0.6f, 2.0f * sigma)

        val mask = BooleanArray(rows * cols)
        for (r in y0 until y1) {
            val rowOff = r * cols
            for (c in x0 until x1) {
                val i = rowOff + c
                val signedDiff = if (warmer) filtered[i] - bgMedian else bgMedian - filtered[i]
                if (signedDiff > threshold) mask[i] = true
            }
        }

        // Close small interior gaps (≤6 px wide) before component selection.
        val closed = morphClose(mask, rows, cols, 3, 3)

        // Largest connected component — drops any speckle that survived in
        // an unrelated part of the ROI (e.g. a warm shadow at one corner).
        val (largestMask, _, _) = largestComponentWithBorderCount(closed, rows, cols)

        // Fill any larger holes inside the chosen component (the heel-hole
        // failure mode the closing radius couldn't reach).
        val filled = fillHoles(largestMask, rows, cols)

        // Re-clip to the ROI rectangle so morphology can't bleed past it.
        for (r in 0 until rows) {
            val rowOff = r * cols
            val inRowBand = r in y0 until y1
            for (c in 0 until cols) {
                if (!(inRowBand && c in x0 until x1)) filled[rowOff + c] = false
            }
        }
        return filled
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

    /**
     * Fill any hole that's fully enclosed by the mask. Algorithm: 4-connect
     * flood-fill from every border pixel through the *inverse* (background)
     * cells. Any inverse cell that wasn't reached is, by definition, an
     * interior hole — promote it to foreground.
     *
     * This catches the "donut" failure mode where a cool spot in the centre
     * of a warm foot was below threshold and showed up as a black hole in
     * the isolated PNG, even after closing morphology (which only patches
     * holes up to its kernel radius).
     */
    private fun fillHoles(mask: BooleanArray, rows: Int, cols: Int): BooleanArray {
        val n = rows * cols
        val visited = BooleanArray(n)
        val queue   = IntArray(n)
        var head = 0; var tail = 0

        // Seed: every border background pixel.
        for (c in 0 until cols) {
            val top = c
            val bot = (rows - 1) * cols + c
            if (!mask[top] && !visited[top]) { visited[top] = true; queue[tail++] = top }
            if (!mask[bot] && !visited[bot]) { visited[bot] = true; queue[tail++] = bot }
        }
        for (r in 0 until rows) {
            val left  = r * cols
            val right = r * cols + (cols - 1)
            if (!mask[left]  && !visited[left])  { visited[left]  = true; queue[tail++] = left }
            if (!mask[right] && !visited[right]) { visited[right] = true; queue[tail++] = right }
        }
        // 4-connect BFS through background cells.
        while (head < tail) {
            val cur = queue[head++]
            val r = cur / cols; val c = cur % cols
            if (r > 0)        { val ni = cur - cols; if (!mask[ni] && !visited[ni]) { visited[ni] = true; queue[tail++] = ni } }
            if (r < rows - 1) { val ni = cur + cols; if (!mask[ni] && !visited[ni]) { visited[ni] = true; queue[tail++] = ni } }
            if (c > 0)        { val ni = cur - 1;    if (!mask[ni] && !visited[ni]) { visited[ni] = true; queue[tail++] = ni } }
            if (c < cols - 1) { val ni = cur + 1;    if (!mask[ni] && !visited[ni]) { visited[ni] = true; queue[tail++] = ni } }
        }
        // Original mask OR pixels not reachable from border = foreground.
        return BooleanArray(n) { mask[it] || !visited[it] }
    }

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
