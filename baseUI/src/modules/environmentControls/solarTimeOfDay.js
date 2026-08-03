const RAD = Math.PI / 180
const MINUTES_PER_DAY = 1440

const mod = (a, m) => ((a % m) + m) % m
const toJulian = date => date.getTime() / 86400000 + 2440587.5

function solarDeclEqTime(date) {
  const T = (toJulian(date) - 2451545.0) / 36525
  const L0 = 280.46646 + T * (36000.76983 + T * 0.0003032)
  const M = 357.52911 + T * (35999.05029 - T * 0.0001537)
  const ecc = 0.016708634 - T * (0.000042037 + T * 0.0000001267)
  const Mr = M * RAD
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + T * 0.000014)) +
    Math.sin(2 * Mr) * (0.019993 - T * 0.000101) +
    Math.sin(3 * Mr) * 0.000289
  const omega = (125.04 - 1934.136 * T) * RAD
  const lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD
  const eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 +
    0.00256 * Math.cos(omega)) * RAD
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD
  const y = Math.tan(eps / 2) ** 2
  const L0r = L0 * RAD
  const eqTime = 4 / RAD * (y * Math.sin(2 * L0r) - 2 * ecc * Math.sin(Mr) +
    4 * ecc * y * Math.sin(Mr) * Math.cos(2 * L0r) -
    0.5 * y * y * Math.sin(4 * L0r) - 1.25 * ecc * ecc * Math.sin(2 * Mr))
  return { decl, eqTime }
}

function sunTimesUtcMinutes(year, month, day, lat, lon) {
  const date = new Date(Date.UTC(year, month - 1, day))
  const { decl, eqTime } = solarDeclEqTime(date)
  const latR = lat * RAD
  const declR = decl * RAD
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(latR) * Math.cos(declR)) - Math.tan(latR) * Math.tan(declR)
  const noon = 720 - 4 * lon - eqTime

  if (cosH < -1) return { sunrise: null, noon, sunset: null, polar: "day" }
  if (cosH > 1) return { sunrise: null, noon, sunset: null, polar: "night" }

  const ha = Math.acos(cosH) / RAD
  return {
    sunrise: noon - 4 * ha,
    noon,
    sunset: noon + 4 * ha,
    polar: null,
  }
}

function dow(year, month, day) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  let y = year
  if (month < 3) y--
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7
}

function lastSunday(year, month) {
  const last = month === 4 || month === 9 || month === 11 ? 30 : 31
  return last - dow(year, month, last)
}

function firstSunday(year, month) {
  return 1 + (7 - dow(year, month, 1)) % 7
}

function dstActive(rule, year, month, day) {
  if (rule === "eu") {
    if (month < 3 || month > 10) return false
    if (month > 3 && month < 10) return true
    return (month === 3 && day >= lastSunday(year, 3)) || (month === 10 && day < lastSunday(year, 10))
  }
  if (rule === "us") {
    if (month < 3 || month > 11) return false
    if (month > 3 && month < 11) return true
    return (month === 3 && day >= firstSunday(year, 3) + 7) || (month === 11 && day < firstSunday(year, 11))
  }
  if (rule === "au") {
    if (month > 4 && month < 10) return false
    if (month < 4 || month > 10) return true
    return (month === 4 && day < firstSunday(year, 4)) || (month === 10 && day >= firstSunday(year, 10))
  }
  return false
}

export function civilOffsetHours(state) {
  const explicitOffset = Number(state?.utcOffset)
  if (Number.isFinite(explicitOffset)) return explicitOffset

  const lat = Number(state?.latitude)
  const lon = Number(state?.longitude)
  const year = Number(state?.year)
  const month = Number(state?.month)
  const day = Number(state?.day)
  if (![lat, lon, year, month, day].every(Number.isFinite)) return null

  let rule = state?.dstRule || "auto"
  if (rule === "auto") {
    if (lat <= -30) rule = "au"
    else if (lat >= 30) rule = lon > -170 && lon < -30 ? "us" : "eu"
    else rule = "none"
  }

  return Math.floor(lon / 15 + 0.5) + (dstActive(rule, year, month, day) ? 1 : 0)
}

function normalizeMinutes(minutes) {
  const m = Number(minutes)
  if (!Number.isFinite(m)) return null
  return mod(Math.round(m), MINUTES_PER_DAY)
}

