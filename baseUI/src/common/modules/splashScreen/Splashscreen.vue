<template>
  <div class="splashscreen" :style="styles">
    <div class="content">
      <div class="logo"></div>
      <p class="warning">
        {{ $t("ui.startscreen.warning") }}
      </p>
      <p class="details">
        {{ $t("ui.startscreen.warningdetails") }}
      </p>
      <!-- TODO: remove v-if once we have all license types listed -->
      <p class="license" v-if="license === 'personal'">
        {{ $t(`ui.startscreen.license.${license}`) }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { getAssetURL } from "@/utils"
import { lua } from "@/bridge"
import { isShipping } from "bng:config"

// in ms
const PAUSE = 3000
const FADE = 600

const styles = {
  "--pause": PAUSE + "ms",
  "--fade": FADE + "ms",
  "--logo": "url(\"" + getAssetURL("images/logos.svg#bng-beamng-white") + "\")",
}

const license = ref("personal")
let tmr = null

const emit = defineEmits(["done"])

onMounted(async () => {
  if (!isShipping()) {
    emit("done")
    return
  }
  if (await lua.extensions.tech_license.isValid()) {
    license.value = "tech"
  }
  tmr = setTimeout(() => {
    tmr = null
    emit("done")
  }, PAUSE + FADE)
})

onUnmounted(() => {
  if (tmr) clearTimeout(tmr)
})
</script>

<style lang="scss" scoped>
.splashscreen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background-color: black;
  animation: fade var(--fade) ease-in var(--pause) 1 forwards;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.5em;
  gap: 0.8em;
  width: 52em;
  max-width: 100%;
  text-align: center;
}

.logo {
  display: block;
  width: 100%;
  max-width: 400px;
  height: 150px;
  background-image: var(--logo);
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-size: contain;
}

.warning,
.details,
.license {
  margin: 0;
}

.warning,
.license {
  color: rgb(221, 52, 52);
  font-size: 1.2em;
  font-weight: 700;
}

.details {
  color: var(--bng-off-white);
}

@keyframes fade {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
