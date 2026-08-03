<template>
  <BngSimpleGraph class="options-graph" v-bind="graphBinds" />
</template>

<script setup>
import { computed } from "vue"
import { BngSimpleGraph } from "@/common/components/base"
import { $translate } from "@/services"

const props = defineProps({
  data: Array,
  caption: String,
  unit: String,
})

const graphBinds = computed(() => {
  const pointsData = props.data

  // verify
  let ok = true
  ok = Array.isArray(pointsData) && pointsData.length >= 3
  ok = ok && pointsData[0].length === 4 && pointsData.at(-1).length === 4
  ok = ok && pointsData.every(point => point.every(v => typeof v === "number"))

  // clone if ok, otherwise use demo data
  const points = ok ? [...pointsData.map(p => [...p])] : [
    [0, 0.5, 0, 0], // ..., minX, minY
    [50, 0.5],
    [100, 0.5, 100, 1], // ..., maxX, maxY
  ]

  // cut off size data
  const size = [
    ...points[0].splice(2, 2), // minX, minY
    ...points.at(-1).splice(2, 2), // maxX, maxY
  ]

  // find breakpoints (all points after first and before last)
  const pois = points.slice(1, -1)
  const main = pois.at(-1) // last point for text

  const caption = props.caption ? $translate.instant(props.caption) : ""

  let text
  if (ok && props.caption) {
    // some cases to build a prettier text
    if (props.unit === "%") {
      if (size[3] === 1) {
        text = ~~(main[1] * 100)
      } else {
        text = ~~main[1]
      }
    } else if (/^[a-z]/i.test(props.unit)) {
      text = ~~main[1] + " "
    } else {
      text = main[1].toFixed(1)
    }
    text = `${caption}: ${text}${props.unit}`
  } else if (!ok) {
    text = "<invalid data>"
  }

  return {
    config: {
      showLabels: false,
      xAxis: {
        key: "x",
        min: size[0],
        max: size[2],
      },
      yAxis: {
        key: "y",
        min: size[1],
        max: size[3],
      },
    },
    gridColor: "var(--bng-ter-blue-gray-500)",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    gridDivisions: [5, 2],
    showSubgrid: true,
    verticalGuides: pois.map(poi => ({
      x: poi[0],
      color: "var(--bng-orange)",
      opacity: 0.6,
    })),
    points: [{
      label: caption || "",
      color: "var(--bng-orange)",
      fill: true,
      fillOpacity: 0.3,
      points,
    }],
    singleLabel: text ? {
      text,
      x: main[0],
      y: main[1],
      color: "var(--bng-orange)",
    } : undefined,
  }
})
</script>

<style lang="scss" scoped>
.options-graph {
  width: 100%;
  height: 5em;
}
</style>