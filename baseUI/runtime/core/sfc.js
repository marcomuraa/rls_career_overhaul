// SFC compilation
//
// parse + compile the script/template/style blocks into ESM source strings + plain css.
// module runtime instantiates the result (transform > load deps > eval > assemble).
// styles are expected to be plain css already.

import { parse as sfcParse, compileScript, compileTemplate, compileStyleAsync } from "@vue/compiler-sfc"

// scopeId is supplied by the caller (the module graph allocates a persistent unique id per SFC, e.g. "data-v-1a")
// it must be unique across all simultaneously-mounted components, which the registry guarantees
export async function compileSfc(source, { id, isProd, scopeId }) {
  const { descriptor } = sfcParse(source, { filename: id })
  const hasScoped = descriptor.styles.some(s => s.scoped)

  const templateOptions = descriptor.template ? {
    source: descriptor.template.content,
    filename: id,
    isProd,
    scoped: hasScoped,
    id: scopeId,
    slotted: descriptor.slotted,
    compilerOptions: { scopeId: hasScoped ? scopeId : undefined, comments: false },
  } : null

  let scriptCode = null
  if (descriptor.script || descriptor.scriptSetup) {
    const block = compileScript(descriptor, { id: scopeId, isProd, inlineTemplate: false, templateOptions })
    if (templateOptions) templateOptions.compilerOptions.bindingMetadata = block.bindings
    scriptCode = block.content
  }

  let templateCode = null
  let templateErrors = []
  if (descriptor.template) {
    const t = compileTemplate(templateOptions)
    templateCode = t.code
    templateErrors = t.errors || []
  }

  const styles = []
  for (const style of descriptor.styles) {
    const compiled = await compileStyleAsync({
      filename: id, source: style.content, isProd, id: scopeId, scoped: style.scoped, trim: true,
    })
    styles.push({ code: compiled.code, scoped: style.scoped, errors: compiled.errors || [] })
  }

  return { scopeId, hasScoped, scriptCode, templateCode, templateErrors, styles }
}
