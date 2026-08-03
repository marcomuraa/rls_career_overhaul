<template>
  <div class="overlay-name-form">
    <label class="overlay-name-form__field">
      <span class="overlay-name-form__label">{{ $t("ui.photomode.overlay.displayName") }}</span>
      <BngInput
        v-model="nameInput"
        class="overlay-name-form__input"
        :maxlength="60"
        :placeholder="$t('ui.photomode.overlay.namePlaceholder')"
      />
    </label>

    <label class="overlay-name-form__field">
      <span class="overlay-name-form__label">
        {{ $t("ui.photomode.overlay.directoryName") }}
        <span class="overlay-name-form__hint">{{ $t("ui.photomode.overlay.directoryNameHint") }}</span>
      </span>
      <BngInput
        v-model="idInput"
        class="overlay-name-form__input"
        :maxlength="60"
        :placeholder="$t('ui.photomode.overlay.idPlaceholder')"
      />
    </label>

    <p v-if="previewId" class="overlay-name-form__preview">
      {{ $t("ui.photomode.overlay.folderPreview", { id: previewId }) }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { BngInput } from "@/common/components/base"
import { slugifyId } from "../useOverlays"

// The dialog model follows `{ name, id }`. `name` is the human display label
// that lands in overlay.json; `id` is the folder on disk. We auto-sync id
// from name until the user touches the id field, at which point we stop
// overwriting their manual edits. Slug normalisation runs on every keystroke
// so the preview below the fields always reflects the final on-disk shape.

defineOptions({ name: "OverlayNameForm" })

const model = defineModel({
  type: Object,
  default: () => ({ name: "", id: "" }),
})

const nameInput = ref(model.value?.name ?? "")
const idInput = ref(model.value?.id ?? "")
const idTouched = ref(Boolean(model.value?.id))

watch(nameInput, next => {
  if (!idTouched.value) {
    idInput.value = slugifyId(next)
  }
  pushModel()
})

watch(idInput, next => {
  // Heuristic: if the user's id edit diverges from the slug of the current
  // name, treat it as a manual override and stop syncing.
  if (next !== slugifyId(nameInput.value)) {
    idTouched.value = true
  }
  pushModel()
})

function pushModel() {
  model.value = {
    name: nameInput.value,
    id: idInput.value,
  }
}

const previewId = computed(() => slugifyId(idInput.value || nameInput.value))
</script>

<style lang="scss" scoped>
.overlay-name-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 22rem;
}

.overlay-name-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.overlay-name-form__label {
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  color: rgba(var(--bng-off-white-rgb), 0.78);
}

.overlay-name-form__hint {
  font-size: 0.72rem;
  opacity: 0.6;
  margin-left: 0.35rem;
}

.overlay-name-form__input {
  width: 100%;
}

.overlay-name-form__preview {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  opacity: 0.75;

  code {
    padding: 0 0.3rem;
    border-radius: 0.2rem;
    background: rgba(var(--bng-off-white-rgb), 0.08);
  }
}
</style>
