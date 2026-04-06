// lib/thermal/wifiCamera.ts
// WebSocket thermal stream for Waveshare ESP32 MIO802M5S.
//
// ESP32 firmware must run a WebSocket server and send binary frames:
//
//   Offset  Size  Description
//   ──────  ────  ───────────────────────────────────────────────────────
//      0      1   Magic byte 0  → 0x54 ('T')
//      1      1   Magic byte 1  → 0x4D ('M')
//      2      2   Frame width   (uint16, little-endian, e.g. 80 for Lepton)
//      4      2   Frame height  (uint16, little-endian, e.g. 62)
//      6      2   Reserved / frame counter
//      8    W×H×2 Pixel data: one uint16 LE per pixel
//                 Value = temperature × 100  (e.g. 3700 → 37.00 °C)
//
//   Stream endpoint:  ws://<IP>:<PORT>/stream
//   Ping endpoint:    ws://<IP>:<PORT>/ping   (close immediately on open)

export const WIFI_DEFAULT_PORT = 8080
export const WIFI_STREAM_PATH  = '/stream'
export const WIFI_PING_PATH    = '/ping'

type FrameCallback = (
  matrix: number[][],
  min: number,
  max: number,
  mean: number,
) => void

const MAGIC_0 = 0x54  // 'T'
const MAGIC_1 = 0x4d  // 'M'

//State
let _socket:       WebSocket | null   = null
let _onFrame:      FrameCallback | null = null
let _onConnect:    (() => void) | null  = null
let _onDisconnect: (() => void) | null  = null

//Connect
export function connectWifi(
  ip: string,
  port: number = WIFI_DEFAULT_PORT,
  onConnect: () => void,
  onDisconnect: () => void,
): void {
  _onConnect    = onConnect
  _onDisconnect = onDisconnect
  _openSocket(ip, port)
}

function _openSocket(ip: string, port: number): void {
  _closeSocket()
  try {
    const ws = new WebSocket(`ws://${ip}:${port}${WIFI_STREAM_PATH}`)
    ws.binaryType = 'arraybuffer'
    ws.onopen    = () => _onConnect?.()
    ws.onclose   = () => _onDisconnect?.()
    ws.onerror   = () => _onDisconnect?.()
    ws.onmessage = (e) => { try { _handleFrame(e.data as ArrayBuffer) } catch {} }
    _socket = ws
  } catch {
    _onDisconnect?.()
  }
}

function _closeSocket(): void {
  if (!_socket) return
  _socket.onopen = _socket.onclose = _socket.onerror = _socket.onmessage = null
  _socket.close()
  _socket = null
}

function _handleFrame(buf: ArrayBuffer): void {
  if (!_onFrame || buf.byteLength < 8) return
  const view = new DataView(buf)
  if (view.getUint8(0) !== MAGIC_0 || view.getUint8(1) !== MAGIC_1) return
  const w = view.getUint16(2, true)
  const h = view.getUint16(4, true)
  if (buf.byteLength < 8 + w * h * 2) return

  let min = Infinity, max = -Infinity, sum = 0
  const matrix: number[][] = []
  for (let r = 0; r < h; r++) {
    const row: number[] = []
    for (let c = 0; c < w; c++) {
      const temp = view.getUint16(8 + (r * w + c) * 2, true) / 100
      row.push(temp)
      if (temp < min) min = temp
      if (temp > max) max = temp
      sum += temp
    }
    matrix.push(row)
  }
  _onFrame(matrix, min, max, sum / (w * h))
}

//Frame listener
export function onWifiFrame(callback: FrameCallback): void {
  _onFrame = callback
}

//Disconnect
export function disconnectWifi(): void {
  _closeSocket()
  _onFrame = _onConnect = _onDisconnect = null
}

export function isWifiConnected(): boolean {
  return _socket?.readyState === WebSocket.OPEN
}

//Ping — tests reachability before committing to full stream
export function pingWifi(
  ip: string,
  port: number = WIFI_DEFAULT_PORT,
  timeoutMs = 4000,
): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (v: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      ws.onopen = ws.onclose = ws.onerror = null
      try { ws.close() } catch {}
      resolve(v)
    }
    const ws = new WebSocket(`ws://${ip}:${port}${WIFI_PING_PATH}`)
    const timer = setTimeout(() => finish(false), timeoutMs)
    ws.onopen  = () => finish(true)
    ws.onerror = () => finish(false)
  })
}
