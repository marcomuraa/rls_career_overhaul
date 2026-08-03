<template>
  <div
    class="pause-replay-host"
    :class="{ 'is-player': props.mode === 'player' }"
  >
    <ReplayFileBrowser
      v-if="props.mode === 'catalog'"
      :all-label="$t('ui.pause.route.allReplays')"
      navigate-after-play-route="pause.replay"
    />
    <template v-else>
      <div
        v-bng-scoped-nav="{
          scopeId: 'pause-replay-player',
          type: SCOPE_TYPES.CONTAINER,
          preferAutoFocus: true,
          bubbleWhitelistEvents: REPLAY_PLAYER_BUBBLE_EVENTS,
        }"
        class="pause-replay-player__main"
      >
        <ReplayPlayer ref="playerRef" bng-scoped-nav-autofocus />
      </div>

      <BngRow
        class="pause-replay-player__hud-toggle"
        v-bng-tooltip="$t('ui.replay.hudStatusToggle.tooltip')"
        :label="$t('ui.replay.hudStatusToggle.label')"
        @activate="hudPreference.showStatus = !hudPreference.showStatus"
      >
        <SwitchToggle :checked="hudPreference.showStatus" />
      </BngRow>

      <ReplayFileBrowser
        class="pause-replay-player__recent"
        :item-limit="5"
        :all-label="$t('ui.pause.route.allReplays')"
        :autofocus-first-item="false"
        show-all-row
        @all="lua.extensions.ui_router.navigate('pause.replay.all')"
        @loaded="focusPlayer"
      />

    </template>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from "vue"
import { lua } from "@/bridge"
import { vBngScopedNav, vBngTooltip } from "@/common/directives"
import { SwitchToggle } from "@/common/components/utility"
import { BngRow } from "@/common/components/base"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import ReplayPlayer from "@/modules/replay/components/ReplayPlayer.vue"
import ReplayFileBrowser from "@/modules/replay/components/ReplayFileBrowser.vue"
import { useReplayHudPreference } from "@/modules/replay/composables/useReplayHudPreference"

defineOptions({ name: "PauseReplayHost" })

const REPLAY_PLAYER_BUBBLE_EVENTS = Object.freeze(["menu"])

const props = defineProps({
  mode: {
    type: String,
    default: "player",
    validator: value => ["catalog", "player"].includes(value),
  },
})

const playerRef = ref(null)
const hudPreference = useReplayHudPreference()

// Move focus straight into the player once a recording is loaded from the recent list.
async function focusPlayer() {
  await nextTick()
  playerRef.value?.focus()
}

onMounted(() => {
  if (props.mode === "player") focusPlayer()
})

watch(() => props.mode, mode => {
  if (mode === "player") focusPlayer()
})
</script>

<style scoped lang="scss">
.pause-replay-host {
  flex: 1 1 auto;
  display: flex;
  width: 100%;
  min-height: 0;
  outline: none;
  padding: 0.5em;

  &.is-player {
    flex-direction: column;
    gap: 1em;
    min-width: 0;
    color: var(--bng-off-white);
  }
}

.pause-replay-player__main {
  display: flex;
  flex-direction: column;
  gap: 1em;
  min-width: 0;
  flex: 0 0 auto;
  margin: 0.25em;
}

.pause-replay-player__hud-toggle {
  margin: 0;
}

.pause-replay-player__recent {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
</style>
