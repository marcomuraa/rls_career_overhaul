import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Logger from "@/services/logger"

const getSourceMock = vi.fn()
vi.mock("@/services/modManager/source", () => ({
  getSource: (...args) => getSourceMock(...args),
}))

import { getComponent, buildComponent, resetComponentCache, resetAllCaches } from "@/services/modManager/compiler.runtime"

const PLAIN_SOURCE = "<template><div/></template>"

describe("services/modManager/compiler.runtime", () => {
  let rt
  let fakeComponent

  beforeEach(() => {
    getSourceMock.mockReset()
    getSourceMock.mockResolvedValue(PLAIN_SOURCE)
    vi.spyOn(Logger, "warn").mockImplementation(() => {})
    vi.spyOn(Logger, "error").mockImplementation(() => {})

    fakeComponent = { name: "FakeMod" }
    rt = {
      loadModule: vi.fn(async () => ({ default: fakeComponent })),
      resolve: vi.fn((_, url) => url),
      invalidate: vi.fn(),
      unload: vi.fn(),
    }
    window.__bngRuntime = rt
  })

  afterEach(() => {
    resetAllCaches()
    delete window.__bngRuntime
    vi.restoreAllMocks()
  })

  describe("getComponent", () => {
    it("compiles a mod through the runtime graph", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      const result = await getComponent(fileUrl)

      expect(rt.loadModule).toHaveBeenCalledWith(fileUrl)
      expect(result.compiled).toBe(true)
      expect(result.component).toBe(fakeComponent)
      expect(result.styles).toBe("")
      expect(result.substyles).toEqual([])
      expect(result.files).toEqual([fileUrl])
      expect(result.meta.dataid).toMatch(/^data-bngmod-[a-z0-9]+$/)
    })

    it("returns a deferred UiMod when returnCompiled is false", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      const deferred = await getComponent(fileUrl, false, false)

      expect(deferred.compiled).toBe(false)
      expect(typeof deferred.compile).toBe("function")
      expect(deferred.styles).toBe("")
      expect(rt.loadModule).not.toHaveBeenCalled()

      const compiled = await deferred.compile()
      expect(compiled.compiled).toBe(true)
      expect(rt.loadModule).toHaveBeenCalledWith(fileUrl)
    })

    it("wraps a loadModule failure into an error result instead of throwing", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      rt.loadModule.mockRejectedValueOnce(new Error("boom"))

      const result = await getComponent(fileUrl)
      expect(result.error).toBe("boom")
      expect(result.errorObj).toBeInstanceOf(Error)
      expect(result.component).toBeUndefined()
      expect(result.meta).toBeTruthy()
    })

    it("errors when the module has no default export", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      rt.loadModule.mockResolvedValueOnce({})

      const result = await getComponent(fileUrl)
      expect(result.error).toBe("Mod module has no default component export")
    })

    it("errors gracefully when window.__bngRuntime is unavailable", async () => {
      delete window.__bngRuntime
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"

      const result = await getComponent(fileUrl)
      expect(result.error).toMatch(/Runtime graph/)
    })

    it("resets the mod before recompiling when refresh is true", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      await getComponent(fileUrl)
      rt.invalidate.mockClear()
      rt.unload.mockClear()

      await getComponent(fileUrl, true)

      expect(rt.resolve).toHaveBeenCalledWith(undefined, fileUrl)
      expect(rt.invalidate).toHaveBeenCalledWith(fileUrl)
      expect(rt.unload).toHaveBeenCalledWith("/ui/ui-vue/mods/ModA")
    })
  })

  describe("buildComponent", () => {
    it("compiles without a refresh, matching getComponent", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      const result = await buildComponent(fileUrl)

      expect(result.compiled).toBe(true)
      expect(rt.loadModule).toHaveBeenCalledWith(fileUrl)
    })
  })

  describe("resetComponentCache / resetAllCaches", () => {
    it("resets a single tracked mod by file url", async () => {
      const fileA = "/ui/ui-vue/mods/ModA/Comp.vue"
      const fileB = "/ui/ui-vue/mods/ModB/Comp.vue"
      await getComponent(fileA)
      await getComponent(fileB)
      rt.invalidate.mockClear()
      rt.unload.mockClear()

      resetComponentCache(fileA)

      expect(rt.invalidate).toHaveBeenCalledWith(fileA)
      expect(rt.unload).toHaveBeenCalledWith("/ui/ui-vue/mods/ModA")
      expect(rt.invalidate).not.toHaveBeenCalledWith(fileB)
    })

    it("resets every tracked mod when called with no argument", async () => {
      const fileA = "/ui/ui-vue/mods/ModA/Comp.vue"
      const fileB = "/ui/ui-vue/mods/ModB/Comp.vue"
      await getComponent(fileA)
      await getComponent(fileB)
      rt.invalidate.mockClear()

      resetComponentCache()

      expect(rt.invalidate).toHaveBeenCalledWith(fileA)
      expect(rt.invalidate).toHaveBeenCalledWith(fileB)
    })

    it("resetAllCaches clears tracking so a later reset touches nothing", async () => {
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      await getComponent(fileUrl)

      resetAllCaches()
      rt.invalidate.mockClear()
      resetAllCaches()

      expect(rt.invalidate).not.toHaveBeenCalled()
    })
  })

  describe("mod metadata", () => {
    it("reads modInfo from the non-setup <script> block only", async () => {
      getSourceMock.mockResolvedValue([
        "<script>",
        "export const modInfo = { uiSlots: [\"test\"] }",
        "</script>",
        "<script setup>",
        "export const modInfo = { uiSlots: [\"mainmenu.top\"] }",
        "</script>",
        "<template><div/></template>",
      ].join("\n"))

      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"
      const result = await getComponent(fileUrl)

      expect(result.meta.uiSlots).toEqual(["test"])
    })

    it("falls back to a bare meta object when the source cannot be read", async () => {
      getSourceMock.mockRejectedValue(new Error("network error"))
      const fileUrl = "/ui/ui-vue/mods/ModA/Comp.vue"

      const result = await getComponent(fileUrl)
      expect(result.meta).toEqual({ dataid: result.meta.dataid })
      expect(result.compiled).toBe(true)
    })
  })
})
