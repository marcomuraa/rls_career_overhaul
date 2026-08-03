<template>
  <div class="rally-info-sections">
    <InfoCard
      v-if="hasBriefing"
      :header="translatedHeader"
      headerType="ribbon"
      class="rally-info"
      :no-blur="noBlur"
    >
      <template #content>
        <div class="text-container blurb" v-if="blurbContent">
          <DynamicComponent :template="blurbContent" />
        </div>

        <ul class="stats" v-if="statItems.length">
          <li v-for="item in statItems" :key="item.label">
            {{ item.label }}: {{ item.value }}
          </li>
        </ul>

        <ul class="stats" v-if="stageItems.length">
          <li v-for="(item, i) in stageItems" :key="i">
            <strong>{{ item.name }}</strong><template v-if="item.detail"> — {{ item.detail }}</template>
          </li>
        </ul>
      </template>
    </InfoCard>

    <InfoCard
      v-if="rules.length"
      :header="$t('missions.missions.rally.startScreen.rulesHeader')"
      headerType="ribbon"
      class="rally-info"
      :no-blur="noBlur"
    >
      <template #content>
        <ul class="rules-list">
          <li v-for="(rule, index) in rules" :key="index">{{ $ctx_t(rule) }}</li>
        </ul>
      </template>
    </InfoCard>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { $translate, $content } from "@/services"
import InfoCard from "../components/InfoCard.vue"
import { DynamicComponent } from "@/common/components/utility"

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
  noBlur: {
    type: Boolean,
    default: false,
  },
  repairEnabled: {
    type: Boolean,
    default: true,
  },
  falseStartsEnabled: {
    type: Boolean,
    default: true,
  },
  earlyPenaltiesEnabled: {
    type: Boolean,
    default: false,
  },
})

// Render a translation value that may be a plain key string or a { txt, context } object.
function renderText(value) {
  if (!value) return ""
  if (typeof value === "string") {
    return $content.bbcode.parse($translate.instant(value))
  }
  return $content.bbcode.parse($translate.contextTranslate(value))
}

const translatedHeader = computed(() => {
  if (!props.panel.header) return null
  return $translate.contextTranslate(props.panel.header)
})

const statItems = computed(() => {
  const s = props.panel.stats
  if (!s) return []
  const items = []
  if (s.specialStageDistance) {
    items.push({
      label: $translate.instant("missions.missions.rally.startScreen.specialStageDistanceLabel"),
      value: s.specialStageDistance,
    })
  }
  if (s.liaisonDistance) {
    items.push({
      label: $translate.instant("missions.missions.rally.startScreen.liaisonDistanceLabel"),
      value: s.liaisonDistance,
    })
  }
  if (s.totalDistance) {
    items.push({
      label: $translate.instant("missions.missions.rally.startScreen.totalDistanceLabel"),
      value: s.totalDistance,
    })
  }
  if (s.distance) {
    items.push({ label: $translate.instant("missions.missions.rally.startScreen.distanceLabel"), value: s.distance })
  }
  const surfaces = (s.surfaces || [])
    .map(surface => `${$translate.instant(surface.label)} ${surface.value}%`)
    .join(", ")
  if (surfaces) {
    items.push({
      label: $translate.instant("missions.missions.rally.startScreen.surfaceLabel"),
      value: surfaces,
    })
  }
  return items
})

// Loops: one entry per member stage, each with its own distance + surfaces.
const stageItems = computed(() => {
  const list = props.panel.stages
  if (!Array.isArray(list)) return []
  return list.map((s) => {
    const parts = []
    if (s.distance) parts.push(s.distance)
    const surf = (s.surfaces || [])
      .map((x) => `${$translate.instant(x.label)} ${x.value}%`)
      .join(", ")
    if (surf) parts.push(surf)
    return { name: $translate.instant(s.label), detail: parts.join(" · ") }
  })
})

const blurbContent = computed(() => renderText(props.panel.blurb))
const rules = computed(() => {
  const result = [
    ...((props.repairEnabled ? props.panel.rulesRepairOn : props.panel.rulesRepairOff)
      || props.panel.rules
      || [])
  ]
  const falseStartRule = props.falseStartsEnabled
    ? props.panel.falseStartsRuleOn
    : props.panel.falseStartsRuleOff
  const earlyPenaltyRule = props.earlyPenaltiesEnabled
    ? props.panel.earlyPenaltiesRuleOn
    : props.panel.earlyPenaltiesRuleOff
  if (falseStartRule) result.push(falseStartRule)
  if (earlyPenaltyRule) result.push(earlyPenaltyRule)
  if (props.panel.ngrcRule) result.push(props.panel.ngrcRule)
  return result
})
const hasBriefing = computed(
  () => !!blurbContent.value || statItems.value.length > 0 || stageItems.value.length > 0
)
</script>

<style scoped lang="scss">
.rally-info-sections {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rally-info {
  // Use the standard InfoCard content padding; lay the sections out in a column.
  :deep(.info-content) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    :first-child {
      margin-top: 0;
    }
  }

  .text-container {
    text-align: justify;
  }

  .stats,
  .rules-list {
    margin: 0;
    padding-left: 1.25rem;
    list-style: disc;

    li {
      margin: 0.1rem 0;
    }
  }
}
</style>
