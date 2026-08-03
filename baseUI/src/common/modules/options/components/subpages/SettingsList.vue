<template>
  <div class="options-settings-list">
    <div class="options-settings-list-header">
      <div>
        <BngPillCheckbox
          v-for="(val, name) in settingsMode"
          :key="name"
          v-model="settingsMode[name]"
        >{{ name }}</BngPillCheckbox>
      </div>
      <BngInput v-model="search" floating-label="Search" :leading-icon="icons.search" />
    </div>
    <div class="options-settings-list-items" v-bng-ui-nav-scroll.force>
    <div class="options-settings-list-item" v-for="setting in settingsListView" :key="setting.name">
      <div>
        {{ setting.name }}
        </div>
        <div>
          <template v-for="(cat, index) in setting.assignedIn" :key="index">
            <template v-if="index > 0">, </template>
            <span
              class="options-goto"
              @click="goToSetting(cat[1], cat[2])"
            >{{ $tt(cat[0]) }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject } from "vue"
import { BngPillCheckbox, BngInput, icons } from "@/common/components/base"
import { vBngUiNavScroll } from "@/common/directives"

const settingsList = inject("settingsList")
const goToSetting = inject("goToSetting")

const settingsMode = reactive({
  assigned: true,
  unassigned: false,
})

const search = ref("")

const settingsListView = computed(() => {
  if (!settingsMode.assigned && !settingsMode.unassigned) return []
  let res = Object.entries(settingsList.value)
    .map(([name, setting]) => ({ name, ...setting }))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (!settingsMode.assigned || !settingsMode.unassigned) {
    res = res.filter(setting => setting.assigned === settingsMode.assigned)
  }
  if (search.value) {
    res = res.filter(setting => setting.name.toLowerCase().includes(search.value.toLowerCase()))
  }
  return res
})
</script>

<style lang="scss" scoped>
.options-settings-list {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.options-settings-list-header {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: stretch;
  width: 100%;
  padding: 0.3rem;
  > * {
    flex: 1 1 auto;
  }
}

.options-settings-list-items {
  flex: 1 1 auto;
  overflow: auto;
}

.options-settings-list-item {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: stretch;
  &:nth-child(even) {
    background-color: #0004;
  }
  > * {
    overflow: hidden;
  }
  > div:first-of-type {
    flex: 0 0 70%;
    width: 70%;
  }
  > div:last-of-type {
    flex: 0 0 30%;
    width: 30%;
  }
}

.options-goto {
  white-space: nowrap;
  color: #fa8;
  cursor: pointer;
  &:hover {
    color: #f60;
    text-decoration: underline;
  }
}
</style>

