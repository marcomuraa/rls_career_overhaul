const mockDataModules = import.meta.glob('../apps/*/mockdata/*.json', { eager: true, import: 'default' })

const cache = {}

for (const [path, data] of Object.entries(mockDataModules)) {
  const parts = path.split('/')
  const appsIdx = parts.indexOf('apps')
  const folderDirective = parts[appsIdx + 1]
  const directives = data.directives || [folderDirective]
  let entries
  if (data.events) {
    entries = data.events.map(evt => ({ ...evt, name: data.name }))
    if (data.data) {
      entries.push({ name: data.name, data: data.data })
    }
  } else {
    entries = [data]
  }
  for (const d of directives) {
    if (!cache[d]) cache[d] = []
    cache[d].push(...entries)
  }
}

export function getMockData(directive) {
  return cache[directive] || []
}

function emitStream(frame) {
  window.vueEventBus?.emit("onStreamsUpdate", frame)
  window.globalAngularRootScope?.$broadcast("streamsUpdate", frame)
}

function emitEvent(eventName, payload) {
  window.vueEventBus?.emit(eventName, payload)
  window.globalAngularRootScope?.$broadcast(eventName, payload)
}

export function createMockDataEmitter(mockDataFiles) {
  let fileIndex = 0
  let frameIndex = 0
  let rafId = null
  const activeTimers = []

  function isEventBased(file) {
    return !!file.eventName
  }

  function isIntervalEvent(file) {
    return isEventBased(file) && file.eventInterval > 0
  }

  function isImmediateEvent(file) {
    return isEventBased(file) && !file.eventInterval
  }

  function emitImmediateEvents() {
    for (const file of mockDataFiles) {
      if (!isImmediateEvent(file)) continue
      for (const payload of file.data) {
        emitEvent(file.eventName, payload)
      }
    }
  }

  function startIntervalEvents() {
    for (const file of mockDataFiles) {
      if (!isIntervalEvent(file)) continue
      let idx = 0
      function emitNext() {
        emitEvent(file.eventName, file.data[idx])
        idx = (idx + 1) % file.data.length
        activeTimers.push(setTimeout(emitNext, file.eventInterval))
      }
      emitNext()
    }
  }

  function tick() {
    const file = mockDataFiles[fileIndex]

    // Skip event-based files in the rAF loop
    if (isEventBased(file)) {
      fileIndex = (fileIndex + 1) % mockDataFiles.length
      if (!isEventBased(mockDataFiles[fileIndex])) {
        rafId = requestAnimationFrame(tick)
      }
      return
    }

    emitStream(file.data[frameIndex])

    frameIndex++
    if (frameIndex >= file.data.length) {
      fileIndex = (fileIndex + 1) % mockDataFiles.length
      frameIndex = 0
    }

    rafId = requestAnimationFrame(tick)
  }

  const hasStreamFiles = mockDataFiles.some(f => !isEventBased(f))

  return {
    get currentName() {
      return mockDataFiles[fileIndex]?.name ?? null
    },
    start() {
      fileIndex = 0
      frameIndex = 0
      emitImmediateEvents()
      startIntervalEvents()
      if (hasStreamFiles) {
        while (isEventBased(mockDataFiles[fileIndex])) {
          fileIndex = (fileIndex + 1) % mockDataFiles.length
        }
        rafId = requestAnimationFrame(tick)
      }
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      for (const id of activeTimers) clearTimeout(id)
      activeTimers.length = 0
    },
  }
}
