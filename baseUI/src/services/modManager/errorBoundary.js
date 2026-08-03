import { defineComponent, h, ref, onErrorCaptured } from "vue"

const BOX_STYLE = "background:#3119;color:#faa;padding:.25rem;font:12px/1.4 monospace;white-space:pre-wrap"

export function brokenComponentPlaceholder(message) {
  return defineComponent({
    name: "BngBrokenComponent",
    inheritAttrs: false,
    render() {
      return h("div", { class: "bng-broken-component", style: BOX_STYLE }, `\u26a0 ${message}`)
    },
  })
}

export function withErrorBoundary(component, label = "component") {
  return defineComponent({
    name: "BngErrorBoundary",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const failed = ref(null)
      onErrorCaptured(err => { failed.value = err; return false })
      return () => failed.value
        ? h("div", { class: "bng-broken-component", style: BOX_STYLE }, `\u26a0 ${label} broke: ${(failed.value && failed.value.message) || failed.value}`)
        : h(component, attrs, slots)
    },
  })
}
