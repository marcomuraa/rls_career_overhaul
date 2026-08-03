<template>
  <div class="options-editor">
    <div class="options-editor-title" v-if="title">{{ title }}</div>

    <div class="options-editor-message" v-if="message">{{ message }}</div>
    <hr v-if="message" />

    <!-- Item type selector for items -->
    <div v-if="dataType === 'item'" class="options-editor-item">
      <span class="options-editor-item-title">Type:</span>
      <BngDropdown
        v-model="data.itemType"
        :items="itemTypes"
        @valueChanged="updateItemType"
      />
    </div>

    <!-- Item preview -->
    <div v-if="dataType === 'item'" class="options-editor-item" tip-top="Note:
      1) Changing values on this preview won't affect the actual values,
      2) Conditions do not affect the preview,
      3) Tooltips will glitch here a bit (might produce errors in console)."
    >
      <div class="options-editor-preview">
        <div v-if="!previewReady">One moment... (If you see this for too long, please check console for errors)</div>
        <div v-else-if="data.itemType === 'subpage'">This component is not previewable</div>
        <ComponentRender v-else :data="data" deep-update />
      </div>
    </div>

    <!-- Category ID field -->
    <div v-if="'categoryId' in data" class="options-editor-item">
      <span class="options-editor-item-title">Category ID:</span>
      <BngInput v-model="data.categoryId" />
    </div>

    <!-- item variant -->
    <div v-if="'variant' in data" class="options-editor-item">
      <span class="options-editor-item-title">Variant:</span>
      <BngDropdown v-model="data.variant" :items="variants[data.itemType]" />
    </div>

    <!-- Icon picker for categories -->
    <div v-if="'icon' in data" class="options-editor-item">
      <span class="options-editor-item-title">Icon:</span>
      <IconsDropdown v-model="data.icon" />
    </div>

    <!-- Label field -->
    <div v-if="'label' in data" class="options-editor-item">
      <span class="options-editor-item-title">Label:</span>
      <BngInput v-model="data.label" />
    </div>

    <!-- Subcategory field -->
    <div v-if="'subcategory' in data" class="options-editor-item">
      <span class="options-editor-item-title">
        <BngSwitch v-model="data.subcategory">Is subcategory</BngSwitch>
      </span>
      <span class="options-sidenote">Will be displayed as a child of the previous category.</span>
    </div>

    <!-- Category reroute field -->
    <div v-if="'reroute' in data" class="options-editor-item">
      <span class="options-editor-item-title">Reroute to:</span>
      <BngInput v-model="data.reroute" />
    </div>
    <div v-if="'reroute' in data" class="options-editor-item">
      <span class="options-editor-item-title"></span>
      <span class="options-sidenote">Redirect to another UI route.</span>
    </div>

    <!-- Category spacer field -->
    <div v-if="'spacer' in data" class="options-editor-item">
      <span class="options-editor-item-title">
        <BngSwitch v-model="data.spacer">Is spacer</BngSwitch>
      </span>
      <span class="options-sidenote">For side panel only.</span>
    </div>

    <!-- Category divider field -->
    <div v-if="'divider' in data" class="options-editor-item">
      <span class="options-editor-item-title">
        <BngSwitch v-model="data.divider">Is divider</BngSwitch>
      </span>
    </div>

    <!-- Category persistent field -->
    <div v-if="'persistent' in data" class="options-editor-item">
      <span class="options-editor-item-title">
        <BngSwitch v-model="data.persistent">Is persistent</BngSwitch>
      </span>
      <span class="options-sidenote">Will always be displayed on side panel, but not on top.</span>
    </div>

    <!-- Category info field -->
    <div v-if="'categoryInfo' in data" class="options-editor-item">
      <span class="options-editor-item-title">Info:</span>
      <BngDropdown v-model="data.categoryInfo" :items="categoryInfoList" />
    </div>
    <div v-if="'categoryInfo' in data" class="options-editor-item">
      <span class="options-editor-item-title"></span>
      <span class="options-sidenote">Something that will be displayed in the info panel.</span>
    </div>

    <!-- Subpage field -->
    <div v-if="'subpage' in data" class="options-editor-item">
      <span class="options-editor-item-title">Subpage:</span>
      <BngDropdown v-model="data.subpage" :items="subpagesList" />
    </div>

    <!-- Link URL field -->
    <div v-if="'link' in data">
      <div class="options-editor-item">
        <span class="options-editor-item-title">URL:</span>
        <BngInput v-model="data.link" />
      </div>
      <span class="options-sidenote">You can use Setting value for URL instead, and if you do - it will take priority over this value.</span>
    </div>

    <!-- Caption field (used for checkboxes, buttons, etc.) -->
    <div v-if="'caption' in data" class="options-editor-item">
      <span class="options-editor-item-title">Caption:</span>
      <BngInput v-model="data.caption" />
    </div>
    <span v-if="data.itemType === 'button'" class="options-sidenote">You can use Setting value for label instead.</span>

    <!-- Tooltip field -->
    <div v-if="'tooltip' in data" class="options-editor-item">
      <span class="options-editor-item-title">Tooltip:</span>
      <BngInput v-model="data.tooltip" />
    </div>

    <!-- Slider compact mode switch -->
    <div v-if="data.itemType === 'slider'" class="options-editor-item">
      <span class="options-editor-item-title">Compact slider (no input field):</span>
      <BngSwitch v-model="data.compact" />
    </div>

    <!-- Basic interaction switch -->
    <div v-if="'basic_interaction' in data" class="options-editor-item">
      <span class="options-editor-item-title">Basic interaction</span>
      <BngSwitch v-model="data.basic_interaction"></BngSwitch>
    </div>

    <!-- Group layout field -->
    <div v-if="'layout' in data" class="options-editor-item">
      <span class="options-editor-item-title">Layout:</span>
      <BngDropdown v-model="data.layout" :items="groupLayouts" />
    </div>

    <!-- Group layout field -->
    <div v-if="'firstAsTitle' in data" class="options-editor-item">
      <span class="options-editor-item-title">
        <BngSwitch v-model="data.firstAsTitle">First item is a title</BngSwitch>
      </span>
      <span v-if="data.layout === 'column'" class="options-sidenote">Will add a left padding</span>
    </div>

    <!-- Lua field -->
    <div v-if="'lua' in data" class="options-editor-item">
      <span class="options-editor-item-title" v-if="data.itemType === 'checkbox'">Lua call when on:</span>
      <span class="options-editor-item-title" v-else-if="data.itemType === 'button'">Lua call on click:</span>
      <span class="options-editor-item-title" v-else>Lua call on change:</span>
      <BngInput v-model="data.lua" />
    </div>

    <!-- Lua off field -->
    <div v-if="'luaOff' in data" class="options-editor-item">
      <span class="options-editor-item-title">Lua call when off:</span>
      <BngInput v-model="data.luaOff" />
    </div>

    <!-- Input type field -->
    <div v-if="'inputType' in data" class="options-editor-item">
      <span class="options-editor-item-title">Input type:</span>
      <BngDropdown v-model="data.inputType" :items="inputTypes" />
    </div>

    <!-- Setting field -->
    <div v-if="'setting' in data" class="options-editor-item">
      <span class="options-editor-item-title">Setting:</span>
      <BngDropdown v-model="data.setting" :items="settingsList" show-search />
    </div>
    <div v-if="'setting' in data && data.setting" class="options-editor-item">
      <span class="options-editor-item-title">Current value:</span>
      <span>{{ settingsValues[data.setting] }}</span>
    </div>

    <!-- Checkbox-specific fields -->
    <div v-if="'valueOn' in data && 'valueOff' in data" class="options-editor-item">
      <span class="options-editor-item-title">True/False:</span>
      <div class="options-list">
        <div class="option-row">
          <span>True:</span>
          <BngDropdown v-model="booleanType[0]" :items="booleanTypes" @valueChanged="booleanTypeChanged(0)" />
          <BngInput v-if="booleanType[0] === 'string' || booleanType[0] === 'number'" v-model="data.valueOn" :type="booleanType[0]" :step="numStep" floating-label="Value" />
        </div>
        <div class="option-row">
          <span>False:</span>
          <BngDropdown v-model="booleanType[1]" :items="booleanTypes" @valueChanged="booleanTypeChanged(1)" />
          <BngInput v-if="booleanType[1] === 'string' || booleanType[1] === 'number'" v-model="data.valueOff" :type="booleanType[1]" :step="numStep" floating-label="Value" />
        </div>
      </div>
    </div>

    <!-- Options-specific options -->
    <template v-if="data.itemType === 'options' || data.itemType === 'text'">
      <hr />
      <div class="options-editor-item">
        <span class="options-editor-item-title">Options source:</span>
        <BngDropdown v-model="optionsSource" :items="optionsSources" />
      </div>
      <div v-if="optionsSource === 'other'" class="options-editor-item">
        <span class="options-editor-item-title"></span>
        <BngDropdown
          v-model="data.optionsSource"
          :items="optionsOther"
          show-search
        />
      </div>
      <div v-if="optionsSource === 'custom'" class="options-editor-dropdown-items">
        <div class="options-editor-item-title">Custom Options:</div>
        <div class="options-list">
          <div v-for="(option, index) in customOptions" :key="index" class="option-row">
            <BngInput v-model="option.label" floating-label="Label" />
            <BngDropdown v-model="customOptionsTypes[index]" :items="optionTypes" @valueChanged="customOptionTypeChanged(index)" />
            <BngInput v-model="option.value" :type="customOptionsTypes[index]" :step="numStep" floating-label="Value" />
            <BngButton
              class="remove-btn"
              :accent="ACCENTS.attention"
              :icon="icons.trashBin1"
              @click="removeOption(index)"
            />
          </div>
          <BngButton
            class="add-btn"
            :accent="ACCENTS.secondary"
            @click="addOption"
          >Add option</BngButton>
        </div>
      </div>
    </template>

    <!-- Slider-specific fields -->
    <div v-if="data.itemType === 'slider' || data.itemType === 'inputnumber'" class="options-editor-item">
      <span class="options-editor-item-title">Min/Max/Step:</span>
      <div class="options-list">
        <div class="option-row">
          <BngInput v-model="data.min" type="number" :step="data.step || numStep" floating-label="Min" />
          <BngInput v-model="data.max" type="number" :step="data.step || numStep" floating-label="Max" />
          <BngInput v-model="data.step" type="number" :step="numStep" floating-label="Step" />
        </div>
      </div>
    </div>

    <!-- Slider display value multiplier -->
    <div v-if="data.itemType === 'slider' && !data.compact" class="options-editor-item">
      <span class="options-editor-item-title">Input value multiplier:</span>
      <BngInput v-model="data.valueMultiplier" type="number" :step="numStep" />
    </div>

    <!-- Units -->
    <div v-if="'unit' in data" class="options-editor-item">
      <span class="options-editor-item-title">Unit:</span>
      <BngDropdown v-model="data.unit" :items="units" />
    </div>

    <!-- Conditions -->
    <template v-if="editConditions">
      <hr />
      <div class="options-editor-item">
        <span class="options-editor-item-title">
          <BngSwitch v-model="useConditions" :disabled="conditions.length === 0">Use conditions</BngSwitch>
        </span>
        <div class="options-list" v-if="useConditions">
          Hide if:
          <BngSwitch v-if="'condition_always_off' in data" v-model="data.condition_always_off">Always</BngSwitch>
          <BngSwitch v-if="'condition_not_shipping' in data" v-model="data.condition_not_shipping">Shipping</BngSwitch>
          <div class="options-editor-dropdown-inline">
            <BngDropdown v-model="data.condition_simplemenu" :items="simplemenuOptions">
              <template #display>
                {{ simplemenuDisplay }}
              </template>
            </BngDropdown>
          </div>
        </div>
      </div>
      <template v-if="useConditions">
        <template v-if="'condition_visible' in data">
          <div class="options-editor-item">
            <span class="options-editor-item-title">Visibility condition:</span>
            <BngDropdown v-model="data.condition_visible" :items="conditions" show-search />
          </div>
          <div class="options-editor-item" v-if="data.condition_visible">
            <span class="options-editor-item-title">Current visibility value:</span>
            <span>{{ condValues.visible }}</span>
          </div>
        </template>
        <template v-if="'condition_enabled' in data">
          <div class="options-editor-item">
            <span class="options-editor-item-title">Enabled condition:</span>
            <BngDropdown v-model="data.condition_enabled" :items="conditions" show-search />
          </div>
          <div class="options-editor-item" v-if="data.condition_enabled">
            <span class="options-editor-item-title">Current enabled value:</span>
            <span>{{ condValues.enabled }}</span>
          </div>
        </template>
        <span class="options-sidenote">Conditions are defined in the runtime/conditions.js</span>
      </template>
    </template>

    <!-- Version -->
    <div v-if="'version' in data" class="options-editor-item">
      <span class="options-editor-item-title">Version:</span>
      <BngDropdown v-model="data.version" :items="versionsList" />
    </div>

    <!-- Buttons -->
    <div class="options-editor-buttons">
      <BngButton :accent="ACCENTS.main" @click="save">{{ $t("ui.common.okay") }}</BngButton>
      <BngButton :accent="ACCENTS.secondary" @click="reset">{{ $t("ui.common.reset") }}</BngButton>
      <BngButton :accent="ACCENTS.secondary" @click="cancel">{{ $t("ui.common.cancel") }}</BngButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide, nextTick } from "vue"
