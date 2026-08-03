<template>
  <div class="cards-container" bng-nav-scroll-force>
    <BngBinding class="stats-tracker-ignore" ui-event="ok" always-show-unassigned aria-hidden="true" />
    <BngBinding v-for="event in IGNORED_FOCUS_EVENTS" :key="event" class="stats-tracker-ignore" :ui-event="event" always-show-unassigned aria-hidden="true" />
    <StatsCard class="stats-card" v-for="card in cards" :key="card.key" :title="card.title" :sections="card.sections" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useBridge, lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { $translate } from "@/services/translation"
import { BngBinding } from "@/common/components/base"
import StatsCard from "../components/StatsCard.vue"

defineOptions({ name: "StatsView" })

const IGNORED_FOCUS_EVENTS = Object.freeze(["focus_u", "focus_d", "focus_l", "focus_r", "focus_lr", "focus_ud"])

const bridge = useBridge()
const events = useEvents()

const rawData = ref(null)
const isCareer = ref(false)

const tr = key => $translate.instant(key)

const careerAvailable = computed(() => !!rawData.value?.career)
watch(careerAvailable, available => {
  if (!available) isCareer.value = false
})

function onStatisticData(data) {
  rawData.value = data || null
}

onMounted(async () => {
  events.on("StatisticData", onStatisticData)
  try {
    await lua.gameplay_statistic.sendGUIState()
  } catch {
    try {
      bridge?.api?.engineLua?.("if gameplay_statistic then gameplay_statistic.sendGUIState() end")
    } catch {
      // ignore
    }
  }
})

function toggleMode() {
  if (!careerAvailable.value) return
  isCareer.value = !isCareer.value
}

const keyRe = /(?<cat>\w+)\/(?<subcat>[\w@]+)\/?(?<name>[\w@]+)?\.?(?<unit>\w+)?#?(?<attribute>[\w;]+)?/

function parseStats(input, careerMode) {
  const out = {}
  if (!input || typeof input !== "object") return out

  for (const fullKey of Object.keys(input)) {
    const m = keyRe.exec(fullKey)
    if (!m?.groups?.cat || !m?.groups?.subcat) continue

    const cat = m.groups.cat
    let subcat = String(m.groups.subcat)
    let name = m.groups.name
    const unit = m.groups.unit ?? ""

    if (!name) {
      name = subcat
      subcat = "0"
    }

    const base = input[fullKey] || {}
    const attribute = m.groups.attribute ? m.groups.attribute.split(";") : []
    const hidden =
      attribute.includes("hideAll") ||
      (careerMode && attribute.includes("hideCareer")) ||
      (!careerMode && attribute.includes("hideGeneral"))
    const cssClasses = attribute
      .filter(a => a.startsWith("cssClass"))
      .map(a => a.slice(8))
      .filter(Boolean)

    const entry = { ...base, unit, attribute, hidden, cssClasses }

    if (!out[cat]) out[cat] = {}
    if (!out[cat][subcat]) out[cat][subcat] = {}
    out[cat][subcat][name] = entry
  }

  return out
}

function translateFirstExisting(keys) {
  for (const k of keys) {
    const v = tr(k)
    if (v !== k) return v
  }
  return null
}

function translateCategory(cat) {
  if (cat === "general") {
    const v = tr("ui.options.general")
    return v !== "ui.options.general" ? v : "general"
  }
  return (
    translateFirstExisting([`ui.dashboard.${cat}s`, `ui.playmodes.${cat}`, `ui.stat.${cat}`]) ||
    cat.replace("_", " ")
  )
}

function translateStat(key, cat, subcat) {
  if (cat === "scenario" && typeof key === "string" && key.startsWith("fg@")) {
    const parts = key.split("@")
    return parts[1] || ""
  }

  const dashboard = `ui.dashboard.${key}s`
  const levelTitle = `levels.${key}.info.title`
  const statKey = `ui.stat.${cat}.${subcat && subcat !== "0" ? `${subcat}.` : ""}${key}`

  const translated = translateFirstExisting([dashboard, levelTitle, statKey])
  if (translated) return translated

  if (cat === "general" && subcat === "mode") return translateCategory(key)
  return String(key).replace("_", " ")
}

