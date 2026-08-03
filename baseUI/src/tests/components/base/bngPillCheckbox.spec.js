import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Emitter from 'eventemitter3'
import { BngPillCheckbox, BngPill } from '@/common/components/base'

const valueChangedEvent = 'valueChanged'

const bngVueMock = vi.fn(() => {
    isProd: false
})

vi.stubGlobal('bngVue', bngVueMock)

describe('BngPillCheckbox.vue Test', () => {
    beforeEach(() => {
        // BngPill triggers a UI sound on click/keyup, which reaches into the bridge
        window.bridge = {
            events: new Emitter(),
            api: {
                engineLua: vi.fn(),
                activeObjectLua: vi.fn(),
                serializeToLua: vi.fn(v => JSON.stringify(v)),
            },
        }
    })

    it('should emit valueChanged on click', async () => {
        const wrapper = mount(BngPillCheckbox)
        const bngPill = wrapper.findComponent(BngPill)

        await bngPill.trigger('click')

        expect(wrapper.emitted(valueChangedEvent)).toHaveLength(1)
        expect(wrapper.emitted(valueChangedEvent)[0]).toEqual([true])
    })

    it('should emit valueChanged on keyup.space', async () => {
        const wrapper = mount(BngPillCheckbox)
        const bngPill = wrapper.findComponent(BngPill)

        await bngPill.trigger('keyup.space')

        expect(wrapper.emitted(valueChangedEvent)).toHaveLength(1)
        expect(wrapper.emitted(valueChangedEvent)[0]).toEqual([true])
    })
})