import { BngInput, BngButton, BngDropdown, BngSwitch, ACCENTS, icons } from "@/common/components/base"
import IconsDropdown from "@/common/modules/icons/IconsDropdown.vue"
import ComponentRender from "../render/ComponentRender.vue"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { getItemTypes, createItem } from "../layout/schema"
import { subpages } from "./subpages"

const navBlocker = useUINavBlocker()
navBlocker.allowOnly(["focus_u", "focus_d", "focus_l", "focus_r", "back", "ok"])

const sortNoCase = (a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" })
const mapDropdown = name => ({ value: name, label: name })
const reduceDropdownGroups = (res, name) => {
  const group = name.charAt(0).toUpperCase()
  if (group && !res.at(-1)?.value.toUpperCase().startsWith(group)) {
    res.push({ label: group === "_" ? "Special" : group, group: true })
  }
  res.push({
    value: name,
    label: group === "_" ? name.replace(/^_+/, "") : name,
    grouped: true,
  })
  return res
}

const numStep = 0.0001 // default step for numeric inputs

const props = defineProps({
  title: { type: String, required: true },
  message: { type: String },
  dataType: { type: String, required: true },
  data: { type: Object, required: true },
  settingsList: { type: Object, required: true },
  settingsValues: { type: Object, required: true },
  settingsOptions: { type: Object, required: true },
  conditions: { type: Object, required: true },
  versions: { type: Array, required: true },
})

provide("settingsValues", computed(() => props.settingsValues))
provide("settingsOptions", computed(() => props.settingsOptions))
// provide("settingsTimestamp", computed(() => props.settingsTimestamp))
provide("settingsTimestamp", ref(0))
provide("infoHidden", ref(true))

const emit = defineEmits(["return"])

const data = ref({})
const previewReady = ref(false)

function reset() {
  data.value = props.data ? JSON.parse(JSON.stringify(props.data)) : {}
  setup()
}
function setup() {
  previewReady.value = false
  optionsSource.value = ""
  customOptions.value = []
  if (data.value.optionsSource) {
    optionsSource.value = "other"
  } else if ("options" in data.value && Array.isArray(data.value.options)) {
    if (data.value.options.length > 0) optionsSource.value = "custom"
    customOptions.value = data.value.options
  }
  customOptionsTypes.value = customOptions.value.map(opt => typeof opt.value === "number" ? "number" : "text")
  useConditions.value = !!data.value.condition_visible || !!data.value.condition_enabled ||
    !!data.value.condition_always_off || !!data.value.condition_not_shipping || !!data.value.condition_simplemenu
  nextTick(() => previewReady.value = true)
}

function save() {
  // reset temporary values
  if ("categoryId" in data.value) {
    data.value.categoryId = data.value.categoryId.trim().toLowerCase()
    if (data.value.spacer && data.value.divider) data.value.spacer = false
  }
  if (data.value.icon && data.value.icon === "_empty") {
    data.value.icon = ""
  }
  if (optionsSource.value !== "other" && data.value.optionsSource) {
    data.value.optionsSource = ""
  }
  if (optionsSource.value !== "custom" && data.value.options && data.value.options.length > 0) {
    data.value.options.splice(0)
  }
  if (!useConditions.value) {
    data.value.condition_always_off = false
    data.value.condition_not_shipping = false
    data.value.condition_simplemenu = ""
    data.value.condition_visible = ""
    data.value.condition_enabled = ""
  }
  emit("return", data.value)
}
const cancel = () => emit("return", null)


/// item type

const itemTypes = getItemTypes().map(type => ({
  value: type,
  label: type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
}))

const updateItemType = itemType => {
  data.value.itemType = itemType
  data.value = createItem(data.value, true, true)
  setup()
}


/// control variant

const variants = {
  heading: [
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "h4", label: "Heading 4" },
    { value: "h5", label: "Heading 5" },
    { value: "h6", label: "Heading 6" },
  ],
  text: [
    { value: "", label: "Normal" },
    { value: "info", label: "Info" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
    { value: "success", label: "Success" },
    { value: "mono", label: "Monospace" },
  ],
  button: Object.keys(ACCENTS).map(accent => ({ value: accent, label: accent.charAt(0).toUpperCase() + accent.slice(1) })),
}


/// settings

const settingsList = [
  { value: "", label: "None" },
  ...Object.keys(props.settingsList)
    .sort(sortNoCase)
    // .map(mapDropdown)
    .reduce(reduceDropdownGroups, []),
]


/// options

const optionsSources = computed(() => [
  { value: "", label: data.value.itemType === "text" ? "Use setting value" : "Built-in options (same as setting name)" },
  { value: "other", label: "Built-in options (other name)" },
  { value: "custom", label: "Custom options" },
])
const optionsSource = ref("")
const optionsOther = computed(() => Object.keys(props.settingsOptions)
  .sort(sortNoCase)
  // .map(mapDropdown)
  .reduce(reduceDropdownGroups, [])
)
const customOptions = ref([])
const customOptionsTypes = ref([])
const optionTypes = [
  { value: "text", label: "String" },
  { value: "number", label: "Number" },
]

const addOption = () => {
  customOptions.value.push({ value: "", label: "" })
  customOptionsTypes.value.push("text")
}
const removeOption = index => {
  customOptions.value.splice(index, 1)
  customOptionsTypes.value.splice(index, 1)
}
const customOptionTypeChanged = index => {
  if (customOptionsTypes.value[index] === "number") {
    customOptions.value[index].value = Number(customOptions.value[index].value)
  } else {
    customOptions.value[index].value = String(customOptions.value[index].value)
  }
}


/// group layout

const groupLayouts = [
  { value: "column", label: "Column" },
  { value: "row", label: "Row" },
]


/// boolean values

const booleanTypes = [
  { value: "boolean", label: "Boolean" },
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "null", label: "Null" },
]
const booleanType = ref(["boolean", "boolean"])
const booleanTypeChanged = index => {
  const key = index === 0 ? "valueOn" : "valueOff"
  switch (booleanType.value[index]) {
    case "boolean":
      data.value[key] = index === 0 ? true : false
      break
    case "string":
      data.value[key] = index === 0 ? "enable" : "disable"
      break
    case "number":
      data.value[key] = index === 0 ? 1 : 0
      break
    case "null":
      data.value[key] = null
      break
    default:
      data.value[key] = index === 0 ? true : false
      break
  }
}


