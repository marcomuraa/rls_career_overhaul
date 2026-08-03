function getSyntaxErrorLocation(err) {
  if (typeof err?.lineNumber === "number" && typeof err?.columnNumber === "number") {
    return { line: err.lineNumber, column: err.columnNumber }
  }
  if (typeof err?.line === "number" && typeof err?.column === "number") {
    return { line: err.line, column: err.column }
  }
  const stack = String(err?.stack || "")
  // common formats:
  // - "<anonymous>:12:34"
  // - "Function:12:34"
  // - "<sourceURL>:12:34"
  const m = stack.match(/(?:<anonymous>|Function):(\d+):(\d+)/)
  if (m) return { line: Number(m[1]), column: Number(m[2]) }
  return null
}

function getStackLineLocation(stackLine) {
  const m = String(stackLine || "").match(/:(\d+):(\d+)\s*$/)
  if (!m) return null
  return { line: Number(m[1]), column: Number(m[2]) }
}

function getMessageLocation(err, marker = "") {
  // CEF sometimes puts location only into the *printed* error string, not into err.stack.
  // Examples:
  // - "SyntaxError: Unexpected token ',' (at MainMenuDebug.vue.generated.mjs:406:30)"
  // - "Unexpected token ',' (at MainMenuDebug.vue.generated.mjs:406:30)"
  const s = String(err || "")
  if (!s) return null
  const m = s.match(/\(at\s+([^)]+?):(\d+):(\d+)\)/)
  if (m) {
    if (!marker || String(m[1]).includes(marker)) {
      return { line: Number(m[2]), column: Number(m[3]) }
    }
  }
  return null
}

function codeFrame(code, line = 1, column = 1, context = 3) {
  const lines = String(code).split("\n")
  const idx = Math.max(0, (line || 1) - 1)
  const start = Math.max(0, idx - context)
  const end = Math.min(lines.length, idx + context + 1)
  const width = String(end).length

  const out = []
  for (let i = start; i < end; i++) {
    const num = String(i + 1).padStart(width, " ")
    out.push(`${num}|${lines[i]}`)
    if (i === idx) {
      const caretPos = Math.max(0, (column || 1) - 1)
      out.push(`${" ".repeat(width)}|${" ".repeat(caretPos)}^`)
    }
  }
  return out.join("\n")
}

async function getEngineSyntaxErrorLocation(generatedCode, sourceUrl) {
  if (!sourceUrl || !URL || !Blob) return null
  const marker = `${String(sourceUrl).replace(/\s/g, "_")}.generated.mjs`
  const blobUrl = URL.createObjectURL(new Blob(
    [`${generatedCode}\n//# sourceURL=${marker}\n`],
    { type: "text/javascript" }
  ))

  // that's the only way to get the location of the syntax error
  let evtLoc = null
  const onError = err => {
    try {
      const filename = String(err?.filename || "")
      if (!filename) return
      if (!filename.includes(marker) && !filename.startsWith("blob:")) return
      if (typeof err?.lineno !== "number" || typeof err?.colno !== "number") return
      evtLoc = { line: err.lineno, column: err.colno }
      return true
    } catch { }
  }
  try {
    window.addEventListener("error", onError, true)
    await new Promise(resolve => {
      const script = document.createElement("script")
      script.type = "module"
      script.src = blobUrl
      script.async = true
      const done = () => {
        try { script.remove() } catch {}
        resolve()
      }
      script.addEventListener("error", done, { once: true })
      script.addEventListener("load", done, { once: true })
      setTimeout(done, 250) // just in case
      document.head.appendChild(script)
    })
  } finally {
    window.removeEventListener("error", onError, true)
    URL.revokeObjectURL(blobUrl)
  }
  return evtLoc
}

export async function buildCompileError(err, generatedCode, sourceUrl) {
  let loc = getSyntaxErrorLocation(err)
  if (!loc) {
    loc = await getEngineSyntaxErrorLocation(generatedCode, sourceUrl)
  }
  const frame = loc ? codeFrame(generatedCode, loc.line, loc.column) : codeFrame(generatedCode, 1, 1)
  const e = new SyntaxError(`${err?.message || "Syntax error"}\n\n${frame}`)
  e.original = err
  e.generated = generatedCode
  e.sourceUrl = sourceUrl
  return e
}
