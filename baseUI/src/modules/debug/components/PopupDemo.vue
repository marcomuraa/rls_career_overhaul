<template>
  <div class="popup-demo">
    <section class="popup-demo__column">
      <div v-for="popup in popups" :key="popup.name" class="popup-demo__row">
        <BngButton accent="secondary" @click="popup.open()">{{ popup.name }}</BngButton>
        <span v-if="popup.result">Result: {{ popup.result }}</span>
      </div>
      <div class="popup-demo__row popup-demo__actions">
        <BngButton accent="secondary" @click="popupAll()">Open all (at once)</BngButton>
        <BngButton accent="secondary" @click="popupAll(true)">Open all (sequential)</BngButton>
      </div>
    </section>
    <section class="popup-demo__column">
      <div v-for="toast in toasts" :key="toast.name" class="popup-demo__row">
        <BngButton accent="secondary" @click="toast.open()">{{ toast.name }}</BngButton>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, h } from "vue"
import { BngButton, BngInput, ACCENTS } from "@/common/components/base"
import { openMessage, openConfirmation, openExperimental, openPrompt, openProgress, openFormDialog, fixedDelayPopup } from "@/services/popup"
import { showToast } from "@/services/toast"
import { $translate } from "@/services/translation"

const FormDemoView = {
  props: { modelValue: { type: Object, default: () => ({}) } },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => h(BngInput, {
      modelValue: props.modelValue?.text ?? "",
      "onUpdate:modelValue": v => emit("update:modelValue", { ...props.modelValue, text: v }),
    })
  },
}

const popups = reactive({
  message: {
    name: "Message",
    async open() {
      await openMessage(null, "Test message please ignore")
    },
  },
  prompt: {
    name: "Prompt",
    async open() {
      const res = await openPrompt("Enter some text:")
      popups.prompt.result = res.toString()
    },
  },
  progressWithButtons: {
    name: "Progress with cancel button (indeterminate)",
    async open() {
      await openProgress("Please wait...", "", {
        cancellable: true,
        indeterminate: true,
        timeout: 5,
        buttons: [
          { label: $translate.instant("ui.common.cancel"), value: false, extras: { accent: ACCENTS.text, cancel: true } }
        ],
      })
    },
  },
  progress: {
    name: "Progress (indeterminate) (no cancel)",
    async open() {
      await openProgress("Please wait...", "", {
        indeterminate: true,
        timeout: 5,
      })
    },
  },
  progressFake: {
    name: "Progress (time countdown)",
    async open() {
      await fixedDelayPopup(5, { title: "Doing Things" })
    },
  },
  message_title: {
    name: "Message, with title",
    async open() {
      await openMessage("Test", "Test message please ignore")
    },
  },
  confirm: {
    name: "Confirmation, with title",
    result: "",
    async open() {
      const res = await openConfirmation("Test", "Test confirmation please ignore")
      popups.confirm.result = res.toString()
    },
  },
  confirmWithComponent: {
    name: "Confirmation, with component content",
    result: "",
    async open() {
      const res = await openConfirmation("", { component: BngButton, props: { label: "Hello" } })
      popups.confirm.result = res.toString()
    },
  },
  experimental: {
    name: "Experimental confirmation",
    result: "",
    async open() {
      const res = await openExperimental("Experimental test", "Experimental-style confirmation...<br/>...please ignore", [
        { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.text, cancel: true } },
        { label: $translate.instant("ui.career.experimentalAgree"), value: true, extras: { default: true } },
      ])
      popups.experimental.result = res && res.toString()
    },
  },
  destructive: {
    name: "Confirmation with destructive action (canonical)",
    result: "",
    async open() {
      // unordered:false opts into the canonical role engine.
      const res = await openConfirmation(
        "Delete file",
        "This will permanently delete the file. Continue?",
        [
          { label: $translate.instant("ui.common.delete"), value: true, extras: { confirm: true, destructive: true } },
          { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true } },
        ],
        "",
        false
      )
      popups.destructive.result = res.toString()
    },
  },
  ordered: {
    name: "Confirmation, canonical order + focus (Yes/No)",
    result: "",
    async open() {
      // Author order is Yes then No; canonical render puts cancel left, confirm right, focus on confirm.
      const res = await openConfirmation(
        "Save changes",
        "Do you want to save your changes?",
        [
          { label: $translate.instant("ui.common.yes"), value: true, extras: { confirm: true } },
          { label: $translate.instant("ui.common.no"), value: false, extras: { cancel: true } },
        ],
        "",
        false
      )
      popups.ordered.result = res.toString()
    },
  },
  formDialog: {
    name: "Form dialog (with cancel)",
    result: "",
    async open() {
      const res = await openFormDialog(
        FormDemoView,
        { text: "" },
        () => ({ error: false }),
        "Form dialog",
        "Form dialog test please ignore",
        [
          { label: $translate.instant("ui.common.okay"), value: true, emitData: true },
          { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true, accent: ACCENTS.text } },
        ],
      )
      popups.formDialog.result = res?.value?.toString?.() ?? String(res)
    },
  },
})

