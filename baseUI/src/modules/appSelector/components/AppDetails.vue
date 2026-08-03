<template>
  <div class="details" v-bng-ui-nav-scroll.force="isAuxillaryScopeActive" bng-nav-scroll>
    <div class="preview" v-if="activeItemDetails?.preview">
      <AspectRatio class="preview-image" :ratio="'16:8'" :external-image="activeItemDetails.preview">
        <div class="favourite-icon-container">
          <BngBinding
            :ui-event="'action_4'"
            controller
            class="favourite-icon-binding"
          />
          <BngIcon
            class="favourite-icon"
            :type="activeItemDetails?.isFavourite ? 'star' : 'starSecondary'"
            @click="toggleFavourite"
            :color="activeItemDetails?.isFavourite ? 'var(--bng-ter-yellow-50)' : 'var(--bng-cool-gray-100)'"
          />
        </div>
      </AspectRatio>
    </div>

    <div class="content-header" v-if="activeItemDetails?.headerTitle">
      <div class="description" v-if="activeItemDetails?.description">
        {{ activeItemDetails.description }}
      </div>
    </div>

    <template v-for="(specList, specListIndex) in activeItemDetails?.specifications" :key="specListIndex">
      <div class="specs-grid" v-if="specList.length > 0">
        <div class="specs-grid-container">
          <template v-for="specification in specList" :key="specification.key">

            <div class="spec-cell">
              <BngIcon v-if="specification.icon" :type="specification.icon" class="spec-icon" />
              <div class="spec-content">
                <div class="spec-label">{{ specification.label }}:</div>
                <div class="spec-value">
                  <span>{{ specification.value }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <div class="buttons-section" v-if="!hideButtonsSection && activeItemDetails?.buttonInfo?.length > 0">
      <template v-for="button in activeItemDetails.buttonInfo" :key="button.buttonId">
        <BngButton
          :bng-scoped-nav-autofocus="button.primary"
          :accent="button.primary ? 'main' : 'secondary'"
          :label="button.label"
          :icon="button.icon"
          @click="handleButtonClick(button)" />
      </template>
    </div>

  </div>
</template>

<script setup>
import { BngButton, BngIcon } from "@/common/components/base"
import BngBinding from "@/common/components/base/bngBinding.vue"
import { AspectRatio } from "@/common/components/utility"
import { vBngUiNavScroll } from "@/common/directives"

const props = defineProps({
  activeItem: {
    type: Object,
    default: null,
  },
  activeItemDetails: {
    type: Object,
    default: null,
  },
  toggleFavourite: {
    type: Function,
    required: true,
  },
  hideButtonsSection: {
    type: Boolean,
    default: false,
  },
  isAuxillaryScopeActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["execute-button"])

const handleButtonClick = (button) => {
  emit("execute-button", button?.buttonId, button)
}

const toggleFavourite = () => {
  if (props.activeItem) {
    props.toggleFavourite(props.activeItem)
  }
}

</script>

<style scoped lang="scss">
.details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  max-width: 100%;
  overflow-x: hidden;
  justify-content: space-between;
}

.preview {
  flex: 0 1 auto;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: stretch;
  border-radius: 0.5rem;
  background-color: rgba(0, 0, 0, 0.4);
}

.preview-image {
  width: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  justify-self: center;
  align-self: center;
  position: relative;
}

.favourite-icon-container {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 2;
  background-color: rgba(0, 0, 0, 0.66);
  border-radius: 0.5rem;
  padding: 0.125rem 0.25rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  &:hover {
    scale: 1.15;
  }
}
.favourite-icon {
  font-size: 1.5rem;
}
.favourite-icon-binding {
  font-size: 0.75rem;
}

.content-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 0.5rem;
  padding: 0.75rem;
  flex: 0;
}


.description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  text-align: justify;
}

.buttons-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  flex-shrink: 0;
  margin-top: auto;
}

.buttons-section :deep(.bng-button) {
  max-width: unset;
  width: 100%;
  align-items: center;
}


.buttons-section :deep(.bng-button .label) {
  text-align: center;
}


.specs-grid {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.specs-grid-container {
  display: grid;
  grid-template-columns: 1fr ;
}

.spec-cell {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.125rem 0.25rem;
}

.spec-icon {
  font-size: 2rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
  align-self: flex-start;
}

.spec-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.125rem;
}

.spec-label {
  font-size: 0.8rem;
  font-weight: 300;
  text-align: left;
}

.spec-value {
  font-size: 0.8rem;
  font-weight: 500;
}

</style>
