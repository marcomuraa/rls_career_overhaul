<template>
  <div class="messages-app">
    <div
      v-for="item in messagesList"
      :key="item._key"
      class="message-row"
    >
      <div v-if="showIcons && item.icon" class="icon-cell">
        <BngIcon
          class="msg-icon"
          fallbackType="info"
          v-bind="getIconProps(item)"
        />
      </div>
      <div class="text-cell" :class="{ 'text-cell-options': item.availableOptionsCount > 0 }">
        <template v-for="(part, i) in getParts(item)" :key="i">
          <span v-if="part.t === 'text'">{{ part.v }}</span>
          <BngBinding v-else :action="part.action" show-unassigned />
        </template>
        <div v-if="item.actionItems?.length" class="action-items-row" :class="{'main-action-items': item.text === ''}">
          <div v-for="(actionItem, i) in item.actionItems" :key="`${item._key}-action-${i}`" class="action-item">
            <BngBinding :action="actionItem.action" show-unassigned class="action-item-binding" /> <span> {{ $translate.instant(actionItem.label) }}</span>
          </div>
        </div>
        <div v-if="item.availableOptionsCount > 0" class="options-row-cell">
          <div v-for="i in item.availableOptionsCount" :key="i" class="cell" :class="{ 'cell-active': i - 1 === item.currentOptionIndex }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngBinding, BngIcon } from "@/common/components/base"
import { $content, $translate } from "@/services"
import { useMessagesStore } from "@/services/messagesStore"

const props = defineProps({
  maxMessages: { type: Number, default: undefined },
  dense: { type: Boolean, default: false },
  wrap: { type: Boolean, default: true },
  showIcons: { type: Boolean, default: true },
})

const store = useMessagesStore()

const ENABLE_BBCODE_PARSE = true
const messagesList = computed(() => {
  if (typeof props.maxMessages === "number" && props.maxMessages > 0) {
    return store.messages.slice(0, props.maxMessages)
  }
  return store.messages
})

const isAssetPath = icon => typeof icon === "string" && icon.startsWith("/")
const resolvedType = icon => (typeof icon === "string" && !isAssetPath(icon) ? icon : undefined)
const resolvedExternalImage = icon => (typeof icon === "string" && isAssetPath(icon) ? icon : undefined)

function getIconProps(item) {
  const icon = resolvedType(item.icon)
  if (icon) return { type: icon }

  const externalImage = resolvedExternalImage(item.icon)
  if (externalImage) return { externalImage }

  return { type: "info" }
}

function resolveTranslation(val) {
  if (val == null) return ""
  if (typeof val === "string") return $translate.instant(val)
  if (Array.isArray(val)) return $translate.multiContextTranslate(val)
  if (typeof val === "object") return $translate.contextTranslate(val)
  return String(val)
}

function htmlToPlainText(html) {
  if (typeof html !== "string") return String(html ?? "")

  const normalizedHtml = html.replace(/<br\s*\/?>/gi, "\n")
  const parserElement = document.createElement("div")
  parserElement.innerHTML = normalizedHtml

  let text = parserElement.textContent ?? parserElement.innerText ?? normalizedHtml
  text = text.replace(/<[^>]*>/g, "")

  return text
}

function sanitizeTextSegment(text) {
  if (!text) return ""
  if (!ENABLE_BBCODE_PARSE) return htmlToPlainText(text)
  const parsed = $content?.bbcode?.parse ? $content.bbcode.parse(text) : text
  return htmlToPlainText(parsed)
}

function getParts(item) {
  const textInput = item.context ? { txt: item.text, context: item.context } : item.text
  const raw = resolveTranslation(textInput)
  if (typeof raw !== "string") return [{ t: "text", v: sanitizeTextSegment(String(raw)) }]

  const parts = []
  const rgx = /\[action=([^\]]+)\]/gi
  let lastIndex = 0
  let match

  while ((match = rgx.exec(raw)) !== null) {
    const head = raw.slice(lastIndex, match.index)
    if (head) parts.push({ t: "text", v: sanitizeTextSegment(head) })
    const actionName = match[1].trim()
    parts.push({ t: "binding", action: actionName })
    lastIndex = match.index + match[0].length
  }

  const tail = raw.slice(lastIndex)
  if (tail) parts.push({ t: "text", v: sanitizeTextSegment(tail) })

  return parts.length ? parts : [{ t: "text", v: sanitizeTextSegment(raw) }]
}
</script>

<style lang="scss" scoped>
.messages-app {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25em;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  font-family: var(--fnt-defs);
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  min-width: 0;
  background: rgba(var(--bng-off-black-rgb), 0.5);
  border-radius: var(--bng-corners-1);
  padding: 0.25em 0.5em;
}

.icon-cell {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-cell {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--bng-off-white);
  white-space: pre-wrap;
  word-break: break-word;
  padding-top: 0.125em;
  position: relative;
}

.text-cell-options {
  margin-bottom: 0.375rem;
}

.action-items-row {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.8em;
  border-top: 1px solid rgba(var(--bng-off-white-rgb), 0.25);
  padding-top: 0.25rem;
  padding-bottom: 0.125rem;
  &.main-action-items {
    border-top: none;
    padding-top: 0;
    font-size: 1em;
    margin-top: 0;
    .action-item-binding {
      min-width: 1.5em;
    }
  }
  .action-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .action-item-binding {
    min-width: 2.5em;
  }
}

.options-row-cell {
  width: 100%;
  position: absolute;
  bottom: -0.375rem;
  left: 0;
  right: 0;
  height: 0.25rem;
  display: flex;
  flex-direction: row;
  gap: 0.25rem;

  .cell {
    flex: 1 1 auto;
    background: rgba(var(--bng-off-white-rgb), 0.25);
    border-radius: var(--bng-corners-1);
  }

  .cell-active {
    background: rgba(var(--bng-orange-400-rgb), 0.6);
  }
}

.msg-icon {
  --bng-icon-size: 1.75em;
  --bng-icon-color: var(--bng-off-white);
}
</style>