function numShort(num, reminder = 0) {
  const units = ["", "K", "M", "B", "T", "Q"]
  const smallunits = ["", "m", "μ", "n", "p", "f"]
  if (!num) return "0"
  if (Number.isNaN(parseFloat(num)) || !Number.isFinite(num)) return "n/a"
  let power = Math.floor(Math.log(Math.abs(num)) / Math.log(1000))
  if (power >= units.length) power = units.length - 1
  const prefix = power < 0 ? smallunits[Math.abs(power)] : units[power]
  return (num / Math.pow(1000, power)).toFixed(reminder).replace(/\.?0+$/, "") + prefix
}

function timeSimple(sec) {
  const div = [
    [24 * 60 * 60e3, "d ", 0, true],
    [60 * 60e3, "h ", 0, true],
    [60e3, "m ", 2],
    [1e3, "s ", 2],
  ]
  const zeros = "000"
  let ms = Math.round(Number(sec) * 1000)
  let res = ""
  let items = 0
  for (const itm of div) {
    let f = ms >= itm[0] ? Math.floor(ms / itm[0]) : 0
    if (itm[3] && f === 0 && !res) continue
    items += 1
    if (items > 2) break
    ms = ~~(ms % itm[0])
    let s = String(f)
    if (itm[2] && res) {
      const len = s.length
      if (itm[2] > len) s = zeros.substring(0, itm[2] - len) + s
    }
    res += s + itm[1]
  }
  return res
}

function formatStatValue(val, unit) {
  if (typeof val === "undefined" || typeof unit === "undefined") return "n/a"

  const num = Number(val)
  const isNum = Number.isFinite(num)
  if (unit === "time" && isNum) return timeSimple(num)

  let numDec = 1
  if (isNum && (num > 1000 || Number.isInteger(num))) numDec = 0

  if (isNum && unit && bridge?.units) {
    try {
      return bridge.units.buildString(unit, num, numDec)
    } catch {
      // fallthrough
    }
  }

  if (isNum && unit && unit.length) return `${num.toFixed(numDec)} ${unit}`
  if (isNum && (!unit || !unit.length)) return numShort(num, 1)
  return String(val)
}

const processedStats = computed(() => {
  const data = rawData.value
  const input = isCareer.value ? data?.career : data?.general
  return parseStats(input, isCareer.value)
})

const categories = computed(() => {
  const keys = Object.keys(processedStats.value || {})
  keys.sort((a, b) => {
    if (a === "general" && b !== "general") return -1
    if (b === "general" && a !== "general") return 1
    return a.localeCompare(b)
  })
  return keys
})

const cards = computed(() => {
  const data = processedStats.value
  return categories.value
    .map(cat => {
      const subcats = data[cat] || {}
      const sections = Object.keys(subcats)
        .map(subcat => {
          const entries = subcats[subcat] || {}
          const stats = Object.entries(entries)
            .filter(([, v]) => !v?.hidden)
            .map(([statKey, v]) => ({
              key: statKey,
              label: translateStat(statKey, cat, String(subcat)),
              valueText: formatStatValue(v?.value, v?.unit),
              cssClasses: v?.cssClasses || [],
            }))
          return {
            key: String(subcat),
            showHeader: String(subcat) !== "0",
            title: translateStat(String(subcat), cat),
            stats,
          }
        })
        .filter(s => s.stats.length > 0)

      return {
        key: cat,
        title: translateCategory(cat),
        sections,
      }
    })
    .filter(card => card.sections.length > 0)
})
</script>

<style scoped lang="scss">
.stats-tracker-ignore {
  display: none;
}

.cards-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  min-width: 32em;
  min-height: 10em;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0.5em;
  box-sizing: border-box;
  gap: 0.5em;
  max-width: 100%;
  max-height: 100%;
  & > .stats-card {
    flex: 1 0 29%;
    max-width: min(48em, 34%);
  }
}
</style>

