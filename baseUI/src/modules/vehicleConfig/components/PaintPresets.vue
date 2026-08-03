<template>
  <div class="paint-presets">
    <div v-for="group in presetGroups" class="paint-presets-group">
      <span class="paint-presets-name">
        {{ $t(`ui.color.${group.name}`) }}:
      </span>
      <div class="presets-items">
        <BngPaintTile
          v-for="(preset, index) in group.presets" :key="`${index}#${preset.name}`"
          :size="24"
          :paint="preset"
          vehicle-name="factory"
          :paint-name="preset.name"
          tooltip-position="top"
          class="paint-presets-item"
          :data-preset-name="preset.name"
          :with-menu="editable && group.editable"
          :custom-menu="[{label: 'ui.common.delete', action: () => removePreset(preset.name)}]"
          @click="emit('apply', preset)"
        />
        <div v-if="group.presets && group.presets.length > 0" class="paint-presets-item paint-presets-random-item">
          <BngPaintTile
            :size="24"
            paint-name="Randomize"
            tooltip-position="top"
            @click="applyRandomPreset(group)"
          />
          <BngIcon type="dice24" class="paint-presets-random-icon" />
        </div>
        <BngButton
          v-if="!group.presets || Object.keys(group.presets).length === 0"
          class="presets-empty"
          :accent="ACCENTS.text"
          @click="addPreset"
          bng-nav-item
          v-bng-on-ui-nav:ok.asMouse.focusRequired
        >
          {{ $t("ui.colorpicker.noPresets") }}
        </BngButton>
        <BngButton
          v-if="group.presets && Object.keys(group.presets).length > 0 && editable && group.editable"
          class="paint-presets-button"
          :accent="ACCENTS.text"
          @click="addPreset"
          :icon="icons.mathPlus"
          v-bng-tooltip:top="$t('ui.colorpicker.colToPre')"
          bng-nav-item
          v-bng-on-ui-nav:ok.asMouse.focusRequired
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRaw, computed, onMounted, nextTick } from "vue"
import { vBngOnUiNav, vBngTooltip } from "@/common/directives"
import { BngPaintTile, BngButton, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { useSettings } from "@/services/settings"
import { setFocus } from "@/services/uiNavFocus"
import Paint from "@/utils/paint"

const settings = useSettings()

const props = defineProps({
  presets: {
    type: Object,
    required: true,
  },
  showText: {
    type: Boolean,
    default: false,
  },
  editable: {
    type: Boolean,
    default: false,
  },
  current: {
    // current paint so it could be saved to user presets
    type: Object,
  },
})

const emit = defineEmits(["apply"])

const factoryPresets = computed(() => {
  const presets = props.presets
  const factoryRes = {}
  const customRes = {}

  if (typeof presets === "object" && !Array.isArray(presets)) {
    const paint = new Paint()
    for (const name in presets) {
      try {
        paint.paint = presets[name]
        const paintObject = paint.paintObject

        // Check if the paint has a class property to determine if it's factory or custom
        if (presets[name] && typeof presets[name] === 'object' && presets[name].class === 'custom') {
          customRes[name] = paintObject
        } else {
          // Default to factory if no class specified or class is 'factory'
          factoryRes[name] = paintObject
        }
      } catch (err) {
        // console.warn(`Paint "${name}" is invalid`, val[name])
      }
    }
  }
  // console.log(presets, factoryRes, customRes)
  return { factory: factoryRes, custom: customRes }
})

const userPresets = ref({})

const presetGroups = computed(() => {
  // build group sequence with sources
  const res = []

  // factory paint selection
  if (Object.keys(factoryPresets.value.factory).length) {
    res.push({
      name: "factory",
      showTooltip: true,
      editable: false,
      presets: factoryPresets.value.factory,
    })
  }

  // custom paint selection
  if (Object.keys(factoryPresets.value.custom).length) {
    res.push({
      name: "custom",
      showTooltip: true,
      editable: false,
      presets: factoryPresets.value.custom,
    })
  }

  // user paint
  if (props.editable) {
    res.push({
      name: "user",
      showTooltip: false,
      editable: true,
      presets: userPresets.value || {},
    })
  }

  // rebuild presets
  for (const group of res) {
    let presets = Object.keys(group.presets).map(colname => ({
      name: colname,
      ...group.presets[colname],
      // note: user presets might have alpha 0..2 instead of 0..1
      css: `rgb(${group.presets[colname].baseColor.slice(0, 3).map(val => val * 255)})`,
    }))
    if (group.name !== "user") presets = sortColors(presets)
    group.presets = presets
    // console.log(group.name, group.presets.map(itm => itm.name))
  }
  // console.log(res)
  return res
})

function sortColors(list) {
  const GRAYISH_SATURATION_MAX = 0.3

  const hueBucket = hue => {
    const deg = hue * 360
    if (deg < 20 || deg >= 345) return 0 // red
    if (deg < 45) return 1 // orange
    if (deg < 75) return 2 // yellow
    if (deg < 170) return 3 // green
    if (deg < 255) return 4 // blue (incl. cyan)
    return 5 // purple (incl. magenta)
  }

  const toSortable = elem => {
    const [hue, saturation, value] = rgbToHsv(elem.baseColor.slice(0, 3))
    const isGrayish = saturation <= GRAYISH_SATURATION_MAX
    return {
      orig: elem,
      hue,
      saturation,
      value,
      isGrayish,
      bucket: hueBucket(hue),
    }
  }

  return list
    .map(toSortable)
    .sort((a, b) => {
      if (a.isGrayish !== b.isGrayish) return a.isGrayish ? 1 : -1

      if (!a.isGrayish) {
        if (a.bucket !== b.bucket) return a.bucket - b.bucket
        if (a.value !== b.value) return a.value - b.value
        if (a.saturation !== b.saturation) return b.saturation - a.saturation
        return a.hue - b.hue
      }

      if (a.value !== b.value) return a.value - b.value
      return a.saturation - b.saturation
    })
    .map(elem => elem.orig)
}

function rgbToHsv(rgb) {
  const [r, g, b] = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6
    else if (max === g) hue = ((b - r) / delta + 2) / 6
    else hue = ((r - g) / delta + 4) / 6
  }

  const saturation = max === 0 ? 0 : delta / max
  const value = max
  return [hue, saturation, value]
}

