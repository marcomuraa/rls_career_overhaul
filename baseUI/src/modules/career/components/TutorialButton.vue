<template>
  <BngButton
    v-bng-tooltip="!text ? $t('ui.career.tutorialButton.viewSectionTooltip') : undefined"
    :class="{blink : !seen}"
    :icon="icon"
    class="tut-btn"
    @click.stop="clickHandler"
    >
    <span v-if="text">{{ text }}</span>
  </BngButton>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"
import { lua } from "@/bridge"

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  icon: {
    type: Object,
    default: () => icons.questionmark
  },
  pages: {
    type: Array,
    default: () => [],
  }
});

const seen = ref(true)

function clickHandler() {
  for(let key of props.pages){
    lua.career_modules_tutorialPopups.introPopup(key, true)
  }
  seen.value = true
}
</script>

<style scoped lang="scss">
.tut-btn {
  min-width: unset !important;
  :deep(.icon) {
    padding-right: 0 !important;
  }
}

@keyframes blink {
  from { color:white; }
  to { color:orange }
}

.blink {
  animation: blink 1s linear infinite;
}

</style>
