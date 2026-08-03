<template>
  <div class="menu-extras-overview">
    <Background class="menu-extras-background" />
    <BngButton
      v-for="item in visibleItems"
      :key="item.routeName"
      class="menu-extras-button"
      :accent="ACCENTS.secondary"
      v-bng-route-target="item.routeName"
      :bng-scoped-nav-autofocus="item.autofocus ? true : null"
    >
      {{ $tt(item.label) }}
    </BngButton>
  </div>
</template>

<script setup>
import { computed, inject, ref } from "vue"
import { BngButton, ACCENTS } from "@/common/components/base"
import Background from "@/common/components/utility/background.vue"
import { vBngRouteTarget } from "@/common/directives"

defineOptions({ name: "MenuExtrasOverview" })

const items = Object.freeze([
  {
    routeName: "menu.extras.credits",
    label: "ui.mainmenu.credits",
    autofocus: true,
  },
  {
    routeName: "menu.extras.licenses",
    label: "ui.options.licenses",
  },
  {
    routeName: "menu.extras.help",
    label: "ui.mainmenu.help",
  },
  {
    routeName: "menu.extras.performance",
    label: "ui.dashboard.performance",
    hideInSimplemenu: true,
  },
  {
    routeName: "menu.extras.stats",
    label: "ui.statspage.title",
  },
])

const $simplemenu = inject("$simplemenu", ref(false))
const visibleItems = computed(() => items.filter(item => !$simplemenu.value || !item.hideInSimplemenu))
</script>

<style lang="scss" scoped>
.menu-extras-overview {
  --bng-bg-enabled: rgba(var(--bng-cool-gray-900-rgb), 0.55);
  --bng-bg-hover: rgba(var(--bng-cool-gray-900-rgb), 0.55);
  --bng-bg-active: rgba(var(--bng-cool-gray-900-rgb), 0.55);
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.12);
  --bng-bg-border-width: 0.0625rem;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(2, 18em);
  gap: 0.125em;
  padding: 0.5em;
  border-radius: var(--bng-corners-2);
}

.menu-extras-background {
  background-repeat: no-repeat;
}

.menu-extras-button {
  min-height: 4em;
  width: auto;
  align-items: center;
}
</style>
