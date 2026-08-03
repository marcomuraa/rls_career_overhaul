import { vi, describe, it, beforeEach, expect } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import Emitter from "eventemitter3"
import { useRefuelStore } from "@/modules/refuel/refuelStore"

describe("Refuel/refuelStore Test", () => {
    beforeEach(() => {
        window.bridge = {
            events: new Emitter(),
            api: {
                engineLua: vi.fn(),
                activeObjectLua: vi.fn(),
                serializeToLua: vi.fn(v => JSON.stringify(v)),
            },
        }
        setActivePinia(createPinia())
    })

    it("Should have initial currentFuelData equal to first energyType value", () => {
        const refuelStore = useRefuelStore()
        const fuelData = {
            energyTypes: ["gasoline"],
            fuelData: [
                {
                    currentEnergy: 35,
                    energyType: "gasoline",
                    maxEnergy: 35,
                    pricePerUnit: 1.9,
                    unit: "L",
                },
            ],
        }

        window.bridge.events.emit("initialFuelingData", fuelData)
        expect(refuelStore.currentFuelData).not.toBeUndefined()
    })
})
