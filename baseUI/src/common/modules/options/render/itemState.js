import { computed, isRef } from "vue"

const resolveMaybeRef = value => value && typeof value === "object" && "value" in value ? value.value : value

const hasCondition = (conditionName, conditions) => !!conditionName && !!conditions && conditionName in conditions

let simplemenuRef = null
let simplemenuErrorShown = false

const getSimplemenuRef = () => {
  if (simplemenuRef) return simplemenuRef
  const maybeRef = window.bngVue?.globals?.$simplemenu
  if (isRef(maybeRef)) {
    simplemenuRef = maybeRef
    return simplemenuRef
  }
  return null
}

export function getSimplemenuEnabled() {
  const simplemenuRef = getSimplemenuRef()
  if (simplemenuRef) return !!simplemenuRef.value
  if (!simplemenuErrorShown) {
    simplemenuErrorShown = true
    console.error("[options] Missing global \"$simplemenu\" ref. Falling back to false.")
  }
  return false
}

export const hasNotShippingMarker = item =>
  !!item?.condition_not_shipping

// Graphics settings freeze the engine while applying. Accepts either a plain item or a ref.
export const isGraphicsItem = item => {
  const data = resolveMaybeRef(item)
  return !!(data?.setting?.startsWith("Graphic") || (typeof data?.lua === "string" && data.lua.includes("core_settings_graphic")))
}

export const evalSpecialVisibility = (item, isShipping, isSimplemenu) => {
  if (!item || typeof item !== "object") return true
  if (item.condition_always_off) return false
  if (item.condition_not_shipping && isShipping) return false
  if (isSimplemenu && item.condition_simplemenu === "hide") return false
  if (!isSimplemenu && item.condition_simplemenu === "only") return false
  return true
}

export const evalNamedCondition = (conditionName, conditions, values) =>
  !conditionName ||
  !hasCondition(conditionName, conditions) ||
  !!conditions[conditionName](values)

export const isConditionVisible = (item, conditions, values) =>
  evalNamedCondition(item?.condition_visible, conditions, values)

export const isConditionEnabled = (item, conditions, values) =>
  evalNamedCondition(item?.condition_enabled, conditions, values)

export const getVisibilityContext = (contextOverrides = {}) => ({
  isShipping: !!window.beamng?.shipping,
  isSimplemenu: getSimplemenuEnabled(),
  ...contextOverrides,
})

export const isItemVisible = (item, { conditions, values, contextOverrides = {} } = {}) => {
  const { isShipping, isSimplemenu } = getVisibilityContext(contextOverrides)
  return evalSpecialVisibility(item, isShipping, isSimplemenu) && isConditionVisible(item, conditions, values)
}

export const isItemDisabled = (item, { disabled, forceDisabled, conditions, values }) =>
  !!disabled || !!forceDisabled || !isConditionEnabled(item, conditions, values)

export function areConditionChainsVisible(conditionSet, { conditions, values, contextOverrides = {} } = {}) {
  const { isShipping, isSimplemenu } = getVisibilityContext(contextOverrides)
  const specialItem = {
    condition_always_off: !!conditionSet?.alwaysOff,
    condition_not_shipping: !!conditionSet?.notShipping,
    condition_simplemenu: conditionSet?.simplemenu || "",
  }
  if (!evalSpecialVisibility(specialItem, isShipping, isSimplemenu)) return false
  const visibleList = Array.isArray(conditionSet?.visible) ? conditionSet.visible : []
  return visibleList.every(conditionName => evalNamedCondition(conditionName, conditions, values))
}

export function areConditionChainsEnabled(conditionSet, { conditions, values }) {
  const enabledList = Array.isArray(conditionSet?.enabled) ? conditionSet.enabled : []
  return enabledList.every(conditionName => evalNamedCondition(conditionName, conditions, values))
}

export function useOptionItemState(props, deps) {
  const {
    settingsValues,
    conditions,
    buildItemId,
    categoryIndex,
    showInfo,
    version,
  } = deps

  const isNew = computed(() => !props.ignoreNew && props.data.version === resolveMaybeRef(version))
  const isNewGroup = computed(() => props.data.version === resolveMaybeRef(version) && props.data.itemType === "group")
  const curId = computed(() => buildItemId(props.level, props.index, props.parentId || ""))
  const itemId = computed(() => categoryIndex.value < 0 ? undefined : `cat${categoryIndex.value}_${curId.value}`)
  const isDebugSetting = computed(() => props.debugSettings || hasNotShippingMarker(props.data))
  const visible = computed(() => isItemVisible(props.data, {
    conditions,
    values: settingsValues.value,
  }))
  const disabled = computed(() => isItemDisabled(props.data, {
    disabled: props.disabled,
    forceDisabled: props.data.__search_force_disabled,
    conditions,
    values: settingsValues.value,
  }))
  const showCurrentInfo = text => showInfo(curId.value, text)

  return {
    isNew,
    isNewGroup,
    curId,
    itemId,
    isDebugSetting,
    visible,
    disabled,
    showCurrentInfo,
  }
}

