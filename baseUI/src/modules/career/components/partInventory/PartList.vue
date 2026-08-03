<template>
  <BngCard
    class="part-inventory-card"
    v-bng-blur
    v-bng-scoped-nav="{ scopeId: 'part-inventory-list' }"
    tabindex="-1"
    v-bng-disabled="!partInventoryStore">
    <BngInput class="searchField" :label="$translate.instant('ui.common.search')" floating-label :leading-icon="icons.search" v-model.trim="partInventoryStore.searchString" />
    <div v-if="!partInventoryStore">
      {{ $translate.instant("ui.career.vehicleShopping.pleaseWait") }}
    </div>
    <!-- <div v-else-if="groups.length === 0">
      You don't currently own any parts
    </div> -->
    <div v-else class="part-list-scroll" v-bng-ui-nav-scroll.force>
      <Accordion class="part-groups" singular>
        <AccordionItem
          v-for="(group, index) in groups"
          :key="group.id"
          :data-groupid="group.id"
          ref="accordionItems"
          navigable
          @expanded="state => setGroupExpanded(group.id, state)"
          @selected="accordionItems[index] ? accordionItems[index].captionClick() : undefined">
          <BngButton
            v-if="group.id == 0"
            :accent="ACCENTS.outlined"
            :disabled="group.parts.length === 0"
            @click="openSellPopup()">
            {{ $translate.instant("ui.career.partInventory.sellParts") }}
          </BngButton>

          <template #caption>
            <div class="veh-part-caption">
              <BngIcon v-if="group.icon" class="veh-icon" :type="group.icon" />
              <div v-if="group.thumbnail" class="veh-preview" :style="{ backgroundImage: `url('${group.thumbnail}')` }" ></div>
              <span class="veh-name">
                {{ group.id == 0 ? $translate.instant("ui.career.partShopping.inventory") : group.name }}
                <span class="veh-name-count">({{ group.parts.length }})</span>
              </span>
            </div>
          </template>

          <div v-for="(part, index) in group.parts" class="part-item"
            bng-ui-scope="veh-part-inv"
            v-bng-on-ui-nav:back="() => setGroupExpanded(group.id, false, true)">
            <div class="part-info-col" v-if="(readyGroups[group.id] || index < immediateLimit)">
              <div>
                <span class="part-name">{{ part.name }}</span>
              </div>
              <div class="part-info-row">
                <span class="right">{{ part.mileage }}</span>
                <span class="right"><BngPropVal :iconType="icons.beamCurrency" :valueLabel="part.valueFormatted" /></span>
                <span v-if="groupBy !== 'location'" class="center">{{ part.location }}</span>
                <span v-else-if="groupBy !== 'model'" class="center">{{ part.model }}</span>
                <span class="center"><span v-if="part.data.repairCount">{{ $translate.instant("ui.career.partInventory.repairs", { count: part.data.repairCount }) }} </span></span>
                <span class="center"> <span v-if="part.data.primered">{{ $translate.instant("ui.career.partInventory.notPainted") }}</span></span>
              </div>
            </div>
            <BngButton
              v-if="(readyGroups[group.id] || index < immediateLimit) && part.functions.sell"
              :accent="ACCENTS.outlined"
              class="part-button"
              @click="confirmSellPart(part.data)">
              {{ $translate.instant("ui.career.partInventory.sell") }}
            </BngButton>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  </BngCard>
</template>

<script setup>
import { ref, watchEffect } from "vue"
import { lua, useBridge } from "@/bridge"
import { BngCard, BngPropVal, BngButton, BngIcon, ACCENTS, icons, BngInput } from "@/common/components/base"
import { vBngOnUiNav, vBngDisabled, vBngBlur, vBngScopedNav, vBngUiNavScroll } from "@/common/directives"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { openConfirmation, openMessage, addPopup } from "@/services/popup"
import { $translate } from "@/services/translation"

import { usePartInventoryStore } from "../../stores/partInventoryStore"
import PartSellingPopup from "../partInventory/PartSellingPopup.vue"

const { units } = useBridge()

const emit = defineEmits(["partSold"])
const partInventoryStore = usePartInventoryStore()

// Leading space keeps this group sorted to the top; do not use for display.
const INVENTORY_GROUP_SORT_NAME = " Inventory"

// number of parts to show right away
const immediateLimit = 15

const groupBy = ref("location")

const groups = ref([])
const accordionItems = ref([])
const disableInstallButtons = ref(false)

const expandedGroups = ref({})
const readyGroups = ref({})

const setGroupExpanded = (groupId, state, focusOnCollapse = false) => {
  expandedGroups.value[groupId] = state
  if (!state) {
    delete readyGroups.value[groupId]
    if (focusOnCollapse) {
      const elm = document.querySelector(`[data-groupid="${groupId}"] > .bng-accitem-caption`)
      elm && elm.focus()
    }
    return
  }
  if (!(groupId in readyGroups.value)) {
    readyGroups.value[groupId] = false
    setTimeout(() => {
      // only flip to ready if the group is still expanded
      if (expandedGroups.value[groupId]) {
        readyGroups.value[groupId] = true
      }
    }, 100)
  }
}

