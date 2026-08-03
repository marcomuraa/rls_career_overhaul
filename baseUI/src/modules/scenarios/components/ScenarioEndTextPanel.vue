<template>
  <div class="scenario-end-text">
    <div class="panel text-panel">
      <div
        v-if="portraitSrc"
        class="portrait-wrap"
      >
        <img class="portrait-img" :src="portraitSrc" alt="portrait" />
      </div>

      <div class="text-body">
        <DynamicComponent v-if="text" :template="text" />
      </div>

      <div
        v-if="medalInfo && medalInfo.img"
        class="medal-small-wrap"
      >
        <img class="medal-small-img medalSmall" :src="medalInfo.img" alt="medal" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { DynamicComponent } from "@/common/components/utility"

const props = defineProps({
  text: { type: String, default: "" },
  portraitImg: { type: Object, default: () => null },
  failed: { type: Boolean, default: false },
  medalInfo: { type: Object, default: () => null },
})

const portraitSrc = computed(() => {
  const p = props.portraitImg
  if (!p) return null
  const file = props.failed ? p.fail : p.success
  if (!file) return null
  return "/" + file
})
</script>

<style lang="scss" scoped>
.scenario-end-text {
  height: 200px;
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
}

.text-panel {
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.portrait-wrap {
  height: 100%;
}

.portrait-img {
  height: 100%;
  width: auto;
}

.text-body {
  font-size: 1.5em;
  height: 100%;
  width: 100%;
  overflow: auto;
}

.medal-small-wrap {
  height: 100%;
}

.medal-small-img {
  height: 100%;
  align-self: center;
}

@keyframes medalSmall {
  0% { opacity: 1; transform: scale(1.9); }
  20% { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.medalSmall {
  opacity: 0;
  transform: scale(1);
  animation: medalSmall 1.5s ease 0s forwards;
  animation-delay: 1s;
}
</style>
