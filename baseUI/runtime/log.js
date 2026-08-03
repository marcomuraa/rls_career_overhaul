import { LOGS_ENABLED } from "./config.js"

export const log = !LOGS_ENABLED ? () => {} : (...msgs) => console.log(...msgs)
export const info = !LOGS_ENABLED ? () => {} : (...msgs) => console.info(...msgs)
export const warn = !LOGS_ENABLED ? () => {} : (...msgs) => console.warn(...msgs)
export const error = !LOGS_ENABLED ? () => {} : (...msgs) => console.error(...msgs)
