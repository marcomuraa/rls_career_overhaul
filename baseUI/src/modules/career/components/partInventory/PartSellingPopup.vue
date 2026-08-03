<template>
  <BngCard v-bng-scoped-nav="popupScopeBinding" v-bng-on-ui-nav:back,menu="close" class="selling-card">
    <BngCardHeading>Sell Parts</BngCardHeading>
    <div class="selling-card-content">
      <div class="select-buttons">
        Select:
        <div class="part-info-row">
          <BngButton :accent="ACCENTS.secondary" @click="selectAll(true)">
            All
          </BngButton>
          <BngButton :accent="ACCENTS.secondary" @click="selectAll(false)">
            None
          </BngButton>
        </div>
      </div>
      <div
        v-bng-scoped-nav="{ preferAutoFocus: true }"
        class="partList"
        tabindex="0">
        <div v-bng-ui-nav-scroll.force class="partList-scroll">
          <div
            v-for="(part, index) in parts"
            :key="part.data.id"
            class="part-item"
            :class="partsChecked[index] ? 'part-selected' : ''"
            bng-nav-item
            tabindex="0"
            @click="partsChecked[index] = !partsChecked[index]">
            <BngIcon class="selectionCheckbox" :type="partsChecked[index] ? icons.checkboxOn : icons.checkboxOff" />
            <div class="part-info-col">
              <div>
                <span class="part-name">{{ part.name }}</span>
              </div>
              <div class="part-info-row">
                <span class="right">{{ part.mileage }}</span>
                <span class="right"><BngPropVal :iconType="icons.beamCurrency" :valueLabel="part.valueFormatted" /></span>
                <span class="center">{{ part.model }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="popup-buttons">
        <BngButton
          :disabled="saleData.numberOfSelected <= 0"
          show-hold
          v-bng-on-ui-nav:ok.asMouse.focusRequired
          v-bng-click="{
            holdCallback: sellSelectedParts,
            holdDelay: 1000,
            repeatInterval: 0,
          }">
          Sell {{ saleData.numberOfSelected }} parts for <BngUnit :money="saleData.price" />
        </BngButton>
        <BngButton
          :accent="ACCENTS.attention"
          @click="close">
          Cancel
        </BngButton>
      </div>
    </div>
  </BngCard>
</template>

<script setup>
import { lua } from "@/bridge"
import { ref, computed, onMounted, useAttrs } from "vue"
import { vBngClick } from "@/common/directives"
import { BngCard, BngUnit, BngPropVal, BngButton, BngIcon, ACCENTS, icons, BngCardHeading} from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav, vBngUiNavScroll } from "@/common/directives"

const partsChecked = ref([])
const emit = defineEmits(["return"])

const props = defineProps({
  parts: {
    type: Array,
    default: [],
  },
  popupActive: Boolean,
})

const attrs = useAttrs()
const scopeName = `_partSellingPopup__${attrs.__id}`
const popupScopeBinding = computed(() => ({
  scopeId: scopeName,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  canDeactivate: () => false,
  preferAutoFocus: true,
  trapPolicy: "always",
}))

const calculateSaleData = () => {
  let total = 0
  let numberOfSelected = 0
  for (const [index, isChecked] of Object.entries(partsChecked.value)) {
    if (isChecked) {
      let part = props.parts[index]
      total = total + part.data.finalValue
      numberOfSelected = numberOfSelected + 1
    }
  }
  return {price: total, numberOfSelected: numberOfSelected}
}

const saleData = computed(calculateSaleData)

const buildRefList = () => {
  for (let i = 0; i < props.parts.length; i++) {
    partsChecked.value.push(false)
  }
}

const selectAll = (enabled) => {
  for (let i = 0; i < partsChecked.value.length; i++) {
    partsChecked.value[i] = enabled
  }
}

const sellSelectedParts = () => {
  let partIds = []
  for (const [index, isChecked] of Object.entries(partsChecked.value)) {
    if (isChecked) {
      let part = props.parts[index]
      partIds.push(part.data.id)
    }
  }
  lua.career_modules_partInventory.sellParts(partIds)
  close()
}

const close = () => emit("return", true)

onMounted(buildRefList)
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.selling-card {
  background-color: #252525;
  color: white;
}

.selling-card-content {
  padding: 1em;
}

.part-selected {
  background: rgba(255, 102, 0, 0.462);
}

.select-buttons {
  display: flex;
  align-items: center;
}

.popup-buttons {
    margin: 1em 0 0.5em 0;
    padding: 0 1em;
    text-align: center;
  }

.part-groups {
  max-height: 100%;
  overflow: hidden auto;
}

.partList {
  position: relative;
  height: 70vh;
  width: 40vw;
  @include modify-focus(5, 0);
}

.partList-scroll {
  height: 100%;
  overflow: auto;
}

.part-item {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  overflow: hidden;
  width: 100%;
  height: 4em;
  color: #fff;
  cursor: pointer;
  @include modify-focus(5, 0);
  > * {
    flex: 1 1 auto;
  }
  &:not(:last-child) {
    border-bottom: 1px solid #666;
  }
}


.part-info-col {
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}
.part-info-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: baseline;
  > * {
    flex: 1 1 33.333%;
  }
}

.selectionCheckbox {
  padding-left: 0.5em;
  padding-right: 1em;
  flex: 0 0 10%;
}

.part-name {
  font-size: 1.1em;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  // overflow: hidden;
}

.center {
  text-align: center;
}
.right {
  text-align: right;
}
</style>
