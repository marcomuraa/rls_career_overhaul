import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { useBridge, lua } from "@/bridge"

export const useVehicleShoppingStore = defineStore("vehicleShopping", () => {
  const { events } = useBridge()

  const vehicleShoppingData = ref({})

  // selectedSellerId is owned by Lua (career_modules_vehicleShopping); the UI just
  // reads it back from the guihook payload and derives filtering/seller from it.
  const selectedSellerId = computed(() => vehicleShoppingData.value.selectedSellerId || "")

  const currentSeller = computed(() => {
    const dealerships = vehicleShoppingData.value.uiDealershipsData
    if (!dealerships || !selectedSellerId.value) return null
    return Object.values(dealerships).find(dealership => dealership.id === selectedSellerId.value) || null
  })

  const buildFilteredListByKey = key => {
    const source = vehicleShoppingData.value[key]
    if (!source) return []

    const filteredList = Object.values(source).filter(item => !selectedSellerId.value || item.sellerId === selectedSellerId.value)
    filteredList.sort((a, b) => a.Value - b.Value)
    return filteredList
  }

  const filteredVehicles = computed(() => buildFilteredListByKey("vehiclesInShop"))
  const filteredSoldVehicles = computed(() => buildFilteredListByKey("soldVehicles"))

  const handleShoppingData = data => {
    vehicleShoppingData.value = data
  }

  // Tracks whether the guihook listener is currently attached so listen(true)
  // can run safely on every route entry without stacking duplicate handlers.
  let listening = false

  // Lua events
  const listen = state => {
    if (state === listening) return
    listening = state
    const method = state ? "on" : "off"
    events[method]("vehicleShoppingData", handleShoppingData)
  }
  listen(true)

  // Actions
  const requestInitialData = () => {
    // Re-subscribe on route entry: the listener may have been removed by a
    // previous leaveShopping(), so re-attach before asking Lua to emit data.
    listen(true)
    lua.career_modules_vehicleShopping.sendShoppingDataToUI()
  }

  function dispose() {
    listen(false)
  }

  // Final teardown when leaving the whole vehicle-shopping route family. Both the
  // seller-grid screen and the vehicle-list screen share this single store, so
  // whichever one is last to unmount on family exit runs this. Safe to call more
  // than once: removing the listener and removing the Lua tether are idempotent.
  function leaveShopping() {
    lua.career_modules_vehicleShopping.onShoppingMenuClosed()
    dispose()
    // Clear cached data so stale seller info (e.g. apmStarterVehicles) cannot
    // render on the next entry before fresh data arrives from Lua.
    vehicleShoppingData.value = {}
  }

  return {
    vehicleShoppingData,
    selectedSellerId,
    filteredVehicles,
    filteredSoldVehicles,
    currentSeller,
    requestInitialData,
    dispose,
    leaveShopping,
  }
})
