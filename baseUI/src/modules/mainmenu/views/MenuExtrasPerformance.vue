<template>
  <div class="menu-extras-performance">
    <section v-if="hwinfo?.sailingTheHighSeas" class="performance-section high-seas-section">
      <div class="section-heading">
        <span class="status-dot warn"></span>
        <h3>{{ $tt("ui.performance.warnings.highseas") }}</h3>
      </div>
      <div class="high-seas-content">
        <div class="high-seas-icon">!</div>
        <div class="section-text">
          <template v-for="(part, index) in translateParts('ui.performance.highsea.txt')" :key="`high-seas-${index}`">
            <br v-if="part.type === 'br'" />
            <span v-else>{{ part.text }}</span>
          </template>
          <div v-if="!isSimplemenu" class="section-actions">
            <BngButton
              v-for="warning in warningsFor(hwinfo.hs)"
              :key="warning.msg"
              :accent="warning.ack ? ACCENTS.secondary : ACCENTS.attention"
              :disabled="warning.ack"
              @click="acknowledgeWarning(warning)"
            >
              {{ warning.ack ? $tt("ui.performance.acknowledged") : $tt("ui.performance.highsea.okay") }}
            </BngButton>
          </div>
        </div>
      </div>
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.cpu?.state)"></span>
        <h3>{{ $tt("ui.performance.cpu") }}</h3>
      </div>
      <InfoRow :label="$tt('ui.performance.current')" :value="hwinfo?.cpu?.name" />
      <InfoRow :label="$tt('ui.performance.minRequired')" value="AMD Ryzen 5 1600 | Intel Core i5 8400" />
      <InfoRow :label="$tt('ui.performance.recommended')" value="AMD Ryzen 7 3700X | Intel Core i7 9700" />
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.cpu)"
        :key="`cpu-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
      <div v-if="showSystemActions" class="section-actions">
        <BngButton :accent="ACCENTS.secondary" @click="openPerformanceGraph">
          {{ $tt("ui.dashboard.performanceGraph") }}
        </BngButton>
      </div>
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.gpu?.state)"></span>
        <h3>{{ $tt("ui.performance.gpu") }}</h3>
      </div>
      <InfoRow :label="$tt('ui.performance.current')" :value="gpuCurrent" />
      <InfoRow :label="$tt('ui.performance.minRequired')" value="AMD Radeon RX 570 | Nvidia GeForce GTX 1060 6GB" />
      <InfoRow :label="$tt('ui.performance.recommended')" value="AMD RX 6700 | Nvidia GeForce RTX 3060" />
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.gpu)"
        :key="`gpu-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
      <div class="inline-note">
        <strong>{{ $tt("ui.performance.laptopGPU") }}</strong>
        <span>
          <template v-for="(part, index) in translateParts('ui.performance.laptopGPU.msg')" :key="`laptop-gpu-${index}`">
            <br v-if="part.type === 'br'" />
            <span v-else>{{ part.text }}</span>
          </template>
        </span>
      </div>
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.mem?.state)"></span>
        <h3>{{ $tt("ui.performance.ram") }}</h3>
      </div>
      <InfoRow :label="$tt('ui.performance.current')" :value="`${formatBytes(hwinfo?.mem?.osPhysAvailable)} RAM`" />
      <InfoRow :label="$tt('ui.performance.minRequired')" value="16 GB" />
      <InfoRow :label="$tt('ui.performance.recommended')" value="32 GB" />
      <BngSwitch v-model="showDetailsMemory" class="details-switch">
        {{ $tt("ui.common.showDetails") }}
      </BngSwitch>
      <div v-if="showDetailsMemory && hasMemoryDetails" class="details-block">
        <MemoryUsageRow
          :label="$tt('ui.performance.ram.physical')"
          :process-used="hwinfo.mem.processPhysUsed"
          :os-used="hwinfo.mem.osPhysUsed"
          :available="hwinfo.mem.osPhysAvailable"
          :process-percent="hwinfo.mem.processPhysUsedPercent"
          :os-percent="hwinfo.mem.osPhysUsedPercent"
        />
        <MemoryUsageRow
          :label="$tt('ui.performance.ram.virtual')"
          :process-used="hwinfo.mem.processVirtUsed"
          :os-used="hwinfo.mem.osVirtUsed"
          :available="hwinfo.mem.osVirtAvailable"
          :process-percent="hwinfo.mem.processVirtUsedPercent"
          :os-percent="hwinfo.mem.osVirtUsedPercent"
        />
      </div>
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.mem)"
        :key="`mem-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="benchmarkStatusClass"></span>
        <h3>{{ $tt("ui.performance.benchmark") }}</h3>
      </div>
      <template v-if="benchmarkTest">
        <InfoRow :label="$tt('ui.performance.score')" :value="`${formatNumber(benchmarkTest.maxMbeams, 3)} MBeams/s`" />
        <InfoRow :label="$tt('ui.performance.maxRealtimeVehicles')" :value="formatNumber(benchmarkTest.maxRealtimeVehicles, 0)" />
        <BngSwitch v-model="showDetailsBananabench" class="details-switch">
          {{ $tt("ui.common.showDetails") }}
        </BngSwitch>
        <div v-if="showDetailsBananabench" class="details-block">
          <InfoRow :label="$tt('ui.performance.benchmark.testVehicle')" :value="benchmarkVehicle" />
          <div class="benchmark-table-wrap">
            <table class="benchmark-table">
              <tbody>
                <tr>
                  <th>{{ $tt("ui.performance.benchmark.vehicles") }}</th>
                  <td v-for="(test, index) in benchmarkTests" :key="`vehicle-${index}`">{{ index + 1 }}</td>
                </tr>
                <tr>
                  <th>MBeams/s</th>
                  <td v-for="(test, index) in benchmarkTests" :key="`mbeams-${index}`">
                    {{ formatNumber(test?.res?.Mbeamspersec, 1) }}
                  </td>
                </tr>
                <tr>
                  <th>% {{ $tt("ui.performance.benchmark.realtime") }}</th>
                  <td v-for="(test, index) in benchmarkTests" :key="`realtime-${index}`">
                    {{ formatNumber(test?.res?.percentRealtime, 0) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <div class="section-actions">
        <BngButton v-if="showSystemActions && !bananabenchRunning" :accent="ACCENTS.main" @click="runPhysicsBenchmark">
          {{ $tt("ui.performance.benchmark.run") }}
        </BngButton>
        <div v-else-if="bananabenchRunning" class="running-note">
          <template v-for="(part, index) in translateParts('ui.performance.benchmark.isRunningNote')" :key="`benchmark-running-${index}`">
            <br v-if="part.type === 'br'" />
            <span v-else>{{ part.text }}</span>
          </template>
        </div>
      </div>
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.os?.state)"></span>
        <h3>{{ $tt("ui.performance.os") }}</h3>
      </div>
      <InfoRow :label="$tt('ui.performance.current')" :value="osCurrent" />
      <InfoRow v-if="hwinfo?.os?.type === 'windows'" :label="$tt('ui.performance.minRequired')" value="Windows 10 64-bit" />
      <InfoRow v-else-if="hwinfo?.os?.type === 'linux'" :label="$tt('ui.performance.minRequired')" value="Steam Runtime, Ubuntu 22.04 LTS 64-bit" />
      <InfoRow
        v-if="hwinfo?.os?.type === 'linux'"
        :label="$tt('ui.performance.linux.windowingSystem')"
        :value="hwinfo?.os?.windowsystem"
      />
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.os)"
        :key="`os-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.mods?.state)"></span>
        <h3>{{ $tt("ui.performance.mods.title") }}</h3>
      </div>
      <InfoRow :label="$tt('ui.performance.current')" :value="modsStat(hwinfo?.mods?.zip, hwinfo?.mods?.unpacked)" />
      <InfoRow :label="$tt('ui.performance.optimal')" :value="modsLimit(100, 10)" />
      <InfoRow :label="$tt('ui.performance.recommended')" :value="modsLimit(200, 20)" />
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.mods)"
        :key="`mods-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
    </section>

    <section class="performance-section">
      <div class="section-heading">
        <span class="status-dot" :class="statusClass(hwinfo?.disk?.state)"></span>
        <h3>{{ $tt("ui.performance.disk") }}</h3>
      </div>
      <DiskUsageRow
        :label="$tt('ui.performance.userpath')"
        :usage="diskUsage.userpath"
        :free="hwinfo?.disk?.freeSpace?.user"
        :case-sensitivity="hwinfo?.disk?.caseSensiUser"
        :show-case-sensitivity="!!hwinfo?.os?.type && hwinfo.os.type !== 'windows'"
      />
      <DiskUsageRow
        :label="$tt('ui.performance.rootpath')"
        :usage="diskUsage.rootpath"
        :free="hwinfo?.disk?.freeSpace?.root"
        :case-sensitivity="hwinfo?.disk?.caseSensiGame"
        :show-case-sensitivity="!!hwinfo?.os?.type && hwinfo.os.type !== 'windows'"
      />
      <WarningRow
        v-for="warning in warningsFor(hwinfo?.disk)"
        :key="`disk-${warning.msg}`"
        :warning="warning"
        :hide-action="isSimplemenu"
        @acknowledge="acknowledgeWarning"
      />
      <div v-if="showSystemActions" class="section-actions">
        <BngButton :accent="ACCENTS.secondary" :disabled="diskUsageRunning" @click="runDiskUsage">
          {{ $tt("ui.performance.disk.run") }}
        </BngButton>
        <BngButton :accent="ACCENTS.secondary" @click="openUserFolder">
          {{ $tt("ui.performance.openUserFolder") }}
        </BngButton>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, inject, onMounted, onUnmounted, reactive, ref } from "vue"
