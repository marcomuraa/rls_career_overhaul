// Injection key for the per-layer operations exposed by PhotomodeOverlay.vue.
// Lives in its own module so both the provider and consumer import the same
// Symbol reference without triggering a circular import between them.

export const PHOTOMODE_LAYER_OPS = Symbol("photomode-layer-ops")
