<template>
  <div class="angular-host-shell" v-bng-ui-nav="uiNavEnabled">
    <div v-if="showBackButton" class="angular-back-host" bng-no-child-nav="true">
      <BngButton
        class="angular-back-button"
        v-bng-blur
        :accent="ACCENTS.custom_old"
        :icon-left="icons.arrowSmallLeft"
        sound-class="bng_back_hover_generic"
        @click="emit('back')"
      >
        <BngBinding ui-event="back" controller track-ignore />
        {{ $tt("ui.common.back") }}
      </BngButton>
    </div>

    <div
      id="angular-root"
      ref="root"
      class="container"
      :class="{ 'is-click-through': clickThrough, 'has-back-button': showBackButton }"
      ng-controller="AppCtrl as app"
      use-lang-font="1"
      :style="{ visibility: angularBootstrapped ? 'visible' : 'hidden' }"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue"
import { getURL, getFile } from "@/utils"
import { BngButton, BngBinding, ACCENTS, icons } from "@/common/components/base"
import { vBngBlur, vBngUiNav } from "@/common/directives"

const root = ref(null)
const angularBootstrapped = ref(false)

defineProps({
  clickThrough: Boolean,
  uiNavEnabled: Boolean,
  showBackButton: Boolean,
})

const emit = defineEmits(["back"])

function loadText(path, timeoutSeconds = 20) {
  return getFile(getURL(path), timeoutSeconds)
}

function splitSelectors(selectorsText) {
  const parts = []
  let buf = ""
  let paren = 0
  let bracket = 0
  let quote = ""
  let esc = false
  for (let i = 0; i < selectorsText.length; i++) {
    const ch = selectorsText[i]
    if (quote) {
      buf += ch
      if (esc) {
        esc = false
      } else if (ch === "\\") {
        esc = true
      } else if (ch === quote) {
        quote = ""
      }
      continue
    }
    if (ch === "\"" || ch === "'") {
      quote = ch
      buf += ch
      continue
    }
    if (ch === "(") paren++
    else if (ch === ")") paren = Math.max(0, paren - 1)
    else if (ch === "[") bracket++
    else if (ch === "]") bracket = Math.max(0, bracket - 1)

    if (ch === "," && paren === 0 && bracket === 0) {
      parts.push(buf)
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf) parts.push(buf)
  return parts
}

function scopeSelectorOne(selector, scopeSel) {
  let s = selector.trim()
  if (!s) return s
  if (s.startsWith(scopeSel)) return s

  // Replace global roots with container root
  const roots = ["body", "html", ":root"]
  for (const r of roots) {
    if (s === r) return scopeSel
    if (s.startsWith(r + ".")) return scopeSel + s.slice(r.length)
    if (s.startsWith(r + "#")) return scopeSel + s.slice(r.length)
    if (s.startsWith(r + ":")) return scopeSel + s.slice(r.length)
    if (s.startsWith(r + "[")) return scopeSel + s.slice(r.length)
    if (s.startsWith(r + " ")) return scopeSel + s.slice(r.length)
    if (s.startsWith(r + ">") || s.startsWith(r + "+") || s.startsWith(r + "~")) return scopeSel + s.slice(r.length)
  }

  return `${scopeSel} ${s}`
}

function scopeSelectors(selectorsText, scopeSel) {
  const parts = splitSelectors(selectorsText)
  return parts.map((p) => scopeSelectorOne(p, scopeSel)).join(", ")
}

function readBlock(css, startIdx) {
  // startIdx points to "{"
  let i = startIdx
  let depth = 0
  let quote = ""
  let esc = false
  let inComment = false
  let out = ""

  for (; i < css.length; i++) {
    const ch = css[i]
    const next = css[i + 1]

    if (inComment) {
      out += ch
      if (ch === "*" && next === "/") {
        out += next
        i++
        inComment = false
      }
      continue
    }

    if (!quote && ch === "/" && next === "*") {
      out += ch + next
      i++
      inComment = true
      continue
    }

    if (quote) {
      out += ch
      if (esc) {
        esc = false
      } else if (ch === "\\") {
        esc = true
      } else if (ch === quote) {
        quote = ""
      }
      continue
    }

    if (ch === "\"" || ch === "'") {
      quote = ch
      out += ch
      continue
    }

    if (ch === "{") {
      depth++
      if (depth > 1) out += ch
      continue
    }
    if (ch === "}") {
      depth--
      if (depth === 0) {
        return { inner: out, endIdx: i }
      }
      out += ch
      continue
    }

    out += ch
  }

  return { inner: out, endIdx: i }
}

function scopeCss(css, scopeSel) {
  let i = 0
  let out = ""

  function skipWs() {
    while (i < css.length && /\s/.test(css[i])) out += css[i++]
  }

  while (i < css.length) {
    skipWs()
    if (i >= css.length) break

    // Comments
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2)
      if (end === -1) {
        out += css.slice(i)
        break
      }
      out += css.slice(i, end + 2)
      i = end + 2
      continue
    }

    // At-rules
    if (css[i] === "@") {
      const start = i
      while (i < css.length && css[i] !== "{" && css[i] !== ";") i++
      const prelude = css.slice(start, i)
      if (css[i] === ";") {
        out += prelude + ";"
        i++
        continue
      }
      if (css[i] === "{") {
        const atName = prelude.slice(1).trim().split(/\s+/)[0].toLowerCase()
        const { inner, endIdx } = readBlock(css, i)
        const innerScoped = (atName === "media" || atName === "supports" || atName === "layer" || atName === "container")
          ? scopeCss(inner, scopeSel)
          : inner
        out += prelude + "{" + innerScoped + "}"
        i = endIdx + 1
        continue
      }
    }

    // Style rules: selectors { ... }
    const selStart = i
    while (i < css.length && css[i] !== "{") i++
    if (i >= css.length) {
      out += css.slice(selStart)
      break
    }
    const selectorsText = css.slice(selStart, i).trim()
    const { inner, endIdx } = readBlock(css, i)
    const scopedSelectorsText = scopeSelectors(selectorsText, scopeSel)
    out += scopedSelectorsText + "{" + inner + "}"
    i = endIdx + 1
  }

  return out
}

