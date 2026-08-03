// guarantees unique ID until 1000000000
// after 1000000000 it will be virtually-unique
let counter = 0

/**
 * Guaranteed unique float.
 * @returns Unique float.
 */
export const uniqueNum = () => (++counter % 1e9) + Math.random()

/**
 * Guaranteed unique string.
 * @prop {string} [name=""]       Optional string to prefix ID with.
 * @prop {string} [separator="."] Optional separator. Do not use empty separator, as it may result in a non-unique ID.
 * @returns Unique string.
 */
export const uniqueId = (name = "", separator = ".") => {
  const str = `${name ? name + separator : ""}${uniqueNum().toString(16)}`
  return separator === "." ? str : str.replace(".", separator)
}

/**
 * Safe guaranteed unique string, separated with underscore.
 * @returns Safe unique id, separated with underscore.
 */
export const uniqueSafeId = () => uniqueId("", "_")

/*
  cyrb53 (c) 2018 bryc (github.com/bryc)
  License: Public domain (or MIT if needed). Attribution appreciated.
  A fast and simple 53-bit string hash function with decent collision resistance.
  Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export const stableIds = {
  byName: new Map(),
  byHash: new Map(),
}

/**
 * Deterministic, collision-free id derived from an input string.
 * {@link stableIds}.
 * @param {string} input    Source string to derive the id from.
 * @param {string} [prefix] Optional prefix prepended to the id.
 * @returns Deterministic string id (base36 hash), optionally prefixed.
 */
export const stableId = (input, prefix = "") => {
  const name = String(input || "")
  let hash = stableIds.byName.get(name)
  if (hash === undefined) {
    let seed = 0
    hash = cyrb53(name, seed).toString(36)
    // re-roll on the (astronomically rare) clash with a different name
    while (stableIds.byHash.has(hash) && stableIds.byHash.get(hash) !== name) {
      hash = cyrb53(name, ++seed).toString(36)
    }
    stableIds.byName.set(name, hash)
    stableIds.byHash.set(hash, name)
  }
  return `${prefix}${hash}`
}
