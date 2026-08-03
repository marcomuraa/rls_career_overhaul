import { ref, watch } from "vue"
import { $translate } from "@/services"
import { areConditionChainsEnabled, areConditionChainsVisible, isItemVisible } from "../render/itemState"
import { isShipping } from "bng:config"
// import logger from "@/services/logger"

// this flag allows to show hidden options as if they are disabled
// otherwise they will not appear in the search results
const showHiddenAsDisabled = true

// minimum number of characters to start search
// note: repeated words are ignored
const minSearch = 3

let searchReady = false
const searchList = ref([])
export const searchText = ref("")
export const searchResults = ref([])
const watchers = []

function initSearch(layout, settingsValues, settingsOptions, settingsTimestamp) {
  if (searchReady) return
  searchReady = true

  // if true, the option values will be added to the search results
  const optionsWithValues = false
  const isDev = !isShipping()

  const tt = str => str ? String($translate.instant(str) || "").replace(/\[[^\]]+\]|<[^>]+>/g, "").replace(/(\r?\n| +)+/g, " ") : ""
  function resolve(item) {
    const res = []
    for (const key of item.search) {
      if (!item[key]) {
        // special case for setting values
        if (key === "settingValue") {
          res.push(tt(settingsValues.value[item.setting]))
        }
        continue
      }
      if (typeof item[key] === "string") {
        res.push(tt(item[key]))
      } else if (Array.isArray(item[key])) {
        for (const opt of item[key]) {
          res.push(tt(opt.label))
          if (optionsWithValues) res.push(opt.value)
        }
      } else if (item[key] in settingsOptions.value && Array.isArray(settingsOptions.value[item[key]])) {
        for (const opt of settingsOptions.value[item[key]]) {
          res.push(tt(opt.label))
          if (optionsWithValues) res.push(opt.value)
        }
      }
    }
    return res
  }

  function updateSearchList() {
    const addCondition = (cur, add) => add ? [...cur, add] : cur
    function dive(items, categoryIndex, parentConditions = { visible: [], enabled: [], alwaysOff: false, notShipping: false, simplemenu: "" }) {
      const res = []
      for (const item of items) {
        if (!isDev && !isItemVisible(item, { contextOverrides: { isShipping: true } })) continue
        if (item.search) {
          res.push({
            categoryIndex,
            search: resolve(item).join("***").toLowerCase(),
            item,
            conditions: {
              visible: addCondition(parentConditions.visible, item.condition_visible),
              enabled: addCondition(parentConditions.enabled, item.condition_enabled),
              alwaysOff: parentConditions.alwaysOff || !!item.condition_always_off,
              notShipping: parentConditions.notShipping || !!item.condition_not_shipping,
              simplemenu: parentConditions.simplemenu || item.condition_simplemenu || "",
            },
          })
        }
        if (item.items) res.push(...dive(item.items, categoryIndex, {
          visible: addCondition(parentConditions.visible, item.condition_visible),
          enabled: addCondition(parentConditions.enabled, item.condition_enabled),
          alwaysOff: parentConditions.alwaysOff || !!item.condition_always_off,
          notShipping: parentConditions.notShipping || !!item.condition_not_shipping,
          simplemenu: parentConditions.simplemenu || item.condition_simplemenu || "",
        }))
      }
      return res
    }
    const res = []
    for (let i = 0; i < layout.value.items.length; i++) {
      res.push(...dive(layout.value.items[i].items, i))
    }
    searchList.value = res
    // logger.debug("Search list:", searchList.value)
  }
  updateSearchList()

  watchers.push(watch(
    [window.vueI18n.global.locale, settingsValues, settingsTimestamp],
    updateSearchList
  ))
}

