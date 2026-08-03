<template>
  <div :class="['gamemode-tile', { 'map-unsupported': gamemode.mapUnsupported }]">
    <div v-if="gamemode.thumbnail" class="gamemode-thumbnail" :style="{ backgroundImage: `url(${gamemode.thumbnail})` }"></div>
    <div class="gamemode-info">
      <span class="gamemode-name">{{ $t(gamemode.displayName || gamemode.name) }}</span>
      <p v-if="gamemode.mapUnsupported" class="map-unsupported-label">{{ $t("ui.multiplayer.notSupportedOnThisMap") }}</p>
      <p v-else class="gamemode-description">{{ $t(gamemode.description) }}</p>
    </div>
    <div v-if="!gamemode.mapUnsupported" class="gamemode-actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  gamemode: { type: Object, required: true },
})
</script>

<style scoped lang="scss">
.gamemode-tile {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: var(--bng-corners-2);
  overflow: hidden;
}

.gamemode-thumbnail {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.6) 0%, transparent 70%);
  -webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.6) 0%, transparent 70%);
}

.gamemode-info {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.gamemode-name {
  font-weight: 600;
  font-size: 1.05rem;
  text-shadow: 0 0 4px rgba(0, 0, 0, 1), 0 0 20px rgba(0, 0, 0, 1);
}

.gamemode-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--bng-cool-gray-100);
  line-height: 1.4;
  text-shadow: 0 0 4px rgba(0, 0, 0, 1), 0 0 20px rgba(0, 0, 0, 1);
}

.gamemode-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gamemode-tile.map-unsupported {
  opacity: 0.8;
  filter: grayscale(0.7);
  pointer-events: none;
}

.map-unsupported-label {
  margin: 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--bng-cool-gray-200);
  text-shadow: 0 0 4px rgba(0, 0, 0, 1), 0 0 20px rgba(0, 0, 0, 1);
}
</style>
