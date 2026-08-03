<template>
  <div class="rally-disclaimer">
    <div class="rally-disclaimer-modes">
      <section class="rally-disclaimer-mode">
        <div class="rally-disclaimer-mode-art rally-disclaimer-mode-art--stage" />
        <p class="rally-disclaimer-mode-title" v-html="$tt('ui.rally.disclaimer.stage.heading')" />
        <ul class="rally-disclaimer-mode-list">
          <li v-html="$tt('ui.rally.disclaimer.stage.bullet1')" />
          <li v-html="$tt('ui.rally.disclaimer.stage.bullet2')" />
          <li v-html="$tt('ui.rally.disclaimer.stage.bullet3')" />
        </ul>
      </section>

      <section class="rally-disclaimer-mode">
        <div class="rally-disclaimer-mode-art rally-disclaimer-mode-art--loop" />
        <p class="rally-disclaimer-mode-title" v-html="$tt('ui.rally.disclaimer.loop.heading')" />
        <ul class="rally-disclaimer-mode-list">
          <li v-html="$tt('ui.rally.disclaimer.loop.bullet1')" />
          <li v-html="$tt('ui.rally.disclaimer.loop.bullet2')" />
          <li v-html="$tt('ui.rally.disclaimer.loop.bullet3')" />
        </ul>
      </section>
    </div>
    <p class="rally-disclaimer-feedback">
      <DynamicComponent translate-id="ui.rally.disclaimer.feedback" bbcode />
    </p>

  </div>
</template>

<script setup>
import { DynamicComponent } from "@/common/components/utility"

</script>

<style lang="scss" scoped>
.rally-disclaimer {
  min-width: 36em;
  max-width: 52em;
  text-align: center;
}

.rally-disclaimer-intro,
.rally-disclaimer-feedback {
  margin: 0 0 0.5em;
}

.rally-disclaimer-feedback {
  margin-top: 1.0em;
}

.rally-disclaimer-feedback a {
  color: var(--bng-orange-400);
}

.rally-disclaimer-modes {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-around;
  gap: 1em;
  margin-top: 1.5em;
}

.rally-disclaimer-mode {
  flex: 1 1 45%;
  min-width: 14em;
  max-width: 22em;
  margin: 0 0.5em;
}

.rally-disclaimer-mode-art {
  height: 12em;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.rally-disclaimer-mode-art--stage {
  background-image: url("/ui/modules/rallyselect/rally-stage.svg");
}

.rally-disclaimer-mode-art--loop {
  background-image: url("/ui/modules/rallyselect/rally-loop.svg");
}

.rally-disclaimer-mode-title {
  margin: 0.5em 0;
}

.rally-disclaimer-mode-title :deep(span) {
  font-weight: 300;
}

.rally-disclaimer-mode-list {
  margin: 0;
  padding-left: 1.25em;
  text-align: left;
}

.rally-disclaimer-mode-footer {
  margin-top: 0.75em;
}
</style>

<style lang="scss">
.popup.popup-style-rally {
  border: 0.2em solid var(--bng-orange-500);
  border-radius: 0.75em;

  .popup-content {
    border-top-left-radius: 0.1em;
    border-top-right-radius: 0.1em;
  }

  .popup-title {
    background: var(--bng-orange-500);
  }
}
</style>
