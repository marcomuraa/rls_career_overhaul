<template>
  <div class="menu-extras-help">
    <div
      v-for="section in visibleHelpSections"
      :key="section.question"
      class="help-wrapper"
    >
      <h3 class="help-question">{{ $tt(section.question) }}</h3>
      <div class="help-answer">
        <div v-if="getAnswerIntroText(section.answer)" class="help-answer-text">
          {{ getAnswerIntroText(section.answer) }}
        </div>
        <div
          v-for="item in getAnswerItems(section.answer)"
          :key="`${section.answer}-${item.url}`"
          class="help-answer-item"
        >
          <div class="help-qr-media">
            <BbcodeLinkQrCode class="help-qr-image" :url="item.url" />
          </div>
          <div class="help-item-details">
            <span class="help-item-description">{{ item.description }}</span>
            <span v-if="isSimplemenu" class="help-qr-url">{{ item.url }}</span>
            <BngButton v-else class="help-qr-btn-url" :accent="ACCENTS.text" @click="openExternalUrl(item.url)">
              <span>{{ item.url }}</span>
              <BngIcon :type="icons.external" />
            </BngButton>
          </div>
        </div>
        <div v-if="getAnswerFooterText(section.answer)" class="help-answer-text">
          {{ getAnswerFooterText(section.answer) }}
        </div>
        <div v-if="section.question === TROUBLESHOOTING_QUESTION && !isSimplemenu" class="help-cleanup-action">
          <div class="help-item-details">
            <span class="help-item-description">{{ $tt("launchercpp.supporttool_btn_clearcache.desc") }}</span>
            <BngButton :accent="ACCENTS.secondary" @click="requestFolderCleanup">
              {{ $tt("launchercpp.supporttool_btn_clearcache") }}
            </BngButton>
            <div
              class="help-cleanup-warning"
              :class="{ simpleBlink: folderCleanupRequested }"
            >
              {{ $tt("launchercpp.supporttool_btn_clearcache.warn") }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from "vue"
import { ACCENTS, BngButton, BngIcon, icons } from "@/common/components/base"
import BbcodeLinkQrCode from "@/common/components/utility/bbcodeLinkQrCode.vue"
import { lua, useBridge } from "@/bridge"
import { $translate } from "@/services"

defineOptions({ name: "MenuExtrasHelp" })

const HELP_SECTIONS = Object.freeze([
  { question: "ui.faq.getHelp.q", answer: "ui.faq.getHelp.a" },
  { question: "ui.faq.updatingGame.q", answer: "ui.faq.updatingGame.a", hideInSimplemenu: true },
  { question: "ui.faq.installingMods.q", answer: "ui.faq.installingMods.a", hideInSimplemenu: true },
  { question: "ui.faq.troubleShooting.q", answer: "ui.faq.troubleShooting.a", hideInSimplemenu: true },
  { question: "ui.faq.listFAQ.q", answer: "ui.faq.listFAQ.a" },
  { question: "ui.faq.steeringWheels.q", answer: "ui.faq.steeringWheels.a", hideInSimplemenu: true },
  { question: "ui.faq.blog.q", answer: "ui.faq.blog.a" },
])

const TROUBLESHOOTING_QUESTION = "ui.faq.troubleShooting.q"
const URL_PATTERN = /\[url=([^\]]+)]([\s\S]*?)\[\/url]/gi
const LINE_BREAK_PATTERN = /\[br\]/gi
const folderCleanupRequested = ref(false)
const $simplemenu = inject("$simplemenu", ref(false))
const isSimplemenu = computed(() => !!$simplemenu.value)
const visibleHelpSections = computed(() => HELP_SECTIONS.filter(section => !isSimplemenu.value || !section.hideInSimplemenu))
const { api } = useBridge()

function parseAnswer(answer) {
  const introTextParts = []
  const items = []
  const text = String(answer || "")
  let cursor = 0
  let match

  URL_PATTERN.lastIndex = 0
  while ((match = URL_PATTERN.exec(text))) {
    introTextParts.push(text.slice(cursor, match.index))
    items.push({
      url: match[1].trim(),
      description: normalizeAnswerText(match[2]) || match[1].trim(),
    })
    cursor = match.index + match[0].length
  }

  return {
    introText: normalizeAnswerText(introTextParts.join(" ")),
    footerText: normalizeAnswerText(text.slice(cursor)),
    items,
  }
}

function parseTranslatedAnswer(answerToken) {
  return parseAnswer($translate.instant(answerToken))
}

function getAnswerIntroText(answerToken) {
  return parseTranslatedAnswer(answerToken).introText
}

function getAnswerFooterText(answerToken) {
  return parseTranslatedAnswer(answerToken).footerText
}

function getAnswerItems(answerToken) {
  return parseTranslatedAnswer(answerToken).items
}

function normalizeAnswerText(text) {
  return String(text || "")
    .replace(LINE_BREAK_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function requestFolderCleanup() {
  lua.settings.setValue("folderCleanupRequested", true)
  folderCleanupRequested.value = true
}

function openExternalUrl(url) {
  api.engineLua(`openWebBrowser(${JSON.stringify(url)})`)
}
</script>

<style lang="scss" scoped>
.menu-extras-help {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  padding: 0 1rem 1rem;
}

.help-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 0 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
}

.help-question {
  margin: 0;
  padding: 0;
}

.help-answer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  line-height: 1.45;
  color: var(--bng-off-white);
}

.help-answer-text,
.help-cleanup-action {
  grid-column: 1 / -1;
}

.help-answer-text {
  padding: 0 0.75rem 0 0;
}

.help-answer-item,
.help-cleanup-action {
  display: grid;
  grid-template-columns: minmax(5em, 8em) minmax(0, 1fr);
  gap: 0.75rem;
  align-items: stretch;
  padding: 0.75rem;
  border-radius: 0.35rem;
  background: rgba(0, 0, 0, 0.18);
}

.help-qr-media {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-width: 0;
}

.help-qr-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 12rem);
  aspect-ratio: 1;
  padding: 0.5em;
  border-radius: 0.25rem;
  background: var(--bng-off-white);
  box-sizing: border-box;
}

.help-qr-image :deep(.bbcode-link-qr__image) {
  width: 100%;
  height: 100%;
}

.help-qr-image :deep(canvas),
.help-qr-image :deep(img) {
  width: 100% !important;
  height: 100% !important;
}

.help-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  align-items: flex-start;
}

.help-item-description {
  font-weight: 700;
}

.help-qr-url {
  color: var(--bng-orange);
  word-break: break-word;
}

.help-qr-btn-url {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  --bng-button-max-width: minmax(24em, 50%);
}

.help-cleanup-action {
  grid-template-columns: minmax(0, 1fr);
}

.help-cleanup-warning {
  color: var(--bng-orange);
}

@media (max-width: 700px) {
  .help-answer {
    grid-template-columns: 1fr;
  }

  .help-answer-item {
    grid-template-columns: 1fr;
  }
}
</style>
