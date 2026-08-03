<template>
  <div class="mp-session-identifiers">
    <div v-if="sessionId" class="id-row">
      <span class="label">{{ $t("ui.multiplayer.sessionId") }}</span>
      <code class="value">{{ sessionId }}</code>
      <BngButton class="copy-btn" :disabled="!sessionId" accent="text" icon="copy" @click="copy(sessionId)" />
    </div>
    <div v-if="showJoinRow" class="id-row join-code-row">
      <span class="label">{{ $t("ui.multiplayer.joinCode") }}</span>
      <code class="value join-code-value" :class="{ masked: maskJoinCode && joinCode && !joinCodeVisible }">
        {{ joinCodeMaskedDisplay }}
      </code>
      <BngButton
        v-if="maskJoinCode && joinCode"
        class="reveal-btn"
        accent="text"
        :icon="joinCodeVisible ? 'eyeSolidOpened' : 'eyeSolidClosed'"
        :title="joinCodeVisible ? $t('ui.multiplayer.joinCodeHide') : $t('ui.multiplayer.joinCodeShow')"
        @click="joinCodeVisible = !joinCodeVisible"
      />
      <BngButton class="copy-btn" :disabled="!joinCode" accent="text" icon="copy" :title="$t('ui.multiplayer.copyJoinCode')" @click="joinCode && copy(sessionId + '|' + joinCode)" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { BngButton } from "@/common/components/base"

defineOptions({ name: "MultiplayerSessionIdentifiers" })

const props = defineProps({
  sessionId: { type: String, default: "" },
  joinCode: { type: String, default: null },
  /** Show join code row (hide for LAN / local sessions). */
  showJoinRow: { type: Boolean, default: true },
  /** When true, join code is hidden until the user reveals it (copy still uses the real code). */
  maskJoinCode: { type: Boolean, default: true },
})

const joinCodeVisible = ref(false)

watch(
  () => props.joinCode,
  () => {
    joinCodeVisible.value = false
  },
)

const joinCodeMaskedDisplay = computed(() => {
  if (!props.joinCode) return "—"
  if (!props.maskJoinCode || joinCodeVisible.value) return props.joinCode
  return "\u2022".repeat(String(props.joinCode).length)
})

async function copy(text) {
  if (!text) return
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
  } catch (_) {
    /* ignore */
  }
}
</script>

<style scoped lang="scss">
.mp-session-identifiers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.id-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.join-code-row {
  align-items: center;
}

.label {
  flex: 0 0 6.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bng-cool-gray-400);
}

.value {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--fnt-mono, monospace);
  font-size: 0.85rem;
  color: var(--bng-off-white);
  word-break: break-all;
}

.join-code-value.masked {
  letter-spacing: 0.12em;
}

.reveal-btn,
.copy-btn {
  flex: 0 0 auto;
}
</style>