/// input type

const inputTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
]


/// units

const units = [
  { value: "", label: "None" },

  { label: "Generic", group: true },
  { value: "%", label: "% (percentage)", grouped: true },
  { value: "°", label: "° (degrees)", grouped: true },
  { value: "×", label: "× (multiplier)", grouped: true },
  { value: "FPS", label: "FPS (frames per second)", grouped: true },
  { value: "MB", label: "MB (megabytes)", grouped: true },

  { label: "Length, time", group: true },
  { value: "m", label: "m (meters)", grouped: true },
  { value: "s", label: "s (seconds)", grouped: true },
  { value: "sec", label: "sec (seconds)", grouped: true },
  { value: "ms", label: "ms (milliseconds)", grouped: true },

  { label: "Speed", group: true },
  { value: "m/s", label: "m/s (meters per second)", grouped: true },
  { value: "km/h", label: "km/h (kilometers per hour)", grouped: true },
  { value: "mph", label: "mph (miles per hour)", grouped: true },
  { value: "[speed]", label: "Dynamic speed unit (km/h, mph)", grouped: true, tooltip: "For slider only" },
]


/// subpages

const subpagesList = Object.keys(subpages).sort().map(mapDropdown)


/// category info

const categoryInfoList = [
  { value: "", label: "None" },
  { value: "fps", label: "FPS" },
]