export function setupSearch(layout, settingsValues, settingsOptions, settingsTimestamp, conditions) {
  // setup conditions
  const _condVisible = condis => areConditionChainsVisible(condis, { conditions, values: settingsValues })
  const _condEnabled = condis => areConditionChainsEnabled(condis, { conditions, values: settingsValues })
  const condVisible = showHiddenAsDisabled ? () => true : _condVisible
  const condEnabled = showHiddenAsDisabled ? condis => _condVisible(condis) && _condEnabled(condis) : _condEnabled

  function setup() {
    // initial message
    searchResults.value = resultMessage(layout, "ui.common.search.queryTooShort", "search")

    // setup search
    watchers.push(watch(searchText, text => {
      initSearch(layout, settingsValues, settingsOptions, settingsTimestamp)

      text = text.toLowerCase().trim()

      // check length
      if (text.length < minSearch) {
        searchResults.value = resultMessage(layout, "ui.common.search.queryTooShort", "search")
        return
      }

      // split and remove duplicates
      const query = text.split(/ +/).reduce((res, q) => !q || res.includes(q) ? res : [...res, q], [])

      // check length again
      if (query.length === 1 && query[0].length < minSearch) {
        searchResults.value = resultMessage(layout, "ui.common.search.queryTooShort", "search")
        return
      }

      // run search
      const search = searchList.value.filter(itm => {
        let ok = query.every(q => itm.search.includes(q))
        if (ok) ok = condVisible(itm.conditions)
        return ok
      })

      if (search.length === 0) {
        searchResults.value = resultMessage(layout, "ui.common.search.noResults", "search")
        return
      }

      // build categorised results
      const res = layout.value.items.map((cat, idx) => resultGroup(
        layout, cat.label, cat.icon,
        search.filter(itm => itm.categoryIndex === idx).map(itm => ({
          ...itm.item,
          condition_visible: "",
          condition_enabled: "",
          condition_always_off: false,
          condition_not_shipping: false,
          condition_simplemenu: "",
          __search_force_disabled: !condEnabled(itm.conditions),
        }))
      )).filter(cat => !!cat)

      // return results with headers
      searchResults.value = [
        ...resultHeaders(
          layout, "ui.common.search.results", "search",
          showHiddenAsDisabled ? undefined : "ui.common.search.someHidden"
        ),
        ...res,
      ]
      // logger.debug("Search results:", searchResults.value)
    }))
  }

  if (layout.value?.search?.message) {
    setup()
  } else {
    const waitForLayout = watch(layout, () => {
      if (!layout.value?.search?.message) return
      waitForLayout()
      setup()
    })
  }
}

export function disposeSearch() {
  searchReady = false
  for (const unwatch of watchers) {
    unwatch()
  }
  watchers.splice(0)
  searchList.value = []
  searchResults.value = []
}

// used by editor to prepare and save schema-compliant search templates
export function createSearchLayout(createItem) {
  // messages such as "no results found"
  const message = {
    label: "label",
    icon: "icon",
    template: createItem({
      itemType: "heading",
      variant: "h4",
    }),
  }
  // results main header
  const resultsHeader = {
    label: "label",
    icon: "icon",
    template: createItem({
      itemType: "heading",
      variant: "h3",
    }),
  }
  // results note that is displayed below the main header
  const resultsNote = {
    items: "items",
    template: createItem({
      itemType: "text",
      variant: "",
    }),
  }
  // results group that contains the search results
  const resultsGroup = {
    items: "items",
    template: createItem({
      itemType: "group",
      layout: "column",
      firstAsTitle: true,
    }),
  }
  // results group header that displays category name and icon
  const resultsGroupHeader = {
    label: "label",
    icon: "icon",
    template: createItem({
      itemType: "heading",
      variant: "h4",
    }),
  }
  return { message, resultsHeader, resultsNote, resultsGroup, resultsGroupHeader }
}

function resultMessage(layout, text, icon) {
  const message = layout.value.search.message
  return [{
    ...message.template,
    [message.label]: text,
    [message.icon]: icon,
  }]
}

function resultHeaders(layout, headerText, headerIcon, noteText = undefined) {
  const header = layout.value.search.resultsHeader
  const note = layout.value.search.resultsNote
  const res = [{
    ...header.template,
    [header.label]: headerText,
    [header.icon]: headerIcon,
  }]
  if (noteText) {
    res.push({
      ...note.template,
      [note.label]: noteText,
    })
  }
  return res
}

function resultGroup(layout, catHeader, catIcon, items) {
  if (items.length === 0) return undefined
  const group = layout.value.search.resultsGroup
  const header = layout.value.search.resultsGroupHeader
  return {
    ...group.template,
    [group.items]: [
      {
        ...header.template,
        [header.label]: catHeader,
        [header.icon]: catIcon,
      },
      ...items,
    ],
  }
}

export const searchTemplates = {
  message: resultMessage,
  headers: resultHeaders,
  group: resultGroup,
}
