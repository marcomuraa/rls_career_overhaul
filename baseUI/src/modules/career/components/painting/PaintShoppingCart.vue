<template>
  <ComputerPanel
    class="shopping-cart"
    :heading="$t('ui.career.shoppingCart.title')"
    :active="active"
    :force-hide-hints="!canActivate"
    heading-hint-start-binding-event="context"
    heading-hint-start-icon="arrowLargeRight"
    v-bng-scoped-nav="{ scopeId: 'career-painting-cart' }"
    v-bng-on-ui-nav:context="() => emit('context-to-painting')"
    tabindex="-1">
    <div v-if="changedPaint" class="inner-shopping-cart">
      <div class="shopping-cart-table">
        <div class="shopping-cart-row shopping-cart-row--header">
          <div class="cell-action"></div>
          <div class="cell-article article">{{ $t("ui.career.painting.option") }}</div>
          <div class="cell-price price">{{ $t("ui.career.shoppingCart.price") }}</div>
        </div>
        <div class="shopping-cart-row" v-for="date in rows">
          <div class="cell-action">
            <BngButton
              v-if="date.topLevel"
              :icon="icons.abandon"
              accent="attention"
              @click="emit('reset-paint', date.index)" />
          </div>
          <div class="cell-article" :class="date.topLevel ? 'article' : 'article--subLevel'">
            {{ date.name }}
          </div>
          <span class="price">{{ units.beamBucks(date.price) }}</span>
        </div>
        <div class="shopping-cart-row">
          <div class="cell-action"></div>
          <div class="cell-article article--total">{{ $t("ui.career.shoppingCart.total") }}</div>
          <div class="cell-price price--total">{{ units.beamBucks(totalPrice) }}</div>
        </div>
      </div>
    </div>
    <div class="purchase-button-container">
      <BngButton
        class="purchase-button"
        :disabled="!canPay || !changedPaint"
        show-hold
        v-bng-on-ui-nav:ok.asMouse.focusRequired
        v-bng-click="{
          holdCallback: () => emit('apply'),
          holdDelay: 1000,
          repeatInterval: 0,
        }">
        {{ $t("ui.career.painting.purchaseAndApply") }}
      </BngButton>
    </div>
  </ComputerPanel>
</template>

<script setup>
import { useBridge } from "@/bridge"
import { BngButton, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngClick, vBngScopedNav } from "@/common/directives"
import ComputerPanel from "../ComputerPanel.vue"

defineProps({
  active: Boolean,
  canActivate: Boolean,
  changedPaint: Boolean,
  rows: { type: Array, default: () => [] },
  totalPrice: { type: Number, default: 0 },
  canPay: Boolean,
})

const emit = defineEmits(["reset-paint", "apply", "context-to-painting"])

const { units } = useBridge()
</script>

<style scoped lang="scss">
.shopping-cart {
  color: var(--bng-off-white);
  position: fixed;
  bottom: 5em;
  right: 2em;
  width: 22em;
  max-height: 50vh;
}

.shopping-cart-table {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.shopping-cart-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.cell-action {
  flex: 0 0 auto;
  width: 2.5em;
}

.cell-article {
  flex: 1 1 auto;
}

.inner-shopping-cart {
  overflow-y: auto;
  max-height: calc(50vh - 80px); // Account for purchase button height
  padding: 1em;
}

.price {
  display: inline-flex;
  justify-content: flex-end;
  text-align: right;

  &--total {
    @extend .price;
    padding-top: 1em;
    font-size: 1.3em;
  }
}

.article {
  text-align: left;
  padding-left: 0.5em;

  &--total {
    @extend .article;
    padding-top: 1em;
    font-size: 1.3em;
  }

  &--subLevel {
    @extend .article;
    padding-left: 2em;
  }
}

.purchase-button-container {
  display: flex;
  justify-content: center;
  padding: 0.3em;
}

.purchase-button {
  margin-top: 1em;
}
</style>
