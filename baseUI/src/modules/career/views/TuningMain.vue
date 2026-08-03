<template>
  <ComputerWrapper :title="$translate.instant('ui.career.shared.pathTuning')" @back="confirmCancel">
    <ComputerPanel
      v-bng-scoped-nav="{ scopeId: 'career-tuning', canDeactivate: tuningBack }"
      class="tuning-card"
      ref="elCard"
      v-bng-blur="1"
      v-bng-on-ui-nav:context="switchToCart"
      :active="isTuningActive"
      :heading="$translate.instant('ui.career.shared.pathTuning')"
      heading-hint-start-icon="arrowLargeRight"
      heading-hint-start-binding-event="context">
      <Tuning :button-target="elCard && elCard.buttonsContainer" :close-button="false" allow-context-nav />
      <template #footer></template>
    </ComputerPanel>

    <template #side>
      <ShoppingCart
        v-bng-scoped-nav="{ scopeId: 'career-tuning-cart' }"
        :active="isCartActive"
        :cart-data="cartData"
        :player-money="tuningStore.shoppingData.playerMoney"
        :confirm-button-text="$translate.instant('ui.career.shared.confirm')"
        v-bng-on-ui-nav:context="switchToTuning"
        @apply="applyShopping"
        @cancel="confirmCancel"
        @remove-item="removeCartItem" />
    </template>

    <!-- Tabs are shown in infobar because they are tracked events by crossfire.
     This is a hack to prevent them from displaying in the infobar -->
    <BngBinding v-show="false" ui-event="tab_l" controller />
    <BngBinding v-show="false" ui-event="tab_r" controller />
  </ComputerWrapper>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue"
import { BngBinding, ACCENTS } from "@/common/components/base"
import { vBngBlur, vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { lua } from "@/bridge"
import { useRoute } from "vue-router"
import { useScopedNav, activateRouteTargetScope } from "@/services/scopedNav/api"
import { $translate } from "@/services/translation"
import { openConfirmation, openProgress } from "@/services/popup"
import { useUINavBlocker } from "@/services/uiNavTracker"

import { useTuningStore } from "@/modules/vehicleConfig/stores/tuningStore"

import ComputerWrapper from "./ComputerWrapper.vue"
import ComputerPanel from "../components/ComputerPanel.vue"
import Tuning from "@/modules/vehicleConfig/components/Tuning.vue"
import ShoppingCart from "../components/ShoppingCart.vue"

const tuningStore = useTuningStore()
const route = useRoute()

const uiNavBlocker = useUINavBlocker()
uiNavBlocker.ensureNoBlock(["context"])

const { switchScope, current } = useScopedNav()

const isCartActive = computed(() => current.value?.id === "career-tuning-cart")
const isTuningActive = computed(() => current.value?.id === "career-tuning")

const switchToCart = () => switchScope("career-tuning-cart")
const switchToTuning = () => switchScope("career-tuning")

// BACK from the tuning scope must run the cancel/confirm flow instead of letting
// the route back bypass tuning cleanup. Returning false stops scope deactivation.
const tuningBack = () => {
  confirmCancel()
  return false
}

const CANCEL_MESSAGE = $translate.instant("ui.career.shared.cancelShoppingMessage")
const CONFIRM_BUTTONS = [
  { label: $translate.instant("ui.common.yes"), value: true },
  { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.secondary } },
]

const confirmCancel = async () => {
  if (!(tuningStore.shoppingData.shoppingCart && tuningStore.shoppingData.shoppingCart.items.length) || await openConfirmation(null, CANCEL_MESSAGE, CONFIRM_BUTTONS)) {
    // call the actual cancelShopping a second later so that the openProgress has time to be shown
    await openProgress("", $translate.instant("ui.career.shared.pathTuning"), { indeterminate: true, cancellable: false, timeout: 1 })
    setTimeout(() => {
      cancelShopping()
    }, 1000)
  }
}

const cartData = computed(() => {
  const cart = tuningStore.shoppingData ? tuningStore.shoppingData.shoppingCart : null
  const res = { total: 0, taxes: 0, items: [] }
  if (cart) {
    res.total = cart.total
    res.taxes = cart.taxes
    if (Array.isArray(cart.items)) {
      res.items = cart.items.map(item => ({
        type: item.type || (item.level === 1 && "item"),
        level: item.level,
        name: item.title,
        price: item.price,
        priceHide: !item.price,
        removeShow: !!item.varName,
        varName: item.varName,
      }))
    }
  }
  return res
})

const elCard = ref()

const applyShopping = () => lua.career_modules_tuning.applyShopping()
const cancelShopping = () => lua.career_modules_tuning.cancelShopping()
const removeCartItem = (item) => lua.career_modules_tuning.removeVarFromShoppingCart(item.varName)

// Tuning buckets arrive from Lua after mount. Delay the manual routeMounted ack
// and scope activation until the data is present and rendered so the tuning
// autofocus target lands on a navigable entry.
const isTuningReady = computed(() => !!tuningStore.buckets && Object.keys(tuningStore.buckets).length > 0)

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return
  if (!isTuningReady.value) return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (!result?.success) return
  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null
  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return

  activateRouteTargetScope()
}

watch(
  () => route.fullPath,
  () => {
    lastMountedAckRouteName.value = ""
    notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(isTuningReady, ready => {
  if (ready) notifyRouteMountedWhenReady()
})
</script>

<style scoped lang="scss">
.tuning-card {
  overflow: hidden;
  width: 40%;
  height: 100%;
  & :deep(.panel-content) {
    background-color: rgba(0, 0, 0, 0);
    height: 100%;
    min-height: 0;
  }
  // Keep the heading fixed; only the tuning content scrolls.
  & :deep(.innerTuningCard) {
    flex: 1 1 auto;
    min-height: 0;
  }
}

:deep(.tuning-static) {
  padding-left: 0.5em;
}
</style>
