import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Emitter from 'eventemitter3'
import FuelNozzle from '@/modules/refuel/components/FuelNozzle.vue'
import { BngButton } from '@/common/components/base'

const bngVueMock = vi.fn(() => {
    isProd: false
})

vi.stubGlobal('bngVue', bngVueMock)

describe('Refuel/FuelNozzle.vue Test', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        // BngButton triggers a UI sound on mousedown/up, which reaches into the bridge
        window.bridge = {
            events: new Emitter(),
            api: {
                engineLua: vi.fn(),
                activeObjectLua: vi.fn(),
                serializeToLua: vi.fn(v => JSON.stringify(v)),
            },
        }
    })

    it('Button mouse down should emit triggerDown', async () => {
        const wrapper = mount(FuelNozzle, {
            props: {
                refuelType: 'fuel',
            },
            // BngBinding (the gamepad-hint chrome inside BngButton) needs a full app boot
            // (uiNavTracker, ScopeCoordinator, $simplemenu injection) that's out of scope here
            global: {
                stubs: { BngBinding: true },
            },
        })
        const bngButton = wrapper.findComponent(BngButton)

        await bngButton.trigger('mousedown')
        expect(wrapper.emitted('triggerDown')).toHaveLength(1)
    })

    it('Button mouse up should emit triggerUp', async () => {
        const wrapper = mount(FuelNozzle, {
            props: {
                refuelType: 'fuel',
            },
            global: {
                stubs: { BngBinding: true },
            },
        })
        const bngButton = wrapper.findComponent(BngButton)

        await bngButton.trigger('mouseup')
        expect(wrapper.emitted('triggerUp')).toHaveLength(1)
    })
})
