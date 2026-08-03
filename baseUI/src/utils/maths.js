/**
 * Clamp a numeric value between a minimum and maximum value.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/**
 * Clamp a number between a minimum and maximum value with fallback if it's not a number or not a finite number.
 * @param {any} val
 * @param {number} min
 * @param {number} max
 * @param {number} [fallback=min] defaults to `min`
 * @returns {number|any}
 */
export function clampNumber(val, min, max, fallback = min) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  return clamp(n, min, max)
}

export const round = (val, step = 1) => {
  if (typeof val === "undefined")
    throw new Error("The function at least needs a value")
  return Math.round(val / step + Number.EPSILON) * step
}

export const roundDec = (val, dec = 0) => {
  if (typeof val === "undefined")
    throw new Error("The function at least needs a value")
  if (dec > 15)
    throw new Error("Floating point won't be precise after 15th decimal")
  if (val === 0)
    return 0
  if (!Number.isInteger(dec))
    throw new Error("Decimal point must be an integer")
  const pow = Math.pow(10, dec)
  return Math.round(val * pow + Number.EPSILON) / pow
}

export const roundDecSample = (val, sample = 0) => {
  const dec = getDecimalPlaces(sample)
  if (dec === 0)
    return round(val)
  return roundDec(val, dec)
}

export const getDecimalPlaces = num => {
  if (Number.isInteger(num) || !Number.isFinite(num)) return 0
  let dec = 0
  while (!Number.isInteger(num) && Number.isFinite(num)) {
    num *= 10
    dec++
    if (dec > 15) break
  }
  return dec
}