import { BngButton, BngSwitch, ACCENTS } from "@/common/components/base"
import { lua, useBridge } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"
import { $translate } from "@/services"

defineOptions({ name: "MenuExtrasPerformance" })

const { events } = useBridge()
const $simplemenu = inject("$simplemenu", ref(false))
const hwinfo = ref(null)
const bananabench = ref(null)
const bananabenchRunning = ref(false)
const showDetailsMemory = ref(false)
const showDetailsBananabench = ref(false)
const diskUsage = reactive({})
let hardwareInfoInterval = null

const URL_PATTERN = /\[url=([^\]]+)]([\s\S]*?)\[\/url]/gi
const LINE_BREAK_PATTERN = /\[br\]/gi
const BYTE_UNITS = Object.freeze(["B", "KB", "MB", "GB", "TB", "PB"])

const gpuCurrent = computed(() => {
  const gpu = hwinfo.value?.gpu
  if (!gpu) return unknown()
  const memory = Number.isFinite(Number(gpu.memoryMB)) ? `, ${gpu.memoryMB} MB VRAM` : ""
  return `${gpu.name || unknown()}${memory}`
})

const osCurrent = computed(() => {
  const os = hwinfo.value?.os
  if (!os) return unknown()
  if (os.type === "windows") return `${os.shortname || unknown()} ${os.bits || ""}bits`.trim()
  return `${os.shortname || unknown()}, ${os.fullname || unknown()} ${os.bits || ""}bits`.trim()
})

