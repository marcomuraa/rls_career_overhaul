import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { BngSwitch } from '@/common/components/base'
import { bootstrapUiNavForTest } from '@/tests/bootstrapUiNav'
import { DOM_UI_NAVIGATION_EVENT } from '@/services/uiNav'

const valueChangedEventName = 'valueChanged'

// space/controller "ok" presses reach the component as a DOM_UI_NAVIGATION_EVENT
// dispatched on the focused element (see BngOnUiNav.js asMouse handling), not as a
// native keyup - so activation must be simulated through that event, not wrapper.trigger()
const fireOkNavEvent = (element, value) =>
    element.dispatchEvent(new CustomEvent(DOM_UI_NAVIGATION_EVENT, { detail: { name: 'ok', value, modified: false } }))

describe('bngSwitch.vue Test', () => {
    beforeEach(() => {
        bootstrapUiNavForTest()
    })

    it('should emit valueChanged event on click', async () => {
        const wrapper = shallowMount(BngSwitch)

        await wrapper.trigger('click')

        expect(wrapper.emitted(valueChangedEventName)).toHaveLength(1)
        expect(wrapper.emitted(valueChangedEventName)[0]).toEqual([true])
    })

    it('should emit valueChanged event on space key ', async () => {
        const wrapper = shallowMount(BngSwitch, { attachTo: document.body })
        wrapper.element.focus()

        fireOkNavEvent(wrapper.element, 1)
        fireOkNavEvent(wrapper.element, 0)
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted(valueChangedEventName)).toHaveLength(1)
        expect(wrapper.emitted(valueChangedEventName)[0]).toEqual([true])
    })

    it('should not emit valueChanged event on click when disabled ', async () => {
        const wrapper = shallowMount(BngSwitch, {propsData: {disabled: true}})

        await wrapper.trigger('click')

        expect(wrapper.emitted()).not.toHaveProperty(valueChangedEventName)
    })

    it('should not emit valueChanged event on space key when disabled', async () => {
        const wrapper = shallowMount(BngSwitch, { propsData: { disabled: true }, attachTo: document.body })
        wrapper.element.focus()

        fireOkNavEvent(wrapper.element, 1)
        fireOkNavEvent(wrapper.element, 0)
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted()).not.toHaveProperty(valueChangedEventName)
    })

    it('should be navigatable when enabled', async () => {
        const wrapper = shallowMount(BngSwitch)
        expect(wrapper.attributes('tabindex')).toEqual('0')
    })

    it('should not be navigatable when disabled', async () => {
        const wrapper = shallowMount(BngSwitch, {propsData: {disabled: true}})
        expect(wrapper.attributes('tabindex')).toEqual('-1')
    })
})