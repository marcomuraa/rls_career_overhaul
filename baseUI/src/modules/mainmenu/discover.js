import { ref, computed, proxyRefs } from "vue"
import { useBridge } from "@/bridge"
import { startLoading } from "@/services"
import { waitForLoadingScreenFadeIn } from "@/services/screenCover"
import Storage from "@/services/storage"

let discoverComposable = null

function createDiscoverComposable() {
  const bridge = useBridge()
  const { lua, events } = bridge

  const discoverPages = ref([])
  const loaded = ref(false)
  const enabled = ref(false)
  const viewMode = ref("overview")
  const descShow = ref(false)
  const descText = ref(null)
  const descriptions = ref({
    hover: null,
    focus: null,
  })
  const currentPage = ref(0)
  let descTimer = null

  const storage = new Storage("discover", {
    lastSelected: 0, // index by allCards
    lastStarted: undefined, // discoverId of last started activity
  }).values

  // Lua tables may arrive as objects with numeric keys instead of JS arrays.
  function luaArrayToJs(value) {
    if (Array.isArray(value)) return value
    if (!value || typeof value !== "object") return []
    return Object.keys(value)
      .filter(key => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map(key => value[key])
  }

  function setDescription(type, card = undefined) {
    if (descTimer) clearTimeout(descTimer)
    descriptions.value[type] = card?.description
    if (card) {
      descShow.value = true
      descText.value = card.description
    } else if (type === "hover" && descriptions.value.focus) {
      descText.value = descriptions.value.focus
    } else {
      descTimer = setTimeout(() => {
        descShow.value = false
        descTimer = setTimeout(() => {
          descText.value = null
          descTimer = null
        }, 200) // transition time
      }, 100) // cooldown
    }
  }

  function clearDescription() {
    descriptions.value = {
      hover: null,
      focus: null,
    }
    descShow.value = false
    descText.value = null
  }

  function getPageByIndex(pageIndex) {
    if (!discoverPages.value || !Array.isArray(discoverPages.value)) {
      return undefined
    }
    if (pageIndex < 0 || pageIndex >= discoverPages.value.length) {
      return undefined
    }
    return discoverPages.value[pageIndex]
  }

  function getSectionsFromPage(page) {
    const baseSections = []
    let stamp = Date.now()

    const pageSections = luaArrayToJs(page?.sections)
    if (!page || pageSections.length === 0) {
      return baseSections
    }

    for (const section of pageSections) {
      const sectionCards = luaArrayToJs(section?.cards)
      if (sectionCards.length > 0) {
        const sectionKind = section.sectionKind || (section.type === "freeroam" ? "major" : "minor")
        const isMajor = sectionKind === "major"
        const sectionConfig = {
          cards: [],
          placeholders: isMajor ? 3 : 6,
          size: isMajor ? "big" : "medium",
          style: isMajor ? {} : { "--button-height": "4.5em" },
          key: stamp++,
          sectionKind,
        }

        for (const card of sectionCards) {
          const cardWithHandlers = {
            ...card,
            onClick: () => startDiscover(card.discoverId),
            onFocus: () => setDescription("focus", card),
            onHover: () => setDescription("hover", card),
            onBlur: () => setDescription("focus"),
          }
          sectionConfig.cards.push(cardWithHandlers)
        }

        baseSections.push(sectionConfig)
      }
    }

    return baseSections
  }

  async function loadDiscoverPages() {
    loaded.value = false
    enabled.value = false
    viewMode.value = "overview"
    discoverPages.value = []
    currentPage.value = 0
    clearDescription()
    await lua.extensions.load("gameplay_discover")

    const rawPages = await lua.gameplay_discover.getDiscoverPages()
    discoverPages.value = luaArrayToJs(rawPages).map(page => ({
      ...page,
      title: page?.title || page?.description?.title,
      description: page?.description?.description || page?.description,
      image: page?.description?.image || page?.image,
      tagList: luaArrayToJs(page?.tagList),
      sections: luaArrayToJs(page?.sections).map(section => ({
        ...section,
        cards: luaArrayToJs(section?.cards).map(card => ({
          ...card,
          title: card?.title || card?.name,
        })),
      })),
    }))
    loaded.value = true
    enabled.value = true
  }

  async function startDiscover(discoverId) {
    const cardIndex = allCards.value.findIndex(card => card.discoverId === discoverId)
    if (cardIndex === -1) {
      console.warn(`startDiscover: card not found: ${discoverId}`)
      return
    }

    storage.lastSelected = cardIndex
    storage.lastStarted = discoverId

    enabled.value = false
    events.emit("LoadingScreen", { active: true })

    await startLoading(async () => {
      await waitForLoadingScreenFadeIn()
      await lua.gameplay_discover.startDiscover(discoverId)
    })
  }

  function goToPage(pageIndex) {
    const page = getPageByIndex(pageIndex)
    if (!page) return
    currentPage.value = pageIndex
  }

  function openPage(pageIndex) {
    goToPage(pageIndex)
    clearDescription()
    viewMode.value = "detail"
  }

  function backToOverview() {
    clearDescription()
    viewMode.value = "overview"
  }

  const sections = computed(() => {
    return getSectionsFromPage(getPageByIndex(currentPage.value))
  })

  const allCards = computed(() => {
    const pages = luaArrayToJs(discoverPages.value)
    const cards = []
    for (const page of pages) {
      const pageSections = luaArrayToJs(page?.sections)
      for (const section of pageSections) {
        cards.push(...luaArrayToJs(section?.cards))
      }
    }
    return cards
  })

  const description = computed(() => ({
    show: descShow.value,
    text: descText.value,
  }))

  const lastSelectedIndex = computed({ get: () => storage.lastSelected, set: value => storage.lastSelected = value })
  const lastStartedDiscoverId = computed(() => {
    if (storage.lastStarted) return storage.lastStarted
    // Find the first card from any section
    for (const section of sections.value) {
      if (section.cards.length > 0) {
        return section.cards[0].discoverId
      }
    }
    return undefined
  })

  const totalPages = computed(() => discoverPages.value?.length || 0)

  const pages = computed(() => {
    if (!discoverPages.value || !Array.isArray(discoverPages.value)) {
      return []
    }
    return discoverPages.value.map((page, index) => ({
      index,
      title: page.title || `Page ${index + 1}`,
      isActive: index === currentPage.value,
      pageKind: page.pageKind || "minor",
      isHero: !!page.isHero,
      startDiscoverId: page.startDiscoverId,
      image: page.image,
      tagList: page.tagList || [],
      description: page.description,
      isOfficial: page.isOfficial,
      isMod: page.isMod,
      modTitle: page.modTitle,
    }))
  })

  const majorPages = computed(() => pages.value.filter(page => page.pageKind === "major"))
  const minorPages = computed(() => pages.value.filter(page => page.pageKind !== "major"))

  const currentPageTitle = computed(() => {
    if (!discoverPages.value || !Array.isArray(discoverPages.value) || currentPage.value >= discoverPages.value.length) {
      return "ui.experiences.general.quickStart"
    }
    const page = discoverPages.value[currentPage.value]
    return page.title || "ui.experiences.general.quickStart"
  })

  const currentPageDescription = computed(() => {
    if (!discoverPages.value || !Array.isArray(discoverPages.value) || currentPage.value >= discoverPages.value.length) {
      return null
    }
    return discoverPages.value[currentPage.value]?.description || null
  })

  function getSectionsForPage(pageIndex) {
    return getSectionsFromPage(getPageByIndex(pageIndex))
  }

  return proxyRefs({
    loaded,
    enabled,
    viewMode,
    sections,
    allCards,
    description,
    lastSelectedIndex,
    lastStartedDiscoverId,
    currentPage,
    totalPages,
    pages,
    majorPages,
    minorPages,
    currentPageTitle,
    currentPageDescription,
    discoverPages,
    goToPage,
    openPage,
    backToOverview,
    getSectionsForPage,
    loadDiscoverPages,
    startDiscover,
  })
}

export function useDiscover() {
  if (!discoverComposable) {
    discoverComposable = createDiscoverComposable()
  }
  return discoverComposable
}