function isDaylightAtMinute(events, minutes) {
  const sunrise = normalizeMinutes(events?.sunrise)
  const sunset = normalizeMinutes(events?.sunset)
  const value = normalizeMinutes(minutes)
  if (sunrise === null || sunset === null || value === null) return false
  if (sunrise <= sunset) return value >= sunrise && value < sunset
  return value >= sunrise || value < sunset
}

function timeFromMinutes(minutes) {
  let t = normalizeMinutes(minutes) / MINUTES_PER_DAY - 0.5
  t %= 1
  return t < 0 ? t + 1 : t
}

export function formatTodHHMM(minutes) {
  const m = normalizeMinutes(minutes)
  if (m === null) return ""
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

export function getCurrentLevelTime(state, date = new Date()) {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes()
  const offsetHours = civilOffsetHours({
    ...(state || {}),
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
  return Number.isFinite(offsetHours) ? formatTodHHMM(utcMinutes + offsetHours * 60) : "--:--"
}

export function getSolarTimeOfDayEvents(state) {
  const lat = Number(state?.latitude)
  const lon = Number(state?.longitude)
  const year = Number(state?.year)
  const month = Number(state?.month)
  const day = Number(state?.day)
  const offset = civilOffsetHours(state)
  if (![lat, lon, year, month, day, offset].every(Number.isFinite)) return null

  const utcTimes = sunTimesUtcMinutes(year, month, day, lat, lon)
  const toLocal = minutes => minutes === null ? null : normalizeMinutes(minutes + offset * 60)

  return {
    sunrise: toLocal(utcTimes.sunrise),
    noon: toLocal(utcTimes.noon),
    sunset: toLocal(utcTimes.sunset),
    night: toLocal(utcTimes.noon + MINUTES_PER_DAY / 2),
    polar: utcTimes.polar,
  }
}

export function buildSolarTimeOfDayOptions(state, options) {
  const events = getSolarTimeOfDayEvents(state)
  if (!events) return options

  if (events.polar) {
    return [
      { key: "solarMidnight", value: timeFromMinutes(events.night), label: "ui.quickrace.tod.solarMidnight" },
      { key: "solarNoon", value: timeFromMinutes(events.noon), label: "ui.quickrace.tod.solarNoon" },
    ].filter(option => option.value !== null && option.value !== undefined)
  }

  const eventByKey = {
    sunrise: events.sunrise,
    noon: events.noon,
    sunset: events.sunset,
    night: events.night,
  }

  return (Array.isArray(options) ? options : [])
    .map(option => {
      const minutes = eventByKey[option?.key]
      if (minutes === null || minutes === undefined) return option
      return { ...option, value: timeFromMinutes(minutes) }
    })
}

export function buildSolarTodMarkers(state, icons) {
  const events = getSolarTimeOfDayEvents(state)
  const midnightMarker = events && isDaylightAtMinute(events, 0)
    ? { icon: icons.day, label: "Day" }
    : { icon: icons.night, label: "Night" }
  const markerDefs = events?.polar ? [
    { value: events.night, icon: icons.sunRise, label: "Solar midnight" },
    { value: events.noon, icon: icons.sunDown, label: "Solar noon" },
  ] : events ? [
    { value: 0, icon: midnightMarker.icon, label: midnightMarker.label },
    { value: events.sunrise, icon: icons.sunRise, label: "Sunrise" },
    { value: events.noon, icon: icons.day, label: "Noon" },
    { value: events.sunset, icon: icons.sunDown, label: "Sunset" },
    { value: MINUTES_PER_DAY, icon: midnightMarker.icon, label: midnightMarker.label },
  ] : [
    { value: 0, icon: icons.night, label: "Midnight" },
    { value: 360, icon: icons.sunRise, label: "Sunrise" },
    { value: 720, icon: icons.day, label: "Noon" },
    { value: 1080, icon: icons.sunDown, label: "Sunset" },
    { value: MINUTES_PER_DAY, icon: icons.night, label: "Midnight" },
  ]

  return markerDefs
    .filter(marker => marker.value !== null && marker.value !== undefined)
    .map(marker => ({
      value: marker.value,
      icon: marker.icon,
      tooltip: `${marker.label} (${formatTodHHMM(marker.value)})`,
    }))
}