async function ensureAngularCssScoped() {
  const styleId = "angular-main-css-scoped"
  if (document.getElementById(styleId)) return

  const css = await loadText("/ui/entrypoints/main/main.css", 30)
  const scoped = scopeCss(css, "#angular-root")

  const style = document.createElement("style")
  style.id = styleId
  style.type = "text/css"
  style.textContent = scoped
  document.head.appendChild(style)
}

async function ensureAngularShellInserted() {
  if (!root.value) throw new Error("AngularHost root is missing")
  if (root.value.childNodes && root.value.childNodes.length) return
  const html = await loadText("/ui/entrypoints/main/angularShell.html", 30)
  root.value.innerHTML = html
}

onMounted(async () => {
  try {
    await ensureAngularCssScoped()
    await ensureAngularShellInserted()
    window.bngUiBootstrap?.resolveAngularHostReady(true)
    // prevent raw HTML flash before angular compiles directives
    await window.bngUiBootstrap?.whenAngularBootstrapped
    angularBootstrapped.value = true
  } catch (e) {
    window.bngUiBootstrap?.fail(e)
  }
})
</script>

<style lang="scss" scoped>
.angular-host-shell {
  --angular-host-button-height: 2.5rem;
  --angular-host-gap: 0.5em;
  --angular-host-infobar-height: 2.9em;

  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.angular-back-host {
  position: absolute;
  top: var(--safezone);
  left: var(--safezone);
  height: var(--angular-host-button-height);
  z-index: calc(var(--zorder_index_waiting_screen_icon) + 1);
  display: inline-flex;
  align-items: stretch;
  pointer-events: auto;
}

.angular-back-button {
  --bng-button-custom-margin: 0;
  --bng-button-margin: 0;
  --bng-button-custom-enabled: var(--bng-off-black);
  --bng-button-custom-hover: var(--bng-orange-600);
  --bng-button-custom-active: var(--bng-orange-800);
  --bng-button-custom-disabled: var(--bng-off-black);
  --bng-button-custom-border-enabled: var(--bng-cool-gray-600);
  --bng-button-custom-border-hover: var(--bng-orange-400);
  --bng-button-custom-border-active: var(--bng-orange-600);
  --bng-button-custom-border-disabled: rgba(var(--bng-cool-gray-800-rgb), 0.8);
  --bng-button-custom-enabled-opacity: 0.8;
  --bng-button-custom-hover-opacity: 1;
  --bng-button-custom-active-opacity: 1;
  --bng-button-custom-disabled-opacity: 0.25;
  --bng-button-custom-border-radius: var(--bng-corners-2);
  --bng-button-padding: 0.25em 0.75em;
  --bng-button-min-width: 2em;
  --bng-content-align: center;

  flex: 0 0 auto;
  height: 100%;
  align-items: center;
  gap: 0.25em;
  margin: 0 !important;
  pointer-events: auto;
}

#angular-root {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: transparent !important;
  pointer-events: auto;
}

#angular-root.is-click-through {
  pointer-events: none;

  :deep(#toast-container),
  :deep(.toast) {
    pointer-events: auto !important;
  }
}

#angular-root :deep(.UI-Flex-Wrapper) {
  top: var(--safezone) !important;
  right: var(--safezone) !important;
  bottom: calc(var(--safezone) + var(--angular-host-infobar-height) + var(--angular-host-gap)) !important;
  left: var(--safezone) !important;
  margin-bottom: 1rem !important;
}

#angular-root.has-back-button :deep(.UI-Flex-Wrapper) {
  top: calc(var(--safezone) + var(--angular-host-button-height) + var(--angular-host-gap)) !important;
}
</style>