const hasMemoryDetails = computed(() => !!hwinfo.value?.mem?.processPhysUsedPercent)

const benchmarkVehicle = computed(() => Object.keys(bananabench.value?.tests || {})[0] || "")
const benchmarkTest = computed(() => benchmarkVehicle.value ? bananabench.value.tests[benchmarkVehicle.value] : null)
const benchmarkTests = computed(() => {
  const tests = benchmarkTest.value?.tests
  if (!tests) return []
  return Array.isArray(tests) ? tests : Object.values(tests)
})
const benchmarkStatusClass = computed(() => {
  const maxRealtimeVehicles = Number(benchmarkTest.value?.maxRealtimeVehicles)
  if (!Number.isFinite(maxRealtimeVehicles)) return "unknown"
  if (maxRealtimeVehicles >= 4) return "ok"
  if (maxRealtimeVehicles >= 3) return "warn"
  return "error"
})
const diskUsageRunning = computed(() => !!diskUsage.userpath?.running || !!diskUsage.rootpath?.running)
const isSimplemenu = computed(() => !!$simplemenu.value)
const showSystemActions = computed(() => !isSimplemenu.value)

onMounted(() => {
  events.on("HardwareInfo", onHardwareInfo)
  events.on("BananaBenchReady", onBananaBenchReady)
  events.on("diskInfoCallback", onDiskInfoCallback)

  requestHardwareInfo()
  requestLatestBenchmark()
  hardwareInfoInterval = window.setInterval(requestHardwareInfo, 5000)
})

onUnmounted(() => {
  events.off("HardwareInfo", onHardwareInfo)
  events.off("BananaBenchReady", onBananaBenchReady)
  events.off("diskInfoCallback", onDiskInfoCallback)
  if (hardwareInfoInterval) {
    window.clearInterval(hardwareInfoInterval)
    hardwareInfoInterval = null
  }
})

function requestHardwareInfo() {
  lua.core_hardwareinfo.requestInfo()
}

async function requestLatestBenchmark() {
  if (await lua.core_hardwareinfo.latestBenchmarkExists()) {
    bananabench.value = await lua.core_hardwareinfo.latestBananbench()
  }
}

function onHardwareInfo(data) {
  hwinfo.value = data
  syncDiskUsage(data?.disk?.usage)
}

