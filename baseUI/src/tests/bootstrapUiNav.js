import { vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import Emitter from "eventemitter3"
import { lua } from "@/bridge"
import { UINavService, setUINavServiceInstance } from "@/services/uiNav"
import { ScopeCoordinator, setScopeCoordinatorInstance } from "@/services/scopedNav"

// mirrors main.js's boot sequence (bridge>UINavService>ScopeCoordinator>Pinia)
export function bootstrapUiNavForTest() {
  setActivePinia(createPinia())

  const events = new Emitter()
  window.bridge = {
    events,
    api: {
      engineLua: vi.fn(),
      activeObjectLua: vi.fn(),
      serializeToLua: vi.fn(v => JSON.stringify(v)),
    },
    lua,
  }

  const uiNavService = new UINavService(events)
  setUINavServiceInstance(uiNavService)
  uiNavService.initialize()

  setScopeCoordinatorInstance(new ScopeCoordinator())
}