const openSellPopup = async () => {
  const res = await addPopup(PartSellingPopup, { parts: groups.value[0].parts }).promise
  if (res) {
    emit("partSold")
  }
}

watchEffect(() => {
  disableInstallButtons.value = false
  if (!partInventoryStore || !Array.isArray(partInventoryStore.partInventoryData.partList) || partInventoryStore.partInventoryData.partList.length === 0) {
    return []
  }
  const res = []

  if (groupBy.value == "location") {
    let group = {
      id: 0,
      name: INVENTORY_GROUP_SORT_NAME,
      parts: [],
      icon: icons.BNGFolder
    }
    res.push(group)

    for (const [vehId, vehicle] of Object.entries(partInventoryStore.partInventoryData.vehicles)) {
      let group = {
        id: vehId,
        name: vehicle.niceName,
        parts: [],
        thumbnail: partInventoryStore.partInventoryData.vehicles[vehId].thumbnail
      }
      res.push(group)
    }
  }

  for (const part of partInventoryStore.partInventoryData.filteredPartList) {
    const item = {
      name: part.missingFile ? $translate.instant("ui.career.partInventory.missingFile") : part.description.description,
      model: part.vehicleModelDisplayName || part.vehicleModel,
      mileage: units.buildString("length", part.partCondition.odometer, 0),
      // value: part.finalValue,
      valueFormatted: units.beamBucks(part.finalValue),
      location: part.location,
      // please leave the whitespace in inventory name - it helps it sort to the top without any visual change
      locationName: part.location === 0 ? INVENTORY_GROUP_SORT_NAME : partInventoryStore.partInventoryData.vehicles[part.location].niceName,
      functions: {
        sell: false,
      },
      data: part,
    }
    if (!part.missingFile && part.accessible) {
      item.functions.sell =
        part.location === 0
    }
    const groupId = item[groupBy.value]
    let group = res.find(g => g.id == groupId)
    if (!group) {
      group = {
        id: groupId,
        name: item[`${groupBy.value}Name`] || item[groupBy.value],
        parts: [],
      }
      if (part.location > 0) {
        group.thumbnail = partInventoryStore.partInventoryData.vehicles[part.location].thumbnail
      } else {
        // folder BNGFolder
        group.icon = icons.BNGFolder
      }
      res.push(group)
    }
    group.parts.push(item)
  }
  if (res.length > 0) {
    const sorter = (a, b) => a.name.localeCompare(b.name)
    res.sort(sorter)
    for (const group of res) {
      group.parts.sort(sorter)
    }
  }
  // show the result; expansion/ready state lives in expandedGroups/readyGroups
  // (keyed by group id) and persists across rebuilds without retriggering here
  groups.value = res
})

const confirmSellPart = async partToSell => {
  const res = await openConfirmation(partToSell.description.description, $translate.instant("ui.career.partInventory.confirmSell", { price: units.beamBucks(partToSell.finalValue) }), [
    { label: $translate.instant("ui.common.yes"), value: true, extras: { default: true } },
    { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.secondary } },
  ])
  if (res) sellPart(partToSell)
}

const showPartInstallPopup = (data) => {
  if (data) {
    if (data.success) {
      partInventoryStore.openNewPartsPopup(data.newPartIds)
    } else {
      openMessage(data.title, data.message)
    }
  }
}

const sellPart = part => {
  lua.career_modules_partInventory.sellParts([part.id])
  emit("partSold")
}
</script>

<style scoped lang="scss">
.part-inventory-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  color: white;
  padding: 0.5em;
  --bng-card-height: auto;

  :deep(.card-cnt) {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
  }
}

.part-list-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.part-groups {
  min-height: 0;
}

.searchField {
  margin: 0.5em;
  background-color: rgba(0, 0, 0, 0.575);
}

.veh-part-caption {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  overflow: hidden;
  width: 100%;
  height: 4em;
  $preview: 8em; // thumbnail width
  .veh-icon {
    $sz: 4; // in em
    $diff: $preview - $sz;
    padding: 0 calc($diff / 2 / $sz);
    font-size: $sz * 1em;
    background-color: #aaa5;
  }
  .veh-preview {
    width: $preview;
    align-self: stretch;
    background-size: auto 110%;
    background-position: 50% 50%;
    background-repeat: no-repeat;
  }
  .veh-name {
    flex: 1 1 auto;
    padding-left: 0.3em;
    font-size: 1.2em;
    .veh-name-count {
      font-weight: 300;
    }
  }
}

.part-item {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  overflow: hidden;
  width: 100%;
  height: 4em;
  color: #fff;
  > * {
    flex: 1 1 auto;
  }
  &:not(:last-child) {
    border-bottom: 1px solid #666;
  }
}

.part-info-col {
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

.part-button {
  flex: 0 0 auto;
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