/// conditions

const editConditions = computed(() =>
  "condition_visible" in data.value || "condition_enabled" in data.value ||
  "condition_always_off" in data.value || "condition_not_shipping" in data.value || "condition_simplemenu" in data.value
)
const useConditions = ref(false)

const simplemenuOptions = [
  { value: "", label: "Show regardless of Simplemenu state", display: "Ignore Simplemenu" },
  { value: "hide", label: "Hide when Simplemenu is active", display: "In Simplemenu" },
  { value: "only", label: "Show only when Simplemenu is active", display: "Out of Simplemenu" },
]
const simplemenuDisplay = computed(() => {
  const option = simplemenuOptions.find(option => option.value === data.value.condition_simplemenu)
  return option?.display || option?.label || "n/a"
})

const conditions = [
  { value: "", label: "None" },
  ...Object.keys(props.conditions)
    .sort(sortNoCase)
    // .map(mapDropdown)
    .reduce(reduceDropdownGroups, []),
]

const condValues = computed(() => ({
  visible: data.value.condition_visible ? props.conditions[data.value.condition_visible](props.settingsValues, props.settingsOptions) : "",
  enabled: data.value.condition_enabled ? props.conditions[data.value.condition_enabled](props.settingsValues, props.settingsOptions) : "",
}))

