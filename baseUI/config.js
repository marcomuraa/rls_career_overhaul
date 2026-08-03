// this file can be imported through a virtual module "bng:config"

// flip this switch when in shipping mode or not
export const SHIPPING = false

// helper functions
export const isShipping = () => window?.beamng ? window.beamng.shipping : SHIPPING
export const isProd = () => !__BNG_DEV__
export const isDev = () => __BNG_DEV__

export const optionsConfig = {
  // when true, layout JSON is bundled into JS at build time instead of fetched at runtime
  bundleLayout: false,
  // when true, dev layout JSON is included in the bundle
  bundleDevLayout: !SHIPPING, // this should be relative to shipping mode

  // list versions in descending order
  // first is the latest version
  versions: [
    "0.39",
    "0.38",
    "0.37",
    "0.36",
    "0.35",
  ],
}
