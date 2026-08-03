import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { BngProgressBar } from '@/common/components/base'
import { bootstrapUiNavForTest } from '@/tests/bootstrapUiNav'

const valueLabelId = '.value-label'

/** defineExpose-only members are not on wrapper.vm in @vue/test-utils < 2.4 */
function callExposed(wrapper, method, ...args) {
    const fn = wrapper.vm[method] ?? wrapper.getCurrentComponent().exposed?.[method]
    return fn(...args)
}

describe('BngProgressBar.vue Test', () => {
    beforeEach(() => {
        bootstrapUiNavForTest()
    })

    it('should have value equal to min prop if value is less than min prop', async () => {
        const min = 10
        const wrapper = shallowMount(BngProgressBar, { props: { value: 0, min: min, max: 100 } })

        await wrapper.vm.$nextTick()

        // the label is v-html injected, so the browser reparses the innerHTML on update -
        // find() must run after the update, otherwise it holds a stale, now-detached node
        expect(wrapper.find(valueLabelId).text()).toMatch(min.toString())
    })

    it('should increase value if increaseValueBy invoked', async () => {
        const value = 10, increaseBy = 20
        const wrapper = shallowMount(BngProgressBar, { props: { value: value, min: 0, max: 100 } })

        wrapper.vm.increaseValueBy(increaseBy)

        await wrapper.vm.$nextTick()

        expect(wrapper.find(valueLabelId).text()).toMatch((value + increaseBy).toString())
    })

    it('should decrease value if decreaseValueBy invoked', async () => {
        const value = 30, decreaseBy = 20
        const wrapper = shallowMount(BngProgressBar, { props: { value: value, min: 0, max: 100 } })

        wrapper.vm.decreaseValueBy(decreaseBy)

        await wrapper.vm.$nextTick()

        expect(wrapper.find(valueLabelId).text()).toMatch((value - decreaseBy).toString())
    })

    it('should set new value if setValue invoked', async () => {
        const value = 30
        const wrapper = shallowMount(BngProgressBar, { props: { value: 0, min: 0, max: 100 } })

        // wrapper.vm.setValue(value) // @vue/test-utils >= 2.4
        callExposed(wrapper, 'setValue', value) // @vue/test-utils < 2.4

        await wrapper.vm.$nextTick()

        expect(wrapper.find(valueLabelId).text()).toMatch((value).toString())
    })
})
