<template>
  <div class="vehicle-details-editor">
    <div class="form-field">
      <label class="field-label">Name</label>
      <BngInput v-model="formModel.name" />
    </div>

    <div class="form-field">
      <label class="field-label">Description</label>
      <BngMultilineInput v-model="formModel.description" />
    </div>

    <div class="form-field">
      <label class="field-label">License Plate</label>
      <BngInput v-model="formModel.licensePlate" placeholder="Leave empty for default" />
      <div class="field-hint">Can be left empty to use default license plate</div>
    </div>

    <div class="form-field">
      <label class="field-label">Type</label>
      <BngDropdown v-model="formModel.type" :items="typeOptions" />
    </div>

    <div class="form-field">
      <label class="field-label">Body Style</label>
      <BngDropdown v-model="formModel.bodyStyle" :items="bodyStyleOptions" />
    </div>

    <div class="form-field">
      <label class="field-label">Paint Colors</label>
      <div class="paint-fields">
        <BngInput v-model="formModel.paint1" placeholder="Paint 1 (optional)" />
        <BngInput v-model="formModel.paint2" placeholder="Paint 2 (optional)" />
        <BngInput v-model="formModel.paint3" placeholder="Paint 3 (optional)" />
      </div>
      <div class="field-hint">Leave empty to use default paint</div>
    </div>

    <div class="form-field">
      <label class="field-label">Price</label>
      <div class="price-field">
        <BngInput :modelValue="formModel.price" @update:modelValue="updatePrice" type="number" :min="0" />
        <span class="price-display" v-if="formModel.price">{{ formattedPrice }}</span>
      </div>
    </div>

    <div class="form-field">
      <label class="field-label">Thumbnail</label>
      <BngButton :accent="ACCENTS.secondary" @click="handleRetakeThumbnail">
        Re-take Thumbnail
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngInput, BngMultilineInput, BngDropdown, BngButton, ACCENTS } from "@/common/components/base"
import { typeOptions, bodyStyleOptions } from "./VehicleDetailsEditor.utils.js"
import { useBridge } from "@/bridge"

const { units } = useBridge()

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      name: "",
      description: "",
      type: "sedan",
      bodyStyle: "sedan",
      licensePlate: "",
      paint1: "",
      paint2: "",
      paint3: "",
      price: 0,
    }),
  },
})

const emit = defineEmits(["update:modelValue"])

const formModel = computed({
  get: () => props.modelValue || {
    name: "",
    description: "",
    type: "sedan",
    bodyStyle: "sedan",
    licensePlate: "",
    paint1: "",
    paint2: "",
    paint3: "",
    price: 0,
  },
  set: (newValue) => {
    emit("update:modelValue", newValue)
  },
})

const formattedPrice = computed(() => {
  const price = Number(formModel.value.price) || 0
  return units.beamBucks(price)
})

function updatePrice(value) {
  const numValue = Number(value) || 0
  emit("update:modelValue", { ...formModel.value, price: numValue })
}

function handleRetakeThumbnail() {
  // TODO: Implement thumbnail re-take functionality
  console.log("Re-taking thumbnail for vehicle")
}
</script>

<style lang="scss" scoped>
.vehicle-details-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .field-label {
      font-size: 0.9rem;
      opacity: 0.85;
      color: var(--bng-off-white);
    }

    .field-hint {
      font-size: 0.8rem;
      opacity: 0.65;
      color: var(--bng-cool-gray-300);
      font-style: italic;
    }

    .paint-fields {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .price-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .price-display {
        font-size: 0.9rem;
        opacity: 0.8;
        color: var(--bng-off-white);
      }
    }
  }
}
</style>

