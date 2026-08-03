import { markRaw, defineAsyncComponent } from "vue"
import { useBridge } from "@/bridge"
import { debounce } from "@/utils/rateLimit"
import { $translate } from "@/services"
import { isGraphicsItem } from "../render/itemState"

import * as COMPONENTS from "@/common/components/base"
import OptionsSubpage from "../components/subpages"
import OptionsText from "../components/custom/OptionsText.vue"
import OptionsLink from "../components/custom/OptionsLink.vue"
import OptionsGroup from "../components/custom/OptionsGroup.vue"
import OptionsHeading from "../components/custom/OptionsHeading.vue"
import OptionsGraph from "../components/custom/OptionsGraph.vue"
// async to break a render cycle: OptionsCameras -> EditBinding -> ... -> ComponentRender -> this registry
const OptionsCameras = defineAsyncComponent(() => import("../components/custom/OptionsCameras.vue"))
import OptionsCheckbox from "../components/custom/OptionsCheckbox.vue"

let allComponents
const getAllComponents = () => allComponents ??= {
  // base components
  ...COMPONENTS,
  // custom options components
  OptionsSubpage,
  OptionsText,
  OptionsLink,
  OptionsGroup,
  OptionsHeading,
  OptionsGraph,
  OptionsCameras,
  OptionsCheckbox,
}

let UIUnits
function getUIUnits() {
  if (!UIUnits) {
    const bridge = useBridge()
    UIUnits = bridge.units
  }
  return UIUnits
}

/**
 * @param {Ref} data - Data object ref
 * @param {Ref} component - Component ref
 * @param {Reactive} props - Reactive props to bind to the component - `{binds, events}`
 * @param {Ref} vmodel - Ref to v-model
 * @param {Function} emit - Emit function
 * @param {Reactive|Object} values - Settings values
 * @param {Reactive|Object} options - Settings options
 */
export function buildComponent(data, component, props, vmodel, emit, values, options) {
  if (!data.value.component) return

  // set model value
  if (data.value.setting) {
    vmodel.value = data.value.setting in values ? JSON.parse(JSON.stringify(typeof values[data.value.setting] !== "undefined" ? values[data.value.setting] : null)) : null
  } else {
    vmodel.value = undefined
  }

  builders[data.value.component]?.(data, props, vmodel, emit, values, options)

  const components = getAllComponents()
  component.value = data.value.component in components ? markRaw(components[data.value.component]) : data.value.component
}

const builders = {
  BngButton(data, props, vmodel, emit, values, options) {
    props.binds = {
      accent: COMPONENTS.ACCENTS[data.value.variant || "secondary"],
      // icon: data.value.icon,
    }
    props.events.click = () => emit("click")
    if (data.value.setting && data.value.setting in values) {
      data.value.caption = values[data.value.setting]
    }
  },

  OptionsCheckbox(data, props, vmodel, emit) {
    props.binds.valueOn = data.value.valueOn
    props.binds.valueOff = data.value.valueOff
    props.events.change = value => emit("change", value)
  },

  BngSmartSelect(data, props, vmodel, emit, values, options) {
    props.binds.items = []
    if (data.value.options && data.value.options.length > 0) {
      // custom options
      props.binds.items = data.value.options
    } else {
      if (data.value.optionsSource && data.value.optionsSource in options) {
        // custom built-in source
        props.binds.items = options[data.value.optionsSource]
      } else if (data.value.setting && data.value.setting in options) {
        // default built-in source
        props.binds.items = options[data.value.setting]
      }
    }
    // if (!Array.isArray(props.binds.items)) { // no need for smartselect
    //   // dropdown items must be an array (FIXME: maybe add fallback to empty array right in the BngDropdown?)
    //   props.binds.items = []
    // }
    if (Array.isArray(props.binds.items)) {
      props.binds.items = props.binds.items.map(item => ({
        ...item,
        label: $translate.instant(item.label),
      }))
      // forcing type
      if (props.binds.items.length >= 12) {
        props.binds.type = "dropdown"
        props.binds.showSearch = true
      } else {
        props.binds.type = "select"
      }
    }
    // note: for dropdowns it's `valueChanged`, for selects and smartselects it's `change`
    const emitChange = value => emit("change", value)

    // some graphics settings freeze the engine, so debounce them
    props.events.change = isGraphicsItem(data) ? debounce(emitChange, 500) : emitChange
  },

  BngInput(data, props, vmodel, emit, values, options) {
    if (data.value.inputType) props.binds.type = data.value.inputType
    if (data.value.unit) props.binds.suffix = data.value.unit
    props.events.change = debounce(value => emit("change", value), 500)
  },

  BngSlider(data, props, vmodel, emit, values, options) {
    let unit = data.value.unit
    let mult = data.value.valueMultiplier
    let min = data.value.min
    let max = data.value.max
    if (unit === "[speed]") {
      const speed = getUIUnits().speed(1)
      unit = speed.unit
      // NOTE: due to some issues with non-normalised multipliers when used in BngSlider,
      //       multiplier calculations are currently done in extensions.js and formatters.js
      // mult = speed.val * (mult || 1)
      min = Math.round(speed.val * (min || 0))
      max = Math.round(speed.val * (max || 100))
    }
    props.binds = {
      min,
      max,
      step: data.value.step,
      withInput: !data.value.compact,
      inputMultiplier: mult,
      unit,
    }
    if ("inputMax" in data.value) props.binds.inputMax = data.value.inputMax
    if ("inputStep" in data.value) props.binds.inputStep = data.value.inputStep
    props.events.change = debounce(value => emit("change", value), 500)
    props.events.blur = () => emit("blur")
  },

  OptionsText(data, props, vmodel, emit, values, options) {
    props.binds.variant = data.value.variant
    if (data.value.optionsSource && data.value.optionsSource in options) {
      data.value.caption = options[data.value.optionsSource]
    } else if (vmodel.value) {
      data.value.caption = vmodel.value
    }
    if (data.value.caption && Array.isArray(data.value.caption)) {
      vmodel.value = data.value.caption
      delete data.value.caption
    } else {
      vmodel.value = null
    }
  },

  OptionsLink(data, props, vmodel, emit, values, options) {
    if (data.value.setting && data.value.setting in values) {
      props.binds.link = values[data.value.setting]
    } else {
      props.binds.link = data.value.link
    }
    if (!data.value.caption) data.value.caption = props.binds.link
  },

  OptionsGroup(data, props, vmodel, emit, values, options) {
    props.binds = {
      layout: data.value.layout,
      firstAsTitle: data.value.firstAsTitle,
    }
  },

  OptionsHeading(data, props, vmodel, emit, values, options) {
    props.binds = {
      variant: data.value.variant,
      icon: data.value.icon === "_empty" ? undefined : data.value.icon,
    }
  },

  OptionsGraph(data, props, vmodel, emit, values, options) {
    props.binds = {
      data: values[data.value.setting],
      caption: data.value.caption,
      unit: data.value.unit,
    }
  },

  OptionsCameras(data, props, vmodel, emit, values, options) {
    props.binds = {
      list: values.cameraConfigList,
      focused: values.cameraConfigFocused,
    }
    props.events = {
      setCameraByName: (name) => emit("setCameraByName", name),
      changeOrder: (index, direction) => emit("changeOrder", index, direction),
      toggleEnabledCameraById: (index) => emit("toggleEnabledCameraById", index),
    }
  },

  OptionsSubpage(data, props, vmodel, emit, values, options) {
    props.binds = {
      subpage: data.value.subpage,
    }
  },
}
