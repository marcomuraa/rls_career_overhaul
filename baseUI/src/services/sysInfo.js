// System Info service
import { ref, computed } from "vue"
import { useBridge, lua } from "@/bridge"

let api, events, beamNG

// Refs for dynamic data
const serviceProviders = ref(),
  online = ref(false),
  videoAdapter = ref(""),
  modCounts = ref({ total: 0, active: 0 }),
  gameState = ref(),
  mainMenuBackgroundRequired = ref(),
  mainMenuFirstTime = ref(true),
  workbenchFilesPresent = ref(false),
  multiplayerAvailable = ref(false)

const serviceProvidersOnline = computed(() => {
  const provs = serviceProviders.value
  const gotInfo = !!provs
  const ret = {
    eos: gotInfo && provs.eos && provs.eos.loggedin,
    steam: gotInfo && provs.steam && provs.steam.loggedin && provs.steam.working,
  }
  ret.any = Object.values(ret).some(v => v)
  return ret
})

// normal vars for unchanging data
let version, versionSimple, buildInfo

/**
 * Initializes the System Info service, sets up listeners etc.
 * Gets called automatically - should never be a need to call this yourself
 */
const init = () => {
  ({ api, events, beamNG } = useBridge())

  if (!beamNG) beamNG = FAKE_BEAMNG_OBJ // avoid problems when running outside game

  // do quick check right in main menu, to ensure *some* of our UI/LUA code can work in languages with certain non-english characters
  api.serializeToLuaCheck("English: " + "hello")
  api.serializeToLuaCheck("Spanish: " + "güeñes")
  api.serializeToLuaCheck("French: " + "bâguéttè, garçon")
  api.serializeToLuaCheck("Czech: " + "Kl�vesnice")
  api.serializeToLuaCheck("Korean: " + decodeURIComponent("%0D%EF%BF%BD%EF%BF%BD%0B%EF%BF%BD%EF%BF%BD%0B%EF%BF%BD%EF%BF%BD"))
  api.serializeToLuaCheck("Chinese Sim: " + "欢迎来到简体中文版的")
  api.serializeToLuaCheck("Chinese Tr: " + "歡迎來到")
  api.serializeToLuaCheck("Japanese: " + "』日本語版にようこそ")
  api.serializeToLuaCheck("Polish: " + "źćłąóę")
  api.serializeToLuaCheck("Russian: " + "абвгеёьъ")

  // Monitor service provider information
  events.on("ServiceProviderInfo", info => serviceProviders.value = info)

  // Monitor online state changes
  events.on("OnlineStateChanged", state => online.value = state)

  // Monitor mod state changes
  events.on("ModManagerModsChanged", _processModData)

  // Monitor mod state changes
  events.on("ShowEntertainingBackground", state => mainMenuBackgroundRequired.value = state)

  // Game state
  // e.g.: {state: 'freeroam', menuItems: 'freeroam', appLayout: 'freeroam'}
  // in mainmenu, the whole object is {}
  events.on("GameStateUpdate", state => gameState.value = state?.state)

  // store version, versionSimple, and buildInfo strings - these won't be changing (right?)
  version = beamNG.version
  versionSimple = _toSimpleVersion(beamNG.version)
  buildInfo = beamNG.buildinfo

  // request all data
  refresh()
}

const isInGame = async () => {
  try {
    const state = await lua.core_gamestate.getGameState()
    gameState.value = state?.state
  } catch {}
  return !!gameState.value
}

/**
 * Refresh all dynamic data (refs)
 */
const refresh = () => {
  beamNG.requestServiceProviderInfo()
  lua.core_online.requestState()
  lua.Engine.Render.getAdapterType().then(adapter => (videoAdapter.value = adapter))
  lua.core_gamestate.requestGameState()
  lua.core_modmanager.requestState()
  api.engineLua("MP ~= nil", res => multiplayerAvailable.value = !!res)
  api.engineLua("FS:fileExists('/workbench/web/index.html')", present => workbenchFilesPresent.value = !!present)
}

export default {
  init,
  refresh,
  isInGame,

  // refs
  serviceProviders,
  serviceProvidersOnline,
  online,
  videoAdapter,
  modCounts,
  gameState,
  mainMenuBackgroundRequired,
  mainMenuFirstTime,
  multiplayerAvailable,
  workbenchFilesPresent,
  // static data
  get version() {
    return version
  },
  get versionSimple() {
    return versionSimple
  },
  get buildInfo() {
    return buildInfo
  }
}

const _toSimpleVersion = versionStr => {
  let bits = versionStr.split(".")
  if (bits.length == 5) bits.pop() // remove build number (5th)
  return bits.join(".").replace(/(\.0)+$/, "") // remove trailing zeros
}

const _processModData = data => {
  const mods = Object.values(data).filter(mod => mod.modname != "translations")
  modCounts.value.total = mods.length
  modCounts.value.active = mods.filter(({ active }) => active).length
}

// Fake data when working outside game
const FAKE_BEAMNG_OBJ = {
  version: "0.12.3.4.FAKE12345",
  buildInfo: "Sample Fake BuildInfo - running outside of game",
  requestServiceProviderInfo() {
    events.emit("ServiceProviderInfo", {
      steam: {
        loggedin: true,
        accountID: '12345678901234567',
        playerName: "fakeplayer",
        branch: "qa_latest",
        language: "english",
        useSteam: true,
        working: true,
      },
    })
  },
}
