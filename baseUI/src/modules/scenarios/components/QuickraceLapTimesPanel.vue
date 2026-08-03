<template>
  <div
    class="quickrace-laps panel fade-in"
    v-bng-scoped-nav="{ scopeId: 'scenario-quickrace-end-laps', type: 'container' }"
  >
    <div class="laps-scroll">
      <table class="laps-table">
        <thead>
          <tr>
            <th class="toggle-cell">
              <BngButton
                class="toggle-btn"
                tabindex="0"
                bng-scoped-nav-focusable
                :title="detailed ? 'Show normal lap times' : 'Show detailed lap times'"
                @click="$emit('toggle-detail')"
                @keydown.enter.space.prevent="$emit('toggle-detail')"
              >
                <BngIcon :type="icons.timer" />
              </BngButton>
            </th>
            <th><b>Lap</b></th>
            <th><b>Duration</b></th>
            <th><b>Vs prev. best</b></th>
            <th><b>Total</b></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
          >
            <td></td>
            <td>{{ row.lap }}</td>
            <td :style="row.durationStyle">{{ row.duration }}</td>
            <td :style="{ color: row.diffColor }">{{ row.diff }}</td>
            <td>{{ row.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { BngIcon, BngButton, icons } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"

defineProps({
  rows: { type: Array, default: () => [] },
  detailed: { type: Boolean, default: false },
})

defineEmits(["toggle-detail"])
</script>

<style lang="scss" scoped>
.quickrace-laps {
  width: calc(60% - 20px);
  height: calc(100% - 20px);
  overflow-y: scroll;
  text-transform: uppercase;
  font-family: "Overpass", var(--fnt-defs);
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
}

.laps-scroll {
  width: 100%;
  overflow-y: auto;
}

.laps-table {
  width: 100%;
  text-align: center;

  thead tr {
    text-align: center;
  }

  th {
    padding: 0.25rem;
  }

  td {
    padding: 0.25rem;
  }
}

.toggle-cell {
  width: 32px;
}

.toggle-btn {
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
