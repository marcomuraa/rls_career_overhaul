<template>
  <div>
    <BngCard>
      <BngCardHeading>Lua Route Debug Screen</BngCardHeading>
      <div>
        <BngButton @click="testPush">Test Push</BngButton>
      </div>
    </BngCard>
  </div>
</template>

<script setup>
import { BngCard, BngCardHeading, BngButton } from "@/common/components/base"
import { Lua } from "@/bridge/libs"

async function testPush() {
  const result = await Lua.extensions.ui_router.navigate("menu", {}, null)
  console.log("testPush result", result)
}

</script>

<style lang="scss" scoped></style>