let implPromise

function loadImpl() {
  if (implPromise) return implPromise
  if (__BNG_RT__) implPromise = import("./compiler.runtime.js")
  else implPromise = import("./compiler.standalone.js")
  return implPromise
}

export const getComponent = async (...a) => (await loadImpl()).getComponent(...a)
export const buildComponent = async (...a) => (await loadImpl()).buildComponent(...a)
export const resetComponentCache = async (...a) => (await loadImpl()).resetComponentCache(...a)
export const resetAllCaches = async (...a) => (await loadImpl()).resetAllCaches(...a)
export const loadModule = async (...a) => (await loadImpl()).loadModule(...a)
export const refreshComponents = async (...a) => (await loadImpl()).refreshComponents(...a)
