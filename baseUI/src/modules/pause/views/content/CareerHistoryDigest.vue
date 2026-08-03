<template>
  <section class="career-history-digest no-hover no-focus-frame" :class="{ 'is-full': full }" bng-no-nav="true" tabindex="-1">
    <template v-if="full">
      <div class="history-info">
        <template v-if="isGameplayHistory">
          <p>{{ $t("ui.pause.career.gameplayHistoryIntro") }}</p>
          <ul>
            <li><DynamicComponent translate-id="ui.pause.career.gameplayHistoryMoney" bbcode /></li>
            <li><DynamicComponent translate-id="ui.pause.career.gameplayHistoryProgressionXp" bbcode /></li>
            <li><DynamicComponent translate-id="ui.pause.career.gameplayHistoryBonusStars" bbcode /></li>
          </ul>
        </template>
        <template v-else>
          <p>{{ $t("ui.pause.career.financialHistoryIntro") }}</p>
          <ul>
            <li><DynamicComponent translate-id="ui.pause.career.financialHistoryEarnMoney" bbcode /></li>
            <li><DynamicComponent translate-id="ui.pause.career.financialHistorySpendMoney" bbcode /></li>
          </ul>
          <p class="history-info-disclaimer">{{ $t("ui.pause.career.financialHistoryDisclaimer") }}</p>
        </template>
      </div>

      <BngList
        v-if="full && historyEntries.length"
        class="history-list"
        :layout="LIST_LAYOUTS.LIST"
        :tile-height="2.75"
        :tile-margin="0.25"
        no-background
        nav-scroll-enabled
      >
        <div
          v-for="(entry, index) in historyEntries"
          :key="`${entry.time}-${index}`"
          class="history-row"
          tabindex="0"
          bng-nav-item
          bng-no-child-nav="true"
          v-bng-popover:right="getRewardPopoverName(entry, index)"
        >
          <div class="history-change">
            <div class="history-reason">{{ $ctx_t(entry.reason) }}</div>
            <RewardsPills class="history-reward" :rewards="entry.rewards" />
          </div>
          <div class="history-time" v-bng-relative-time="entry.time"></div>
        </div>
      </BngList>

      <div v-else-if="historyEntries.length" class="history-rows">
        <div
          v-for="(entry, index) in historyEntries"
          :key="`${entry.time}-${index}`"
          class="history-row"
          tabindex="0"
          bng-nav-item
          bng-no-child-nav="true"
          v-bng-popover:right="getRewardPopoverName(entry, index)"
        >
          <div class="history-change">
            <div class="history-reason">{{ $ctx_t(entry.reason) }}</div>
            <RewardsPills class="history-reward" :rewards="entry.rewards" />
          </div>
          <div class="history-time" v-bng-relative-time="entry.time"></div>
        </div>
      </div>
      <div v-else class="history-empty">
        {{ $t(emptyKey) }}
      </div>

      <BngPopoverContent
        v-for="(entry, index) in historyEntries"
        :key="`popover-${entry.time}-${index}`"
        :name="getRewardPopoverName(entry, index)"
        placement="right"
      >
        <div class="history-rewards-popover">
          <div v-for="(reward, rewardIndex) in entry.rewards" :key="`${reward.attributeKey}-${rewardIndex}`" class="history-reward-popover-row">
            <BngIcon class="history-reward-popover-icon" :type="getRewardIcon(reward)" />
            <span>{{ $ctx_t(reward.displayName || reward.attributeKey) }}</span>
          </div>
        </div>
      </BngPopoverContent>
    </template>

    <div v-else class="history-panel no-hover no-focus-frame" bng-no-nav="true" tabindex="-1">
      <BngCardHeading type="ribbon" class="history-heading">
        {{ $t(titleKey) }}
      </BngCardHeading>

      <div v-if="historyEntries.length" class="history-rows">
        <div
          v-for="(entry, index) in historyEntries"
          :key="`${entry.time}-${index}`"
          class="history-row"
          tabindex="0"
          bng-nav-item
          bng-no-child-nav="true"
          v-bng-popover:right="getRewardPopoverName(entry, index)"
        >
          <div class="history-change">
            <div class="history-reason">{{ $ctx_t(entry.reason) }}</div>
            <RewardsPills class="history-reward" :rewards="entry.rewards" />
          </div>
          <div class="history-time" v-bng-relative-time="entry.time"></div>
        </div>
      </div>
      <div v-else class="history-empty">
        {{ $t(emptyKey) }}
      </div>

      <BngPopoverContent
        v-for="(entry, index) in historyEntries"
        :key="`popover-${entry.time}-${index}`"
        :name="getRewardPopoverName(entry, index)"
        placement="right"
      >
        <div class="history-rewards-popover">
          <div v-for="(reward, rewardIndex) in entry.rewards" :key="`${reward.attributeKey}-${rewardIndex}`" class="history-reward-popover-row">
            <BngIcon class="history-reward-popover-icon" :type="getRewardIcon(reward)" />
            <span>{{ $ctx_t(reward.displayName || reward.attributeKey) }}</span>
          </div>
        </div>
      </BngPopoverContent>

    </div>
  </section>