/// versions

const versionsList = props.versions.map(mapDropdown)


/// reset
onMounted(reset)
</script>

<style lang="scss" scoped>
.options-editor {
  min-width: 50em;
  max-width: 60em;
  font-size: 1rem;
  color: #fff;
  background-color: #333;
  border-radius: var(--bng-corners-1);
  overflow: hidden auto;
  > * {
    display: block;
  }
  > *:not(:first-of-type) {
    max-width: calc(100% - 0.6em);
    margin-top: 0.5em;
    margin-left: 0.3em;
    margin-right: 0.3em;
  }
  > *:not(:last-of-type) {
    margin-bottom: 0.5em;
  }
}

hr {
  margin: 0.5em 0;
  border: 0;
  border-top: 1px solid #666;
}

.options-editor-title {
  padding: 0.3em;
  font-size: 1.1em;
  font-weight: 600;
  text-align: center;
  background-color: #444;
}

.options-editor-buttons {
  text-align: center;
  > * {
    min-width: 7em !important;
  }
}

.options-editor-item {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: stretch;
  width: 100%;
  > * {
    flex: 0 0 60%;
    width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .options-editor-item-title {
    flex: 0 0 40%;
    width: 40%;
  }
}

.options-editor-dropdown-inline {
  display: inline-flex;
}

.options-editor-dropdown-items {
  margin-top: 1em;
  .options-list {
    margin-top: 0.5em;
    .add-btn {
      width: 100%;
    }
  }
}
.option-row {
  display: flex;
  gap: 0.5em;
  margin-bottom: 0.5em;
  :deep(.bng-input) {
    flex: 1;
  }
  .remove-btn {
    min-width: unset;
  }
}

.options-sidenote {
  font-size: 0.9em;
  font-style: italic;
}

.options-editor-preview {
  position: relative;
  width: min-content;
  min-width: calc(100% - 0.25em);
  max-height: 5em;
  background-color: #222;
  border: 2px solid #666;
  overflow: hidden auto;
}

[tip-top]::before {
  position: absolute;
  display: inline-block;
  content: attr(tip-top);
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 30rem;
  padding: 0.5em;
  padding-top: 0.3em;
  font-size: 0.8rem;
  white-space: pre-wrap;
  color: #fff;
  background-color: #111d;
  border-radius: var(--bng-corners-1);
  opacity: 0;
  transition: opacity 200ms;
  pointer-events: none;
  z-index: 100000;
}
[tip-top]:hover::before {
  opacity: 1;
}
</style>



