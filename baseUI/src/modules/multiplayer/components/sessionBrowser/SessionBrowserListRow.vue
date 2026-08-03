<template>
  <div
    class="sb-list-row"
    :class="[`is-${state}`, { 'is-compact-recent': isCompactRecent, 'is-actionable': actionable }]"
    role="button"
    tabindex="0"
    bng-nav-item
    v-bng-sound-class="actionable && 'bng_click_hover_generic'"
    @click="onActivate"
    @keydown.enter.prevent="onActivate"
    @keydown.space.prevent="onActivate"
  >
    <div class="sb-list-row-content">
      <div class="sb-list-preview-pane">
        <div v-if="preview && preview !== ''" class="sb-list-preview-image" :style="previewStyle" aria-hidden="true" />
        <template v-else>
          <BngIcon
            class="sb-list-preview-image-fallback"
            :type="state == 'unavailable' ? icons.globeSimpleNotSign :  icons.globeSimplified"
          />
        </template>
      </div>

      <div class="sb-list-text-pane">
        <div class="sb-list-main-col">
          <span class="sb-list-title">{{ name }}</span>

          <template v-if="!isCompactRecent">
            <span class="sb-list-meta-item">{{ level }}</span>
          </template>
        </div>
        <span v-if="!isCompactRecent" class="sb-list-meta-item sb-list-meta-item--players">
          <span>{{ players }}</span>
          <span v-if="state === 'live'" class="sb-list-live-dot" aria-label="Live session" />
        </span>
        <span v-if="isCompactRecent" class="sb-list-recent-time">
          <span class="sb-list-recent-time-label">{{ lastJoinedAgo || "Joined previously" }}</span>
          <span v-if="state === 'live'" class="sb-list-live-dot" aria-label="Live session" />
          <span v-if="state === 'unavailable'" class="sb-list-unavailable-dot" aria-label="Unavailable session" />
        </span>
      </div>

      <div class="sb-list-action-pane"  aria-hidden="true">
        <span class="sb-list-action-label">{{ actionLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngSoundClass } from "@/common/directives"
import { BngIcon, icons } from "@/common/components/base"


defineOptions({ name: "SessionBrowserListRow" })

const props = defineProps({
  name: { type: String, required: true },
  level: { type: String, required: true },
  players: { type: String, required: true },
  /** Game vfs path, e.g. `/gameplay/missions/.../preview.jpg` */
  preview: { type: String, default: "" },
  source: { type: String, default: "" },
  lastJoinedAgo: { type: String, default: "" },
  actionable: { type: Boolean, default: true },
  /** live | recentUnknown | unavailable | checking */
  state: {
    type: String,
    default: "live",
  },
})

const emit = defineEmits(["click"])

function onActivate(event) {
  emit("click", event)
}

const previewStyle = computed(() => ({
  backgroundImage: props.preview ? `url(${props.preview})` : "none",
}))

const actionLabel = computed(() => {
  // Recent-connection shorthand: never show "Join" here.
  if (props.source === "recent") {
    if (props.state === "unavailable") return "Check Session"
    if (props.state === "checking") return "Checking..."
    if (props.state === "live") return "Check Session"
    return "Check Session"
  }
  if (props.state === "recentUnknown") return "Check Session"
  if (props.state === "unavailable") return "Check Again"
  if (props.state === "checking") return "Checking..."
  return "Join"
})

const stateLabel = computed(() => {
  if (props.state === "recentUnknown") return "Recent session (unknown)"
  if (props.state === "unavailable") return "Unavailable"
  if (props.state === "checking") return "Checking session..."
  return "Live session"
})

const isCompactRecent = computed(() => props.source === "recent")
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.sb-list-row {
  position: relative;
  width: 100%;
  border-radius: var(--bng-corners-1);
  overflow: visible;
  isolation: isolate;
  background: rgba(var(--bng-cool-gray-900-rgb), 0.88);
  @include modify-focus(var(--bng-corners-1), 2px);
}

.sb-list-row.is-checking {
  cursor: progress;
}


.sb-list-row-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: var(--sb-cols);
  gap: 0;
  align-items: stretch;
  width: 100%;
  min-height: calc-ui-rem(5.5);
  box-sizing: border-box;
  border-radius: inherit;
  overflow: hidden;
}

.sb-list-row.is-compact-recent .sb-list-row-content {
  min-height: calc-ui-rem(1.2);
}

