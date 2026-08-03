import { describe, it, expect, vi } from "vitest"
import { shallowMount } from "@vue/test-utils"
import { nextTick } from "vue"

vi.mock("@/common/directives", () => ({
  vBngOnUiNav: {},
  vBngDisabled: {},
  vBngTextInput: {},
  vBngScopedNav: {},
  vBngClick: {},
  vBngOnUiNavFocus: {},
}))

vi.mock("@/services/controls", async () => {
  const { ref } = await import("vue")
  return { default: () => ({ showIfController: ref(false) }) }
})

vi.mock("@/services/dirty", async () => {
  const { ref } = await import("vue")
  return { useDirty: () => ({ dirty: ref(false), currentCleanValue: ref(undefined), setDirty: vi.fn() }) }
})

vi.mock("@/services/scopedNav/api", () => ({
  useScopedNav: () => ({
    activateScope: vi.fn(),
    deactivateScope: vi.fn(),
  }),
}))

vi.mock("@/services/uniqueId", () => ({
  uniqueId: prefix => `${prefix}-test`,
}))

vi.mock("@/utils/rateLimit", () => ({
  debounce: fn => {
    const debounced = (...args) => fn(...args)
    debounced.cancel = vi.fn()
    return debounced
  },
}))

import { BngInput } from "@/common/components/base"

describe("BngInput.vue Test", () => {
  it("should have input value equal to modelValue prop", () => {
    const modelValue = "test"
    const wrapper = shallowMount(BngInput, {
      props: { modelValue },
    })
    const input = wrapper.find("input")

    expect(input.element.value).toEqual(modelValue)
  })

  it("should emit valueChanged on input change", async () => {
    const wrapper = shallowMount(BngInput)
    const input = wrapper.find("input")
    const inputValue = "test"

    await input.setValue(inputValue)

    expect(wrapper.emitted("valueChanged")).toHaveLength(1)
    expect(wrapper.emitted("valueChanged")[0]).toEqual([inputValue])
  })

  it("should have external label if set", () => {
    const externalLabelText = "label"
    const wrapper = shallowMount(BngInput, {
      props: { externalLabel: externalLabelText },
    })
    const externalLabel = wrapper.find(".external-label")

    expect(externalLabel.exists()).toBe(true)
    expect(externalLabel.text()).toEqual(externalLabelText)
  })

  it("should have leading icon if set", () => {
    const wrapper = shallowMount(BngInput, {
      props: { leadingIcon: { icon: "dummy" } },
    })

    expect(wrapper.find(".leading-icon").exists()).toBe(true)
  })

  it("should have trailing icon if set", () => {
    const wrapper = shallowMount(BngInput, {
      props: { trailingIcon: { icon: "dummy" } },
    })

    expect(wrapper.find(".trailing-icon").exists()).toBe(true)
  })

  it("should have suffix if set", () => {
    const suffixText = "suffix text"
    const wrapper = shallowMount(BngInput, {
      props: { suffix: suffixText },
    })
    const suffix = wrapper.find(".suffix")

    expect(suffix.exists()).toBe(true)
    expect(suffix.text()).toEqual(suffixText)
  })

  it("should have prefix if set", () => {
    const prefixText = "prefix text"
    const wrapper = shallowMount(BngInput, {
      props: { prefix: prefixText },
    })
    const prefix = wrapper.find(".prefix")

    expect(prefix.exists()).toBe(true)
    expect(prefix.text()).toEqual(prefixText)
  })

  it("should have error message if invalid", async () => {
    const errorText = "Invalid value"
    const wrapper = shallowMount(BngInput, {
      props: {
        validate: () => false,
        errorMessage: errorText,
      },
    })
    const input = wrapper.find("input")
    await input.setValue("abc")
    await nextTick()

    const errorMessage = wrapper.find(".error-message")
    expect(errorMessage.exists()).toBe(true)
    expect(errorMessage.text()).toEqual(errorText)
  })

  it("should not have optional elements if not set", () => {
    const wrapper = shallowMount(BngInput, {
      props: { showExternalButton: false },
    })

    expect(wrapper.find(".external-label").exists()).toBe(false)
    expect(wrapper.find(".leading-icon").exists()).toBe(false)
    expect(wrapper.find(".trailing-icon").exists()).toBe(false)
    expect(wrapper.find(".prefix").exists()).toBe(false)
    expect(wrapper.find(".suffix").exists()).toBe(false)
    expect(wrapper.find(".floating-label").exists()).toBe(false)
    expect(wrapper.find(".error-message").exists()).toBe(false)
    expect(wrapper.find(".external-button").exists()).toBe(false)
  })
})