</template>

<script setup>
import { computed } from "vue"
import { BngCardHeading, BngIcon, BngList, BngPopoverContent, LIST_LAYOUTS, icons } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngPopover, vBngRelativeTime } from "@/common/directives"
import RewardsPills from "@/modules/career/components/progress/RewardsPills.vue"

defineOptions({ name: "CareerHistoryDigest" })

const props = defineProps({
  historyType: {
    type: String,
    default: "financial",
  },
  entries: {
    type: Array,
    default: () => [],
  },
  full: Boolean,
})

const historyEntries = computed(() => Array.isArray(props.entries) ? props.entries : [])
const isGameplayHistory = computed(() => props.historyType === "gameplay")
const titleKey = computed(() => {
  if (props.full) return isGameplayHistory.value ? "ui.pause.career.gameplayHistory" : "ui.pause.career.financialHistory"
  return isGameplayHistory.value ? "ui.pause.career.recentGameplayRewards" : "ui.pause.career.recentFinancialChanges"
})
const emptyKey = computed(() => isGameplayHistory.value ? "ui.pause.career.noGameplayRewards" : "ui.pause.career.noFinancialChanges")
const rewardIconByAttribute = {
  money: icons.beamCurrency,
  beamXP: icons.beamXPFull,
  vouchers: icons.voucherOutline,
  reputation: icons.peopleOutline,
}

function getRewardPopoverName(entry, index) {
  return `career-history-rewards-${props.historyType}-${entry?.time || "entry"}-${index}`
}

function getRewardIcon(reward) {
  if (reward?.icon && icons[reward.icon]) return icons[reward.icon]
  if (reward?.attributeKey && rewardIconByAttribute[reward.attributeKey]) return rewardIconByAttribute[reward.attributeKey]
  return icons.info
}
</script>

<style lang="scss" scoped>
.career-history-digest {
  --history-time-column-width: 8rem;

  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--bng-off-white);
  --pause-rail-button-label-opacity: 1;
  --pause-rail-button-gap: 0.5em;
  --bng-button-margin: 0;
  margin: 0 0.5rem ;

  &:focus,
  &.focus-visible {
    outline: none;
  }
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: 0.5rem;

  &:focus,
  &.focus-visible {
    outline: none;
  }
}

.history-heading {
  margin: 0;
  margin-top: 0.5rem;
  margin-left: -0.5rem;
}

.history-info {
  padding: 0.5rem;
  color: rgba(var(--bng-off-white-rgb), 0.85);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.35);
  border-radius: var(--bng-corners-1);

  :deep(b),
  :deep(strong) {
    color: var(--bng-orange-300);
  }

  p {
    margin: 0 0 0.5rem 0;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  li + li {
    margin-top: 0.25rem;
  }
}

.history-info-disclaimer {
  padding-top: 0.5rem;
  font-style: italic;

}

.history-rows {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.history-list {
  flex: 1 1 auto;
  min-height: 12rem;
  height: 100%;

  :deep(.list-container),
  :deep(.list-content) {
    flex: 1 1 auto;
    min-height: 0;
  }

  :deep(.list-items) {
    width: 100%;
    max-width: 100%;
  }

  :deep(.list-items > *) {
    width: 100% !important;
  }
}

.history-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--history-time-column-width);
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.55);
  border-radius: var(--bng-corners-1);


  &:focus,
  &.focus-visible,
  &:hover {
    background-color: rgba(var(--bng-cool-gray-700-rgb), 0.7);
  }

  &:focus,
  &.focus-visible {
    outline: 0.125rem solid var(--bng-orange-500);
    outline-offset: 0.0;
    box-shadow: 0 0 0 0.0625rem rgba(var(--bng-off-white-rgb), 0.45);
  }

  &.focus-visible::before {
    display: none !important;
  }
}

.history-reason {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.history-reward {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem 0;
}

.history-time,
.history-empty {
  color: rgba(var(--bng-off-white-rgb), 0.75);
  font-size: 0.9rem;
}

.history-rewards-popover {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 12rem;
  color: var(--bng-off-white);
}

.history-reward-popover-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-reward-popover-icon {
  flex: 0 0 auto;
  width: 1.25rem;
  height: 1.25rem;
  margin-bottom: 0.25rem;
}

.is-full {
  flex: 1 1 auto;
  min-height: 0;

  .history-list {
    flex: 1 1 auto;
    min-height: 0;
  }
}
</style>
