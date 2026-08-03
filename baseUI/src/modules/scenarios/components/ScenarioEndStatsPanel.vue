<template>
  <div
    class="scenario-end-stats fade-in"
    v-bng-scoped-nav="{ scopeId: 'scenario-end-stats', type: 'container' }"
  >
    <div class="panel stats-panel">
      <div class="stats-list">
        <div
          v-for="(stat, index) in stats"
          :key="index"
          class="stat-row"
        >
          <div class="stat-label">{{ $tt(stat.label) }}</div>
          <div class="stat-bar-wrap">
            <div
              class="stat-bar"
              :class="statClass(stat)"
            >
              <div class="stat-bar-frame"></div>
              <div
                class="stat-bar-fill-wrap"
                :style="{ width: barWidth(stat) + '%' }"
              >
                <div class="stat-bar-fill slide-in"></div>
              </div>
            </div>
          </div>
          <ScenarioEndPoints
            class="stat-points"
            :points="stat.points"
            :max-points="stat.maxPoints"
          />
        </div>
      </div>
    </div>

    <div
      v-if="medalInfo && medalInfo.img"
      class="medal-panel panel fade-in"
    >
      <img class="medal-img medal" :src="medalInfo.img" alt="medal" />
      <ScenarioEndPoints
        class="medal-points medal"
        :points="overall && overall.points"
        :max-points="overall && overall.maxPoints"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngScopedNav } from "@/common/directives"
import ScenarioEndPoints from "./ScenarioEndPoints.vue"

const props = defineProps({
  stats: { type: Array, default: () => [] },
  overall: { type: Object, default: () => ({}) },
  medalInfo: { type: Object, default: () => null },
})

function statClass(stat) {
  if (stat.failed === undefined) return "neutral"
  return stat.failed ? "fail" : "success"
}

function barWidth(stat) {
  if (stat.relativePoints !== undefined) return Math.max(0, Math.min(100, stat.relativePoints))
  return stat.failed ? 0 : 100
}

const overall = computed(() => props.overall || {})
</script>

<style lang="scss" scoped>
.scenario-end-stats {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  align-items: stretch;
  gap: 1rem;
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  box-sizing: border-box;
}

.stats-panel {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.stats-list {
  font-family: "Overpass", var(--fnt-defs);
  width: 100%;
}

.stat-row {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  gap: 0.5rem;
}

.stat-label {
  flex-basis: 20%;
}

.stat-bar-wrap {
  flex-grow: 1;
  padding: 0.3rem;
}

.stat-bar {
  height: 18px;
  width: 100%;
  position: relative;
  overflow: hidden;

  &.success { color: rgb(0, 200, 0); }
  &.neutral { color: orange; }
  &.fail { color: rgb(200, 0, 0); }
}

.stat-bar-frame {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  box-sizing: border-box;
  border: solid 1px currentColor;
}

.stat-bar-fill-wrap {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
}

.stat-bar-fill {
  background-color: currentColor;
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
}

.stat-points {
  min-width: 90px;
}

.medal-panel {
  flex: 0 0 calc(40% - 1rem);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.medal-img {
  width: 80%;
  padding: 0 10%;
  align-self: center;
}

.medal-points {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  opacity: 0;
  animation: fadeIn linear 0.3s forwards;
}

@keyframes slideIn {
  from { left: -100%; }
  to { left: 0; }
}

.slide-in {
  left: -100%;
  animation: slideIn linear 2s forwards;
  animation-delay: 1.5s;
}

@keyframes medal {
  0% { opacity: 1; transform: scale(1.9); }
  20% { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.medal {
  opacity: 0;
  transform: scale(1);
  animation: medal 2s ease 0s forwards;
  animation-delay: 3.5s;
}
</style>
