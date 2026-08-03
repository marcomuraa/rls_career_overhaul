<template>
  <div class="spectator-top-banner">
    <span class="spectator-watching-label">{{ $t("ui.multiplayer.spectator.youreSpectating") }}</span>
    <span class="spectator-player-name">{{ playerName }}</span>
  </div>
</template>

<script setup>
defineProps({
  playerName: {
    type: String,
    default: "",
  },
})
</script>

<style lang="scss" scoped>
.spectator-top-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;

  .spectator-watching-label {
    color: var(--bng-off-white);
    font-family: var(--fnt-defs);
    font-size: 1.4rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 1);
  }

  .spectator-player-name {
    color: var(--bng-orange-b400);
    font-family: var(--fnt-defs);
    font-size: 2.5rem;
    font-weight: 700;
    text-shadow: 0 3px 8px rgba(0, 0, 0, 1);
  }
}
</style>
