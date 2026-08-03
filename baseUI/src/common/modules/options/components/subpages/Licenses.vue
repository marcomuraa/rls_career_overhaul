<template>
  <Accordion class="options-licenses" singular v-bng-ui-nav-scroll.force>
    <AccordionItem v-if="licenses.length === 0" static>
      <template #caption>
        Loading {{ file }}...
      </template>
    </AccordionItem>
    <AccordionItem v-else-if="licenses.length === 1" static>
      <template #caption>
        <div class="options-licenses-text">
          {{ licenses[0].text }}
        </div>
      </template>
    </AccordionItem>
    <AccordionItem
      v-else
      v-for="(license, index) in licenses"
      :key="index"
      navigable
      :expanded="isLicenseExpanded(index)"
      :primary-action="() => toggleLicenseExpanded(index)"
      :primary-label="$tt('ui.common.expand') + '/' + $tt('ui.common.collapse')"
      expand-hint-inline
      :expand-on-context="false"
      @expanded="expanded => setLicenseExpanded(index, expanded)"
    >
      <template #caption>
        {{ license.label }}
      </template>
      <div class="options-licenses-text">
        {{ license.text }}
      </div>
    </AccordionItem>
  </Accordion>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { vBngUiNavScroll } from "@/common/directives"
import { getURL, getFile } from "@/utils"

const file = "licenses.txt"
const licenses = ref([])
const expandedLicenseIndexes = ref(new Set())

watch(licenses, () => {
  expandedLicenseIndexes.value = new Set()
})

function isLicenseExpanded(index) {
  return expandedLicenseIndexes.value.has(index)
}

function setLicenseExpanded(index, expanded) {
  const next = new Set(expandedLicenseIndexes.value)
  if (expanded) {
    next.clear()
    next.add(index)
  } else {
    next.delete(index)
  }
  expandedLicenseIndexes.value = next
}

function toggleLicenseExpanded(index) {
  setLicenseExpanded(index, !isLicenseExpanded(index))
}

onMounted(async () => {
  try {
    const resp = await getFile(getURL(`/${file}`))
    try {
      const lines = (resp || "").split("\n")
      if (lines.length <= 1) throw new Error("No lines")
      const res = []
      let cur = { label: "", text: "" }
      for (let line of lines) {
        line = line.trimEnd()
        if (line.startsWith("===")) {
          if (line.charAt(4) !== "=") {
            cur = { label: line.substring(3), text: "" }
            res.push(cur)
          }
        } else {
          cur.text += line + "\n"
        }
      }
      licenses.value = res
    } catch (err) {
      console.error(err)
      licenses.value = [{ label: "", text: resp }]
    }
  } catch (err) {
    console.error(err)
    licenses.value = [{ label: "", text: `Failed to load ${file}` }]
  }
})
</script>

<style lang="scss" scoped>
.options-licenses {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}
.options-licenses-text {
  white-space: pre-wrap;
  font-family: var(--fnt-mono);
}
</style>
