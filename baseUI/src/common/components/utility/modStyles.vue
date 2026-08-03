<template>
  <template v-if="!isRuntime">
    <component
      v-for="(mod, id) in modManager.styles"
      :key="id"
      :is="'style'"
      v-html="mod.styles"
      :data-bngmod-source="mod.filepath"
      style="display: none !important;"
    />
  </template>
</template>

<script setup>
import { useModManager } from "@/services/modManager"
const isRuntime = __BNG_RT__
const modManager = isRuntime ? null : useModManager()
</script>
