import { getFile } from "@/utils"

// getSource timeout
const SOURCE_TIMEOUT = 60 // seconds

/**
 * Fetches a mod SFC source, falling back to a `?raw` request (and a default-export module)
 * when the plain fetch does not look like an SFC.
 * @param {String} fileUrl Full file URL to download the component from.
 * @param {Boolean} [withError] If true, rethrows fetch errors instead of swallowing them.
 * @returns {Promise<String>} The source text.
 */
export async function getSource(fileUrl, withError = false) {
  let source
  try {
    source = await getFile(fileUrl, SOURCE_TIMEOUT)
    if (!source.includes("<template>")) {
      const url = fileUrl + (fileUrl.includes("?") ? "&" : "?") + "raw"
      source = await getFile(url, SOURCE_TIMEOUT)
      if (source.startsWith("export default")) {
        source = (await import(/* @vite-ignore */ url)).default
      }
    }
    if (source) source = source.trim()
  } catch (err) {
    if (withError) throw err
  }
  return source
}
