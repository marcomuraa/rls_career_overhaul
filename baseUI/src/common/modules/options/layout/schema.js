/// How to add a new item type:
// - Add the new item type to the itemTypes object
// - Add the new fields to it as needed:
//   - "component" is a component or html tag name
//   - "separateLabel" is a boolean that determines if the label should be separate from the component (will be placed at left)
//   - "innerCaption" is a boolean used with "separateLabel" to determine if the caption should be inside the component (e.g. for buttons)
//   - If you need to remove a default field from a single item type, specify it with null value
//   - Specify the field type as it is defined in typeValidators
//   - If you need the field to have a non-editable value, specify the value directly
// - If you've added a new field, make it work:
//   - Add a new field to the EditPopup.vue if there's something custom
//   - Define that field in the ComponentRender.vue
//   - Define component in the components.js

/// NOTE:
// There's no dedicated button to save the layout because all changes are saved automatically.
// But when changing the fields in schema, you will need to save the updated layout.
// To do so, enter editing mode, open editor popup on any item and hit OK.

/// WARNING:
// If you remove any field, layout.json will be updated with that field removed!

// ALWAYS update revision number (with current date) when changing the schema!
// This will ensure accidental downgrades by outdated editor won't happen.
export const SCHEMA_REV = 2026_06_23

// define any type signature
const Any = Symbol("options-editor-any-type")

// base templates
const template = {
  // category button template
  category: {
    label: String,
    icon: String,
    categoryId: String,
    subcategory: Boolean,
    persistent: Boolean,
    spacer: Boolean,
    divider: Boolean,
    items: Array,
    reroute: String,
    categoryInfo: String,
    condition_always_off: Boolean,
    condition_not_shipping: Boolean,
    condition_simplemenu: String,
    condition_visible: String,
    _default: () => ({
      icon: "_empty",
      categoryId: "CHANGE-ME",
    }),
  },
  // item base template (will be extended/overridden with itemTypes)
  item: {
    version: String, // when item was appeared
    label: String,   // display label
    tooltip: String, // tooltip text
    setting: String, // setting key
    interactive: false, // if true, focus capture will be enabled
    // featured: Boolean, // if true, item will be highlighted
    // condition names (see conditions.js)
    condition_always_off: Boolean,
    condition_not_shipping: Boolean,
    condition_simplemenu: String,
    condition_visible: String,
    condition_enabled: String,
  },
}

// specific item templates
const itemTypes = {
  heading: {
    component: "OptionsHeading",
    icon: String,
    variant: String,
    tooltip: null,
    setting: null,
    _default: () => ({
      icon: "_empty",
      variant: "h4",
    }),
    search: ["label"],
  },
  divider: {
    component: "hr",
    tooltip: null,
    label: null,
    setting: null,
  },
  group: {
    component: "OptionsGroup",
    // interactive: Boolean, // TODO: maybe make it optionally scoped?
    label: null,
    setting: null,
    layout: String, // "column" or "row"
    firstAsTitle: Boolean,
    items: Array,
    _default: () => ({
      layout: "column",
    }),
  },
  text: {
    component: "OptionsText",
    variant: String,
    separateLabel: true,
    innerCaption: true,
    caption: String,
    optionsSource: String,
    options: Array,
    search: ["label", "caption", "tooltip", "setting", "settingValue", "optionsSource", "options"],
  },
  link: {
    component: "OptionsLink",
    interactive: true,
    separateLabel: true,
    innerCaption: true,
    link: String,
    caption: String,
    search: ["label", "caption", "tooltip", "setting", "settingValue"],
  },
  checkbox: {
    component: "OptionsCheckbox",
    interactive: true,
    separateLabel: true,
    lua: String,
    luaOff: String,
    valueOn: Any,
    valueOff: Any,
    _default: () => ({
      valueOn: true,
      valueOff: false,
    }),
    search: ["label", "caption", "tooltip", "setting"],
  },
  slider: {
    component: "BngSlider",
    interactive: true,
    separateLabel: true,
    min: Number,
    max: Number,
    step: Number,
    compact: Boolean,
    valueMultiplier: Number,
    unit: String,
    lua: String,
    basic_interaction: Boolean,
    _default: () => ({
      valueMultiplier: 1,
      basic_interaction: false,
    }),
    search: ["label", "caption", "tooltip", "setting"],
  },
  options: {
    component: "BngSmartSelect",
    interactive: true,
    separateLabel: true,
    optionsSource: String, // custom built-in options reference
    options: Array, // custom dropdown options
    lua: String,
    basic_interaction: Boolean,
    _default: () => ({
      basic_interaction: false,
    }),
    search: ["label", "caption", "tooltip", "setting", "optionsSource", "options"],
  },
  button: {
    component: "BngButton",
    interactive: true,
    // icon: String, // first we need to have a way to delete icon (set to "")
    variant: String,
    separateLabel: true,
    innerCaption: true,
    lua: String,
    caption: String,
    _default: () => ({
      // icon: "",
      variant: "secondary",
    }),
    search: ["label", "caption", "tooltip", "setting", "settingValue"],
  },
  input: {
    component: "BngInput",
    interactive: true,
    separateLabel: true,
    inputType: String, // "text" or "number"
    unit: String,
    _default: () => ({
      inputType: "text",
    }),
    search: ["label", "caption", "tooltip", "setting", "settingValue"],
  },
  graph: {
    component: "OptionsGraph",
    separateLabel: true,
    caption: String,
    unit: String,
    search: ["label", "caption", "tooltip", "setting"],
  },
  cameras: {
    component: "OptionsCameras",
    interactive: false,
    tooltip: null,
    label: null,
    setting: null,
  },
  subpage: {
    component: "OptionsSubpage",
    // interactive: true,
    tooltip: null,
    label: null,
    setting: null,
    subpage: String,
    _default: () => ({
      subpage: "CHANGE-ME",
    }),
  },
}

