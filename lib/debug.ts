// lib/debug.ts
const APP_START = Date.now();

export function dbg(tag: string, msg: string, data?: unknown) {
  const elapsed = Date.now() - APP_START;
  const prefix = `[+${elapsed}ms][${tag}]`;
  if (data !== undefined) {
    console.log(prefix, msg, data);
  } else {
    console.log(prefix, msg);
  }
}
