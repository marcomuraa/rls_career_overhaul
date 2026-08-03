<template>
  <BngCardHeading>New in {{ version }}</BngCardHeading>
  <span v-if="editable" style="color: #0ff">Please exit edit mode to see the result</span>
</template>

<script setup>
import { inject } from "vue"
import { BngCardHeading } from "@/common/components/base"

const editable = inject("editable")

const version = inject("version")
inject("renderNewOptions")()
</script>
