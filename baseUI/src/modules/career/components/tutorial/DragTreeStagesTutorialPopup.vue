<template>
  <div class="drag-tree-stages-tutorial-popup">
    <AspectRatio
      class="drag-tree-stages-media"
      ratio="1.46:1"
      slot-v-align="top"
      :slot-scroll="false"
      :external-image="props.popup?.image || null"
      image-mode="cover"
    >
      <div class="drag-tree-stages-background" />
      <div class="drag-tree-stages-content">
        <table class="drag-tree-stages-table">
          <tbody>
            <tr v-for="(row, idx) in rows" :key="idx">
              <td class="drag-tree-stages-cell-image">
                <div class="drag-tree-stages-images">
                  <AspectRatio
                    v-for="(img, i) in rowImages(row)"
                    :key="i"
                    class="drag-tree-stages-aspect"
                    :ratio="imageAspectRatio"
                    :external-image="img || null"
                    image-mode="cover"
                  />
                </div>
              </td>
              <td v-if="row.text" class="drag-tree-stages-cell-text">
                <div class="drag-tree-stages-cell-text-content">
                  {{ row.text }}
                </div>
              </td>
              <td v-else class="drag-tree-stages-cell-text drag-tree-stages-cell-empty" />
            </tr>
          </tbody>
        </table>
      </div>
    </AspectRatio>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { AspectRatio } from "@/common/components/utility"
import { $translate } from "@/services"

defineOptions({ name: "DragTreeStagesTutorialPopup" })

const props = defineProps({
  popup: {
    type: Object,
    default: () => ({}),
  },
})

function rowImages(row) {
  if (!row) return []
  if (Array.isArray(row.images)) return row.images.filter(Boolean)
  if (row.image) return [row.image]
  return []
}

const rows = computed(() => {
  const raw = props.popup?.rows
  if (!Array.isArray(raw)) return []
  return raw.map(r => ({
    images: Array.isArray(r.images) ? r.images : r.image ? [r.image] : [],
    text: r.text != null ? $translate.instant(String(r.text)) : "",
  }))
})

const imageAspectRatio = computed(() => {
  const ratio = props.popup?.aspectRatio
  return typeof ratio === "string" && ratio.trim() ? ratio : "14:4"
})

</script>

<style lang="scss" scoped>
@use "sass:map";
@use "sass:color";
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");

.drag-tree-stages-tutorial-popup {
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.drag-tree-stages-media {
  height: 66vh;

}

.drag-tree-stages-background {
  position: absolute;
  inset: 0;
  background: color.change($off-black, $alpha: 0.68);
  pointer-events: none;
}

.drag-tree-stages-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}

.drag-tree-stages-table {
  width: 100%;
  border-collapse: collapse;

  td {
    vertical-align: middle;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid rgba(var(--bng-off-white-rgb), 0.5);
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.drag-tree-stages-cell-image {
  width: 42%;
}

.drag-tree-stages-images {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.drag-tree-stages-aspect {
  flex: 0 0 25rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 2px solid rgba(var(--bng-off-white-rgb), 1);
}

.drag-tree-stages-cell-text {
  .drag-tree-stages-cell-text-content {
    font-size: 1.5rem;
    line-height: 1.35;
    color: $off-white;
    background: rgba(var(--bng-off-black-rgb), 0.8);
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 2px solid rgba(var(--bng-off-white-rgb), 1);
    margin-left: 0.5rem;

  }
}

.drag-tree-stages-cell-empty {
  opacity: 0.6;
}
</style>