const toasts = reactive({
  info: {
    name: "Toast: info",
    open() {
      showToast({ type: "info", message: "Informational toast message." })
    },
  },
  success: {
    name: "Toast: success",
    open() {
      showToast({ type: "success", title: "Saved", message: "Your changes were saved successfully." })
    },
  },
  warning: {
    name: "Toast: warning",
    open() {
      showToast({ type: "warning", message: "Something needs your attention.", timeout: 8, progressBar: true })
    },
  },
  error: {
    name: "Toast: error",
    open() {
      showToast({ type: "error", title: "Load failed", message: "Could not load the requested resource.", closeButton: true })
    },
  },
  persistent: {
    name: "Toast: persistent + close",
    open() {
      showToast({
        type: "error",
        title: "Persistent error",
        message: "Stays until dismissed manually.",
        persistent: true,
        closeButton: true,
      })
    },
  },
  clickable: {
    name: "Toast: clickable",
    open() {
      showToast({
        type: "info",
        title: "Click me",
        message: "Runs an action when activated.",
        onClick: () => showToast({ type: "success", message: "Toast clicked!", timeout: 2 }),
      })
    },
  },
  multiline: {
    name: "Toast: long multiline",
    open() {
      showToast({
        type: "warning",
        title: "Long message",
        message: [
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
          "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.",
          "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.",
          "Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.",
          "Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui.",
        ].join("\n\n"),
        timeout: 15,
        closeButton: true,
        progressBar: true,
      })
    },
  },
  bbcode: {
    name: "Toast: BBCode",
    open() {
      showToast({
        type: "info",
        title: "[b]Rich BBCode[/b] toast",
        message: [
          "Read the [url=https://go.beamng.com/vr]VR documentation[/url] for setup help.",
          "Press [action=toggle_pause] to open the pause menu.",
          "[COLOR=#ff9f43]Highlighted[/COLOR] text with [i]emphasis[/i] and [s]strikethrough[/s].",
        ].join("[br][br]"),
        timeout: 10,
        closeButton: true,
      })
    },
  },
  queue: {
    name: "Toast: queue burst",
    open() {
      for (let i = 1; i <= 7; i++) {
        showToast({ type: "info", message: `Queued toast #${i}`, timeout: 6 })
      }
    },
  },
})

async function popupAll(doAsync) {
  for (const popup of Object.values(popups)) {
    console.log(`Opening "${popup.name}"`)
    if (doAsync) await popup.open()
    else popup.open()
  }
}
</script>

<style scoped lang="scss">
.popup-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.popup-demo__column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.popup-demo__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.popup-demo__actions {
  margin-top: 0.5rem;
}
</style>

<script>

// Demo Metadata
// -------------------------------------------------------
import source from "./PopupDemo.vue?raw"
export default {
  source,
  title: "TODO - Friendly name",
  description: `TODO - Description of special demo`,
  propInfo: [],
  attrInfo: [],
}

</script>