function onBananaBenchReady(data) {
  console.log(data)
  bananabenchRunning.value = false
  bananabench.value = data
}

function onDiskInfoCallback(data) {
  if (!data?.name) return
  diskUsage[data.name] = {
    running: !!data.running,
    size: data.size,
  }
}

function syncDiskUsage(usage) {
  if (!usage) return
  const entries = Array.isArray(usage) ? usage : Object.values(usage)
  entries.forEach(entry => {
    if (entry?.name) onDiskInfoCallback(entry)
  })
}

function acknowledgeWarning(warning) {
  if (!warning?.msg || warning.ack) return
  lua.core_hardwareinfo.acknowledgeWarning(warning.msg)
}

function runPhysicsBenchmark() {
  bananabenchRunning.value = true
  lua.core_hardwareinfo.runPhysicsBenchmark()
}

function openPerformanceGraph() {
  runRaw("togglePerformanceGraph()", false)
}

function runDiskUsage() {
  lua.core_hardwareinfo.runDiskUsage()
}

function openUserFolder() {
  runRaw('log("I", "MenuExtrasPerformance", "Opening user folder...") Engine.Platform.exploreFolder("")', false)
}

function warningsFor(section) {
  return Array.isArray(section?.warnings) ? section.warnings : []
}

function statusClass(state) {
  if (state === "ok" || state === "warn" || state === "error" || state === "load") return state
  return "unknown"
}

function translateParts(token, context = null) {
  const text = context
    ? $translate.contextTranslate({ txt: token, context })
    : $translate.instant(token)
  return richTextParts(text)
}

function richTextParts(text) {
  const plainUrlText = String(text || "").replace(URL_PATTERN, (_, url, label) => label || url)
  const parts = []
  plainUrlText.split(LINE_BREAK_PATTERN).forEach((segment, index) => {
    if (index > 0) parts.push({ type: "br" })
    if (segment) parts.push({ type: "text", text: segment })
  })
  return parts
}

function warningParts(warning) {
  if (!warning?.msg) return []
  return translateParts(`ui.performance.warnings.${warning.msg}`, warning.context)
}

function unknown() {
  return $translate.instant("ui.common.unknown")
}

function formatBytes(bytes, precision = 1) {
  const value = Number(bytes)
  if (!Number.isFinite(value)) return unknown()
  if (value <= 0) return "0 B"

  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), BYTE_UNITS.length - 1)
  const decimals = unitIndex === 0 ? 0 : precision
  return `${(value / Math.pow(1024, unitIndex)).toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`
}

function formatNumber(value, precision = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return unknown()
  return number.toFixed(precision)
}

function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, number * 100))
}

function modsStat(zip, unpacked) {
  return $translate.instant("ui.performance.mods.stat", {
    zip: Number.isFinite(Number(zip)) ? zip : 0,
    unpacked: Number.isFinite(Number(unpacked)) ? unpacked : 0,
  })
}

function modsLimit(zip, unpacked) {
  return $translate.instant("ui.performance.mods.lt", { zip, unpacked })
}

function caseSensitivityLabel(value) {
  const sensitivity = Number(value)
  if (sensitivity === 1) return $translate.instant("ui.performance.disk.casesensitive")
  if (sensitivity === 0) return $translate.instant("ui.performance.disk.caseinsensitive")
  return unknown()
}

const InfoRow = defineComponent({
  name: "InfoRow",
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: "" },
  },
  setup(props) {
    return () => h("div", { class: "info-row" }, [
      h("div", { class: "info-label" }, props.label),
      h("div", { class: "info-value" }, props.value || unknown()),
    ])
  },
})

const WarningRow = defineComponent({
  name: "PerformanceWarningRow",
  props: {
    warning: { type: Object, required: true },
    hideAction: Boolean,
  },
  emits: ["acknowledge"],
  setup(props, { emit }) {
    return () => h("div", { class: ["warning-row", statusClass(props.warning.type)] }, [
      h("div", { class: "warning-message" }, [
        h("strong", `${$translate.instant(`ui.common.${props.warning.type}`)}: `),
        ...warningParts(props.warning).map((part, index) => part.type === "br"
          ? h("br", { key: `br-${index}` })
          : h("span", { key: `text-${index}` }, part.text)
        ),
      ]),
      props.hideAction ? null : h(BngButton, {
        accent: props.warning.ack ? ACCENTS.secondary : ACCENTS.attention,
        disabled: props.warning.ack,
        onClick: () => emit("acknowledge", props.warning),
      }, () => props.warning.ack
        ? $translate.instant("ui.performance.acknowledged")
        : $translate.instant("ui.performance.acknowledge")
      ),
    ])
  },
})

