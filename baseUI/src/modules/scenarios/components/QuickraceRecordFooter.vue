<template>
  <div class="quickrace-record-footer panel fade-in">
    <table class="record-row">
      <tr>
        <th class="col-left"># {{ record.place }}</th>
        <th class="col-center">{{ record.playerName }}</th>
        <th class="col-right">{{ record.formattedTime }}</th>
      </tr>
    </table>
    <table class="record-row">
      <tr>
        <th class="col-left">{{ record.vehicleBrand }}</th>
        <th class="col-center">{{ record.vehicleName }}</th>
        <th class="col-right">{{ record.formattedTimestamp }}</th>
      </tr>
    </table>
  </div>
</template>

<script setup>
defineProps({
  record: { type: Object, default: () => ({}) },
})
</script>

<style lang="scss" scoped>
.quickrace-record-footer {
  width: 100%;
  height: calc(20% - 10px);
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  padding: 0.25rem;
  text-transform: uppercase;
  font-family: "Overpass", var(--fnt-defs);
  box-sizing: border-box;
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
}

.record-row {
  width: 100%;

  th {
    padding: 0.25rem;
    font-weight: normal;
  }

  .col-left { text-align: left; }
  .col-center { text-align: center; }
  .col-right { text-align: right; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  opacity: 0;
  animation: fadeIn linear 0.3s forwards;
}
</style>
