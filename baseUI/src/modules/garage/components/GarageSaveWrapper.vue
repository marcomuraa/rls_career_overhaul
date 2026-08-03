<template>
  <Save v-bng-scoped-nav="{ scopeId: 'garage-vehicle-save', type: SCOPE_TYPES.CONTAINER }" />
</template>

<script setup>
import Save from "@/modules/vehicleConfig/components/Save.vue"
import { vBngScopedNav } from "@/common/directives"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
</script>