function presetTooltip(preset) {
  const [h, s, v] = rgbToHsv(preset.baseColor.slice(0, 3))
  return `${preset.name} (H:${h.toFixed(2)} S:${s.toFixed(2)} V:${v.toFixed(2)})`
}

function addPreset() {
  if (!props.current) return
  const colour = {
    ...props.current,
    baseColor: toRaw(props.current.baseColor),
  }
  let idx = 1
  while (`Custom ${idx}` in userPresets.value) idx++
  const presetName = `Custom ${idx}`
  userPresets.value[presetName] = colour
  savePresets()

  // Focus on the newly created preset after it's added
  nextTick(() => {
    const presetElements = document.querySelectorAll('.paint-presets-item')
    const newPreset = Array.from(presetElements).find(el => el.getAttribute('data-preset-name') === presetName)
    if (newPreset) {
      setFocus(newPreset)
    }
  })
}

function applyRandomPreset(group) {
  if (!group?.presets?.length) return
  const randomIndex = Math.floor(Math.random() * group.presets.length)
  emit("apply", group.presets[randomIndex])
}

function removePreset(name) {
  // Get the current preset elements before removal
  const presetElements = document.querySelectorAll('.paint-presets-item')
  const currentIndex = Array.from(presetElements).findIndex(el => el.getAttribute('data-preset-name') === name)

  // Remove the preset
  delete userPresets.value[name]
  savePresets()

  // Handle focus after removal
  nextTick(() => {
    const group = presetGroups.value.find(g => g.name === 'user')
    if (!group) return

    if (group.presets.length > 0) {
      // If there are still presets, focus on the previous one
      const newPresetElements = document.querySelectorAll('.paint-presets-item')
      const targetIndex = Math.min(currentIndex, newPresetElements.length - 1)
      setFocus(newPresetElements[targetIndex])
    } else {
      // If no presets left, focus on the "add preset" button
      const addButton = document.querySelector('.presets-empty')
      if (addButton) {
        setFocus(addButton)
      }
    }
  })
}

function savePresets() {
  settings.apply({ userPaintPresets: JSON.stringify(Object.values(userPresets.value)) })
}

onMounted(async () => {
  await settings.waitForData()
  let paints = {}
  if (settings.values.userPaintPresets) {
    paints = JSON.parse(settings.values.userPaintPresets.replace(/'/g, '"'))
    if (typeof paints === "object") {
      // convert array to object if needed
      if (Array.isArray(paints)) {
        paints = paints.reduce((res, paint, idx) => ({ ...res, [`Custom ${idx}`]: paint }), {})
      }
      const test = new Paint()
      for (const name in paints) {
        try {
          // test if it's valid
          test.paint = paints[name]
          paints[name] = test.paintObject
        } catch (fire) {
          // console.warn("Invalid paint:", paints[name])
          delete paints[name]
        }
      }
    }
  }
  userPresets.value = paints
})
</script>

<style lang="scss" scoped>
.paint-presets {
  display: flex;
  flex-direction: column;
  width: 100%;

  .paint-presets-group {
    max-width: 100%;
    margin: 0.5em 0;

    .paint-presets-name {
      display: block;
    }

    .presets-items {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.25em;

      .presets-empty {
        flex: 1 0.15 auto;
        text-align: center;
        font-size: 0.8em;
        color: var(--bng-off-white);
        align-items: center;
        max-width: 100%;
        padding: 0.5em;
      }
    }

    $size: 1.6em;

    .paint-presets-item {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }

    .paint-presets-random-item {
      position: relative;
      :deep(.bng-paint-tile) {
        width: 100%;
        height: 100%;
        outline: 2px solid rgba(255, 255, 255, 0.5);
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 0.25em;

      }
    }

    .paint-presets-random-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-52%, -45%);
      pointer-events: none;
      --bng-icon-size: 1.6em;
    }

    .paint-presets-item,
    .paint-presets-button {
      width: $size !important;
      height: $size !important;
      min-width: $size !important;
      min-height: $size !important;
      max-width: $size !important;
      max-height: $size !important;
      margin: 0;
    }
    .paint-presets-button {
      // top: -0.6em;
      --bng-icon-size: 1.2em;
      --bng-icon-line-height: 0.9em;
    }

    .paint-presets-hint {
      float: right;
      font-size: 0.8em;
    }
  }
}
</style>
