import { describe, it, expect } from "vitest"
import { uniqueNum, uniqueId, uniqueSafeId, stableId, stableIds } from "@/services/uniqueId"

describe("services/uniqueId", () => {
  describe("uniqueNum", () => {
    it("returns a number", () => {
      expect(typeof uniqueNum()).toBe("number")
    })

    it("yields a different value on each call", () => {
      expect(uniqueNum()).not.toBe(uniqueNum())
    })
  })

  describe("uniqueId", () => {
    it("prefixes the name using the default dot separator", () => {
      expect(uniqueId("foo")).toMatch(/^foo\./)
    })

    it("is unique across calls", () => {
      expect(uniqueId("foo")).not.toBe(uniqueId("foo"))
    })

    it("applies a custom separator and contains no dot", () => {
      const id = uniqueId("foo", "-")
      expect(id.startsWith("foo-")).toBe(true)
      expect(id).not.toContain(".")
    })

    it("omits the leading separator when no name is given", () => {
      const id = uniqueId("", "-")
      expect(id.startsWith("-")).toBe(false)
      expect(id).not.toContain(".")
    })
  })

  describe("uniqueSafeId", () => {
    it("has no dot and no leading underscore", () => {
      const id = uniqueSafeId()
      expect(id).not.toContain(".")
      expect(id.startsWith("_")).toBe(false)
    })

    it("is unique across calls", () => {
      expect(uniqueSafeId()).not.toBe(uniqueSafeId())
    })
  })

  describe("stableId", () => {
    const input = "/ui/ui-vue/mods/BngDebug/MainMenuDebug.vue"

    it("returns the same id for the same input", () => {
      expect(stableId(input)).toBe(stableId(input))
    })

    it("prepends the optional prefix to the bare id", () => {
      expect(stableId(input, "data-bngmod-")).toBe(`data-bngmod-${stableId(input)}`)
    })

    it("produces a base36 hash with no prefix by default", () => {
      expect(stableId(input)).toMatch(/^[a-z0-9]+$/)
    })

    it("differs for different inputs", () => {
      expect(stableId(input)).not.toBe(stableId(input + "x"))
    })

    it("handles empty/nullish input without throwing", () => {
      expect(stableId("", "p-")).toMatch(/^p-[a-z0-9]+$/)
      expect(stableId(undefined)).toBe(stableId(""))
    })

    it("records each assignment in a registry searchable by name and by hash", () => {
      const id = stableId(input) // bare, no prefix
      expect(stableIds.byName.get(input)).toBe(id)
      expect(stableIds.byHash.get(id)).toBe(input)
    })

    it("never assigns the same hash to two different names", () => {
      Array.from({ length: 1000 }, (_, i) => `/mods/Mod${i}/App${i}.vue`).forEach(stableId)
      // every recorded name has its own unique bare hash
      expect(stableIds.byHash.size).toBe(stableIds.byName.size)
    })
  })
})