const MemoryUsageRow = defineComponent({
  name: "MemoryUsageRow",
  props: {
    label: { type: String, required: true },
    processUsed: Number,
    osUsed: Number,
    available: Number,
    processPercent: Number,
    osPercent: Number,
  },
  setup(props) {
    return () => h("div", { class: "usage-row" }, [
      h("div", { class: "usage-label" }, `${props.label}: ${formatBytes(props.processUsed)} / ${formatBytes(props.osUsed)} of ${formatBytes(props.available)}`),
      h("div", { class: "usage-bar" }, [
        h("span", {
          class: "usage-fill os",
          style: { width: `${formatPercent(props.osPercent)}%` },
        }),
        h("span", {
          class: "usage-fill process",
          style: { width: `${formatPercent(props.processPercent)}%` },
        }),
      ]),
    ])
  },
})

const DiskUsageRow = defineComponent({
  name: "DiskUsageRow",
  props: {
    label: { type: String, required: true },
    usage: Object,
    free: Number,
    caseSensitivity: [Number, String],
    showCaseSensitivity: Boolean,
  },
  setup(props) {
    return () => h("div", { class: "info-row disk-row" }, [
      h("div", { class: "info-label" }, props.label),
      h("div", { class: "info-value disk-value" }, [
        props.showCaseSensitivity
          ? h("span", { class: ["case-sensitivity", Number(props.caseSensitivity) === 1 ? "warn" : Number(props.caseSensitivity) === 0 ? "ok" : "error"] }, caseSensitivityLabel(props.caseSensitivity))
          : null,
        h("span", `${$translate.instant("ui.performance.disk.used")}: ${formatBytes(props.usage?.size)}, ${$translate.instant("ui.performance.disk.free")}: ${formatBytes(props.free)}`),
        props.usage?.running ? h("span", { class: "disk-spinner", "aria-hidden": "true" }) : null,
      ]),
    ])
  },
})
</script>

<style lang="scss" scoped>
.menu-extras-performance {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 0 1rem 1rem;
}

.performance-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--bng-corners-2);
  background: rgba(0, 0, 0, 0.18);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;

  h3 {
    padding: 0;
    margin: 0;
    font-size: 1.2rem;
    line-height: 1.2;
  }
}

.status-dot {
  flex: 0 0 auto;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background: rgb(130, 130, 130);

  &.ok {
    background: rgb(139, 195, 74);
  }

  &.warn,
  &.load {
    background: rgb(255, 152, 0);
  }

  &.error {
    background: rgb(211, 47, 47);
  }
}

.info-row {
  display: grid;
  grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr);
  align-items: baseline;
  gap: 0.75rem;
  min-width: 0;
}

.info-label {
  color: rgba(255, 255, 255, 0.72);
  font-weight: 700;
}

.info-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.inline-note,
.high-seas-content {
  display: flex;
  gap: 0.75rem;
}

.inline-note {
  flex-direction: column;
}

.high-seas-icon {
  flex: 0 0 auto;
  color: rgb(255, 100, 0);
  font-size: 5rem;
  line-height: 1;
}

.section-text {
  min-width: 0;
}

.details-switch {
  align-self: flex-start;
}

.details-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--bng-corners-1);
  background: rgba(255, 255, 255, 0.06);
}

.usage-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.usage-label {
  color: rgba(255, 255, 255, 0.86);
}

.usage-bar {
  position: relative;
  height: 0.85rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.usage-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;

  &.os {
    background: rgba(255, 255, 255, 0.32);
  }

  &.process {
    background: var(--bng-orange);
  }
}

.warning-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem;
  border-radius: var(--bng-corners-1);
  background: rgba(255, 152, 0, 0.12);

  &.error {
    background: rgba(211, 47, 47, 0.16);
  }
}

.warning-message {
  min-width: 0;
  overflow-wrap: anywhere;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.running-note {
  color: #db5d5d;
  font-weight: 700;
}

.benchmark-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.benchmark-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.45rem 0.65rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  th {
    color: rgba(255, 255, 255, 0.74);
  }
}

.disk-value {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.case-sensitivity {
  font-weight: 700;

  &.ok {
    color: rgb(139, 195, 74);
  }

  &.warn {
    color: rgb(255, 152, 0);
  }

  &.error {
    color: rgb(211, 47, 47);
  }
}

.disk-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: var(--bng-orange);
  border-radius: 50%;
  animation: disk-spin 0.8s linear infinite;
}

@keyframes disk-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .info-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .warning-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
