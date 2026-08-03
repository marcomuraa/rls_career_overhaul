<template>
  <div
    class="quickrace-leaderboard panel fade-in"
    v-bng-scoped-nav="{ scopeId: 'scenario-quickrace-end-leaderboard', type: 'container' }"
  >
    <BngSelect
      class="leaderboard-select"
      :model-value="viewDetailed"
      :options="modeOptions"
      :config="selectConfig"
      loop
      @update:model-value="onModeChange"
    />
    <div class="leaderboard-scroll">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-place">#</th>
            <th class="col-name">Name</th>
            <th class="col-time">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(record, index) in rows"
            :key="index"
            class="leaderboard-row"
            :class="{ 'is-current': record.current }"
            tabindex="0"
            bng-scoped-nav-focusable
            @mouseover="onSelect(index)"
            @focus="onSelect(index)"
          >
            <td :class="{ currentRecord: record.current }" class="col-place">{{ record.place }}</td>
            <td :class="{ currentRecord: record.current }" class="col-name">{{ record.playerName }}</td>
            <td :class="{ currentRecord: record.current }" class="col-time">{{ record.formattedTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { BngSelect } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { LEADERBOARD_MODE } from "../composables/useQuickraceEndData"

defineProps({
  rows: { type: Array, default: () => [] },
  viewDetailed: { type: Number, default: LEADERBOARD_MODE.TOTAL },
})

const emit = defineEmits(["update:viewDetailed", "select-record"])

const modeOptions = [
  { l: "Total Time", v: LEADERBOARD_MODE.TOTAL },
  { l: "Single Lap", v: LEADERBOARD_MODE.SINGLE_LAP },
]

const selectConfig = {
  label: x => x.l,
  value: x => x.v,
}

function onModeChange(next) {
  emit("update:viewDetailed", next)
}

function onSelect(index) {
  emit("select-record", index)
}
</script>

<style lang="scss" scoped>
.quickrace-leaderboard {
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
  text-transform: uppercase;
  font-family: "Overpass", var(--fnt-defs);
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
}

.leaderboard-select {
  flex-shrink: 0;
}

.leaderboard-scroll {
  overflow-y: scroll;
  height: 100%;
  width: 100%;
}

.leaderboard-table {
  width: 100%;

  th,
  td {
    padding: 0.25rem;
  }

  .col-place { text-align: left; }
  .col-name { text-align: left; }
  .col-time { text-align: right; }
}

.leaderboard-row {
  cursor: pointer;

  &:focus {
    outline: solid 2px orange;
  }

  &:hover {
    color: orange;
  }
}

@keyframes currentR {
  0% {
    background-color: rgba(200, 200, 200, 0.5);
  }
  33% {
    background-color: rgba(200, 200, 200, 0.5);
  }
  100% {
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.currentRecord {
  background-color: rgba(200, 200, 200, 0.5);
  animation: currentR 3s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  opacity: 0;
  animation: fadeIn linear 0.3s forwards;
}
</style>
