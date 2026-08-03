<template>
  <div>
    <span class="italic">oh look, I'm a dynamic component!</span>
    <span class="test">how cool is that?</span>
    <span>
      <BngButton @click="inc" :accent="ACCENTS.outlined" :icon="icons.bug">{{ fullname }}</BngButton>
    </span>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { BngButton, ACCENTS, icons } from "@/common/components/base"

const name = ref("world")
const count = ref(1)

const inc = () => count.value++

const fullname = computed(() => `${name.value} #${count.value}`)

function test() {
  console.log(`hello ${fullname.value}!`)
}
test()
</script>

<style scoped>
div > * {
  display: block;
}
span {
  font-size: 1.5em;
}
.italic,
/* comment */
.test {
  font-style: italic;
}
.test {
  color: #f0f;
}
</style>