.sb-list-preview-pane {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sb-list-preview-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform: scale(1);
  transition: transform 160ms ease-in-out, filter 160ms ease-in-out;
  filter: saturate(0.9) contrast(0.94);
}

.sb-list-preview-image-fallback {
  align-self: center;
  justify-self: center;
  overflow: visible;
}

.sb-list-text-pane {
  min-width: 0;
  padding: 0.55em 0.7em;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.2em 0.6em;
  background: linear-gradient(
    90deg,
    rgba(var(--bng-cool-gray-900-rgb), 0.58) 0%,
    rgba(var(--bng-cool-gray-900-rgb), 0.84) 100%
  );
}

.sb-list-main-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15em;
}

.sb-list-row.is-compact-recent .sb-list-main-col {
  justify-content: center;
  gap: 0.08em;
}

.sb-list-title {
  min-width: 0;
  font-size: calc-ui-rem(1.0);
  font-weight: 750;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-list-meta-item {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc-ui-rem(0.8);
  font-weight: 500;
  color: rgba(var(--bng-off-white-rgb), 0.6);
}

.sb-list-meta-item--players {
  align-self: start;
  justify-self: end;
  padding-top: 0.05em;
  text-align: right;
  font-weight: 650;
  color: rgba(var(--bng-off-white-rgb), 0.72);
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}

.sb-list-live-dot {
  width: calc-ui-rem(0.45);
  height: calc-ui-rem(0.45);
  border-radius: 50%;
  background: rgba(var(--bng-add-green-400-rgb), 0.95);
  box-shadow: 0 0 0 calc-ui-rem(0.08) rgba(var(--bng-add-green-400-rgb), 0.28);
  flex: 0 0 auto;
}

.sb-list-unavailable-dot {
  width: calc-ui-rem(0.45);
  height: calc-ui-rem(0.45);
  border-radius: 50%;
  background: rgba(var(--bng-add-red-400-rgb), 0.95);
  box-shadow: 0 0 0 calc-ui-rem(0.08) rgba(var(--bng-add-red-400-rgb), 0.28);
  flex: 0 0 auto;
}
.sb-list-state {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc-ui-rem(0.72);
  font-weight: 600;
  color: rgba(var(--bng-cool-gray-300-rgb), 0.92);
}

.sb-list-recent-time {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  min-width: 0;
  max-width: 100%;
  font-size: calc-ui-rem(0.75);
  font-weight: 500;
  color: rgba(var(--bng-cool-gray-300-rgb), 0.92);
}

.sb-list-recent-time-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-list-row.is-live .sb-list-state {
  color: rgba(var(--bng-add-green-300-rgb), 0.92);
}

.sb-list-row.is-unavailable .sb-list-state {
  color: rgba(var(--bng-add-red-300-rgb), 0.92);
}

.sb-list-action-pane {
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgba(var(--bng-off-white-rgb), 0.1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.25);
  transition: background 0.14s ease;
}

.sb-list-action-label {
  font-size: calc-ui-rem(0.82);
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  opacity: 1;
}

.sb-list-row:not(.is-actionable) .sb-list-action-label {
  display: none;
}

.sb-list-row.is-checking .sb-list-action-label {
  color: rgba(var(--bng-cool-gray-300-rgb), 0.95);
}

.sb-list-row:hover .sb-list-preview-image,
.sb-list-row:focus .sb-list-preview-image,
.sb-list-row:focus-within .sb-list-preview-image,
.sb-list-row.focus-visible .sb-list-preview-image,
.sb-list-row.focused .sb-list-preview-image,
.sb-list-row:focus-visible .sb-list-preview-image {
  transform: scale(1.03);
  filter: saturate(1.02) contrast(1);
}

.sb-list-row.is-actionable:hover .sb-list-action-pane,
.sb-list-row.is-actionable:focus .sb-list-action-pane,
.sb-list-row.is-actionable:focus-within .sb-list-action-pane,
.sb-list-row.is-actionable.focus-visible .sb-list-action-pane,
.sb-list-row.is-actionable.focused .sb-list-action-pane,
.sb-list-row.is-actionable:focus-visible .sb-list-action-pane {
  background: rgba(var(--bng-orange-500-rgb), 0.26);
}

/* Focus frame: outer must not clip global ::before; inner clips rounded corners (see DiscoverExperienceButton). */
.sb-list-row:focus,
.sb-list-row.focus-visible,
.sb-list-row:focus-visible,
.sb-list-row.focused {
  &::before {
    z-index: 5;
  }
}
</style>