// type validators
const typeValidators = {
  [Any]: val => typeof val !== "undefined",
  [Boolean]: val => typeof val === "boolean",
  [String]: val => typeof val === "string",
  [Number]: val => typeof val === "number",
  [Object]: val => typeof val === "object" && !Array.isArray(val),
  [Array]: val => typeof val === "object" && Array.isArray(val),
}
const typeEmptyValues = {
  [Any]: () => null,
  [Boolean]: () => false,
  [String]: () => "",
  [Number]: () => 0,
  [Object]: () => ({}),
  [Array]: () => [],
}
const dataTypesList = Object.keys(typeValidators)

const getEmptyValue = (schema, key) => schema[key] in typeEmptyValues ? typeEmptyValues[schema[key]]() : schema[key]

function checkTypes(type, value) {
  if (!(type in typeValidators)) return "preset"
  // if (!(type in typeValidators)) throw new TypeError(`Unknown type "${type}"`)
  if (typeValidators[type](value)) return "good"
  return "bad"
}

export const getItemTypes = () => Object.keys(itemTypes)
// export const getSettableKeys = schema => Object.keys(schema).filter(key => schema[key] in dataTypesList)
export const getSettableKeys = itemType => {
  if (!(itemType in itemTypes)) throw new Error(`Item type "${itemType}" does not exist`)
  const schema = {
    ...template.item,
    itemType,
    ...itemTypes[itemType],
  }
  return Object.keys(schema).filter(key => schema[key] in dataTypesList)
}

export function getCategoryTemplate(forEditor = false) {
  const res = { ...template.category }
  if (forEditor) {
    const def = res._default ? res._default() : {}
    for (const key in res) {
      if (key === "_default") continue
      res[key] = key in def ? def[key] : getEmptyValue(res, key)
    }
  }
  return res
}
export function getItemTemplate(itemType, forEditor = false) {
  if (forEditor && !itemType) itemType = getItemTypes()[0]
  if (!(itemType in itemTypes)) throw new Error(`Item type "${itemType}" does not exist`)
  const res = {
    ...template.item,
    itemType,
    ...itemTypes[itemType],
  }
  // remove null fields or add empty/default values
  const def = res._default ? res._default() : {}
  for (const key in res) {
    if (key === "_default") continue
    if (res[key] === null) delete res[key]
    else if (forEditor) res[key] = key in def ? def[key] : getEmptyValue(res, key)
  }
  return res
}

export const createCategory = (data, restore = false) => create(getCategoryTemplate(), data, restore)
export const createItem = (data, restore = false, forceDefaults = false) => create(getItemTemplate(data.itemType), data, restore, forceDefaults)

function create(schema, data, restore = false, forceDefaults = false) {
  const res = {}
  const def = schema._default ? schema._default() : {}
  for (const key in schema) {
    if (key === "_default") continue
    // ignore undefined/null
    if (typeof schema[key] === "undefined" || schema[key] === null) continue
    const empty = getEmptyValue(schema, key)
    // validate data type
    switch (checkTypes(schema[key], data[key])) {
      case "preset":
        res[key] = schema[key]
        break
      case "good":
        res[key] = forceDefaults && key in def ? def[key] : data[key]
        break
      case "bad":
        if (restore && (typeof data[key] === "undefined" || data[key] === null)) {
          res[key] = empty
        } else {
          throw new TypeError(`Value of ${key} must be ${schema[key].name}, but got ${typeof data[key]} instead`)
        }
        break
    }
    if (key in def && res[key] === empty) res[key] = def[key]
  }
  return res
}
