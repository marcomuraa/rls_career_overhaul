import { computed, onMounted, onUnmounted, readonly, ref } from "vue"
import { lua, useBridge } from "@/bridge"
import { clampNumber } from "@/utils/maths"

const RECENT_REFRESH_DELAY_MS = 250

// Keep one shared service instance so later media widgets stay on the same normalized state.
const SHARED_STATE = {
  jobsReady: ref(false),
  recentReady: ref(false),
  recentRefreshing: ref(false),
  galleryReady: ref(false),
  galleryRefreshing: ref(false),
  jobIds: ref([]),
  jobsById: ref({}),
  recentItemIds: ref([]),
  recentItemsById: ref({}),
  galleryItemIds: ref([]),
  galleryItemsById: ref({}),
  previewTargetId: ref(null),
}

let activeConsumers = 0
let listenersAttached = false
let recentRefreshTimerId = null
let sharedStateResetTimerId = null
let jobsRefreshPromise = null
let recentRefreshPromise = null
let galleryRefreshPromise = null

const JOB_PHASE_LABELS = Object.freeze({
  queue: "Queued",
  in_progress: "In Progress",
  saving: "Saving",
  done: "Done",
  error: "Error",
  unknown: "Unknown",
})

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (typeof payload === "string") {
    try {
      return normalizeArrayPayload(JSON.parse(payload))
    } catch {
      return []
    }
  }
  if (!payload || typeof payload !== "object") return []

  const keys = Object.keys(payload)
  if (keys.length === 0) return []
  if (payload.gamePath != null || payload.id != null) return [payload]

  return keys
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map(key => payload[key])
}

function normalizeGamePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim()
}

function getPathBaseName(gamePath) {
  const normalizedPath = normalizeGamePath(gamePath)
  const lastSlashIndex = normalizedPath.lastIndexOf("/")
  return lastSlashIndex >= 0 ? normalizedPath.slice(lastSlashIndex + 1) : normalizedPath
}

function toScreenshotUrl(gamePath) {
  return gamePath ? ('/' + normalizeGamePath(gamePath)) : ""
}

function clampPercent(value) {
  return Math.round(clampNumber(value, 0, 100))
}

function normalizeJobPhase(value) {
  const normalizedValue = String(value || "").trim().toLowerCase()
  if (normalizedValue === "in progress") return "in_progress"
  if (normalizedValue === "queue") return "queue"
  if (normalizedValue === "saving") return "saving"
  if (normalizedValue === "done") return "done"
  if (normalizedValue === "error") return "error"
  return "unknown"
}

function normalizeMetadata(value) {
  return value && typeof value === "object" ? value : null
}

function deriveOpenMapFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || !metadata.level) return null

  const nextOpenMap = {
    level: String(metadata.level),
  }

  if (Array.isArray(metadata.cameraPos) && metadata.cameraPos.length >= 3) {
    nextOpenMap.camPos = metadata.cameraPos.slice(0, 3).map(Number)
  }
  if (Array.isArray(metadata.cameraRot) && metadata.cameraRot.length >= 4) {
    nextOpenMap.camRot = metadata.cameraRot.slice(0, 4).map(Number)
  }

  const timeOfDay = Number(metadata.timeOfDay)
  if (Number.isFinite(timeOfDay)) {
    nextOpenMap.timeOfDay = timeOfDay
  }

  const fov = Number(metadata.fov)
  if (Number.isFinite(fov) && fov > 0) {
    nextOpenMap.fov = fov
  }

  return nextOpenMap
}

function formatScreenshotDateLabel(fileName) {
  const match = /^screenshot_(\d{4})-?(\d{2})-?(\d{2})_(\d{2})-?(\d{2})-?(\d{2})/i.exec(fileName || "")
  if (!match) return ""
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
}

function buildRecentItemId(gamePath) {
  const normalizedPath = normalizeGamePath(gamePath)
  return normalizedPath ? `path:${normalizedPath}` : ""
}

function mergeRecentItem(baseItem, nextItem) {
  return {
    ...baseItem,
    ...nextItem,
    shareUrl: nextItem.shareUrl || baseItem.shareUrl || "",
    openMap: nextItem.openMap || baseItem.openMap || null,
    metadata: nextItem.metadata || baseItem.metadata || null,
    metadataText: nextItem.metadataText || baseItem.metadataText || "",
  }
}

function sortRecentItemIds(byId) {
  return Object.keys(byId).sort((leftId, rightId) => {
    const leftItem = byId[leftId]
    const rightItem = byId[rightId]
    const leftKey = leftItem?.sortKey || ""
    const rightKey = rightItem?.sortKey || ""
    return rightKey.localeCompare(leftKey, undefined, { numeric: true })
  })
}

function normalizeJob(rawJob, index) {
  if (!rawJob || typeof rawJob !== "object") return null

  const rawId = rawJob.id != null ? rawJob.id : index
  const id = String(rawId)
  const filename = normalizeGamePath(rawJob.filename)
  const phase = normalizeJobPhase(rawJob.phase)
  const metadata = normalizeMetadata(rawJob.metadata)
  const openMap = rawJob.openMap && typeof rawJob.openMap === "object"
    ? rawJob.openMap
    : deriveOpenMapFromMetadata(metadata)

  return {
    id,
    rawId,
    runId: Number.isFinite(Number(rawJob.runId)) ? Number(rawJob.runId) : null,
    type: String(rawJob.type || ""),
    bufferType: String(rawJob.bufferType || ""),
    phase,
    phaseLabel: JOB_PHASE_LABELS[phase] || JOB_PHASE_LABELS.unknown,
    rawPhase: String(rawJob.phase || ""),
    percent: clampPercent(rawJob.percent),
    message: String(rawJob.message || ""),
    result: rawJob.result ?? null,
    filename,
    gamePath: filename,
    fileName: getPathBaseName(filename),
    metadata,
    openMap,
    isActive: phase === "queue" || phase === "in_progress" || phase === "saving",
    isDone: phase === "done",
    hasError: phase === "error",
  }
}

function normalizeRecentItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null

  const gamePath = normalizeGamePath(rawItem.gamePath || rawItem.path)
  if (!gamePath) return null

  const metadata = normalizeMetadata(rawItem.metadata)
  const openMap = rawItem.openMap && typeof rawItem.openMap === "object"
    ? rawItem.openMap
    : deriveOpenMapFromMetadata(metadata)
  const fileName = getPathBaseName(gamePath)

  let metadataText = ""
  if (metadata) {
    try {
      metadataText = JSON.stringify(metadata, null, 2)
    } catch {
      metadataText = ""
    }
  }

  return {
    id: buildRecentItemId(gamePath),
    source: "disk",
    gamePath,
    fileName,
    url: toScreenshotUrl(gamePath),
    dateLabel: formatScreenshotDateLabel(fileName),
    shareUrl: typeof rawItem.shareUrl === "string" ? rawItem.shareUrl : "",
    metadata,
    metadataText,
    openMap,
    sortKey: fileName || gamePath,
  }
}

function buildRecentItemFromCompletedJob(job) {
  if (!job || job.isDone !== true || job.type !== "full" || !job.gamePath) return null

  let metadataText = ""
  if (job.metadata) {
    try {
      metadataText = JSON.stringify(job.metadata, null, 2)
    } catch {
      metadataText = ""
    }
  }

  return {
    id: buildRecentItemId(job.gamePath),
    source: "job",
    gamePath: job.gamePath,
    fileName: job.fileName,
    url: toScreenshotUrl(job.gamePath),
    dateLabel: formatScreenshotDateLabel(job.fileName),
    shareUrl: "",
    metadata: job.metadata || null,
    metadataText,
    openMap: job.openMap || deriveOpenMapFromMetadata(job.metadata) || null,
    sortKey: job.fileName || job.gamePath,
  }
}

function setJobs(rawJobs) {
  const nextJobsById = {}
  const nextJobIds = []

  normalizeArrayPayload(rawJobs).forEach((rawJob, index) => {
    const normalizedJob = normalizeJob(rawJob, index)
    if (!normalizedJob) return
    nextJobsById[normalizedJob.id] = normalizedJob
    nextJobIds.push(normalizedJob.id)
  })

  SHARED_STATE.jobsById.value = nextJobsById
  SHARED_STATE.jobIds.value = nextJobIds
  SHARED_STATE.jobsReady.value = true
}

function setRecentItems(nextItems) {
  const nextRecentItemsById = {
    ...SHARED_STATE.recentItemsById.value,
  }
  const nextRecentItemIds = []

  normalizeArrayPayload(nextItems).forEach(rawItem => {
    const normalizedItem = normalizeRecentItem(rawItem)
    if (!normalizedItem) return

    const existingItem = SHARED_STATE.recentItemsById.value[normalizedItem.id]
    nextRecentItemsById[normalizedItem.id] = existingItem
      ? mergeRecentItem(existingItem, normalizedItem)
      : normalizedItem
    if (!nextRecentItemIds.includes(normalizedItem.id)) {
      nextRecentItemIds.push(normalizedItem.id)
    }
  })

  SHARED_STATE.recentItemsById.value = nextRecentItemsById
  SHARED_STATE.recentItemIds.value = nextRecentItemIds.sort((leftId, rightId) => {
    const leftItem = nextRecentItemsById[leftId]
    const rightItem = nextRecentItemsById[rightId]
    const leftKey = leftItem?.sortKey || ""
    const rightKey = rightItem?.sortKey || ""
    return rightKey.localeCompare(leftKey, undefined, { numeric: true })
  })
  SHARED_STATE.recentReady.value = true

  if (
    SHARED_STATE.previewTargetId.value
    && !nextRecentItemsById[SHARED_STATE.previewTargetId.value]
    && !SHARED_STATE.galleryItemsById.value[SHARED_STATE.previewTargetId.value]
  ) {
    SHARED_STATE.previewTargetId.value = null
  }
}

function setGalleryItems(nextItems) {
  const nextGalleryItemsById = {
    ...SHARED_STATE.galleryItemsById.value,
  }
  const nextGalleryItemIds = []

  normalizeArrayPayload(nextItems).forEach(rawItem => {
    const normalizedItem = normalizeRecentItem(rawItem)
    if (!normalizedItem) return

    const existingItem = SHARED_STATE.galleryItemsById.value[normalizedItem.id]
    nextGalleryItemsById[normalizedItem.id] = existingItem
      ? mergeRecentItem(existingItem, normalizedItem)
      : normalizedItem
    if (!nextGalleryItemIds.includes(normalizedItem.id)) {
      nextGalleryItemIds.push(normalizedItem.id)
    }
  })

  SHARED_STATE.galleryItemsById.value = nextGalleryItemsById
  SHARED_STATE.galleryItemIds.value = nextGalleryItemIds.sort((leftId, rightId) => {
    const leftItem = nextGalleryItemsById[leftId]
    const rightItem = nextGalleryItemsById[rightId]
    const leftKey = leftItem?.sortKey || ""
    const rightKey = rightItem?.sortKey || ""
    return rightKey.localeCompare(leftKey, undefined, { numeric: true })
  })
  SHARED_STATE.galleryReady.value = true

  if (
    SHARED_STATE.previewTargetId.value
    && !nextGalleryItemsById[SHARED_STATE.previewTargetId.value]
    && !SHARED_STATE.recentItemsById.value[SHARED_STATE.previewTargetId.value]
  ) {
    SHARED_STATE.previewTargetId.value = null
  }
}

function upsertRecentItem(nextItem) {
  if (!nextItem?.id) return

  const nextRecentItemsById = {
    ...SHARED_STATE.recentItemsById.value,
    [nextItem.id]: SHARED_STATE.recentItemsById.value[nextItem.id]
      ? mergeRecentItem(SHARED_STATE.recentItemsById.value[nextItem.id], nextItem)
      : nextItem,
  }

  SHARED_STATE.recentItemsById.value = nextRecentItemsById
  SHARED_STATE.recentItemIds.value = sortRecentItemIds(nextRecentItemsById)
  SHARED_STATE.recentReady.value = true
}

function mergeUploadPayload(payload) {
  const gamePath = normalizeGamePath(payload?.gamePath)
  const recentItemId = buildRecentItemId(gamePath)
  if (!recentItemId || !SHARED_STATE.recentItemsById.value[recentItemId]) return

  upsertRecentItem({
    ...SHARED_STATE.recentItemsById.value[recentItemId],
    shareUrl: typeof payload?.shareUrl === "string" ? payload.shareUrl : "",
  })
}

function scheduleRecentRefresh() {
  if (recentRefreshTimerId) {
    window.clearTimeout(recentRefreshTimerId)
  }

  recentRefreshTimerId = window.setTimeout(() => {
    recentRefreshTimerId = null
    void refreshRecentItems()
  }, RECENT_REFRESH_DELAY_MS)
}

function handleScreenshotJobsUpdate(payload) {
  setJobs(payload)

  normalizeArrayPayload(payload).forEach((rawJob, index) => {
    const normalizedJob = normalizeJob(rawJob, index)
    const recentItem = buildRecentItemFromCompletedJob(normalizedJob)
    if (recentItem) {
      upsertRecentItem(recentItem)
      scheduleRecentRefresh()
    }
  })
}

function handleScreenshotJobsAllDone() {
  scheduleRecentRefresh()
}

function handleScreenshotUploadComplete(payload) {
  mergeUploadPayload(payload)
  scheduleRecentRefresh()
}

function attachListeners() {
  if (listenersAttached) return

  const { events } = useBridge()
  events.on("ScreenshotJobsUpdate", handleScreenshotJobsUpdate)
  events.on("ScreenshotJobsAllDone", handleScreenshotJobsAllDone)
  events.on("ScreenshotUploadComplete", handleScreenshotUploadComplete)
  listenersAttached = true
}

function detachListeners() {
  if (!listenersAttached) return

  const { events } = useBridge()
  events.off("ScreenshotJobsUpdate", handleScreenshotJobsUpdate)
  events.off("ScreenshotJobsAllDone", handleScreenshotJobsAllDone)
  events.off("ScreenshotUploadComplete", handleScreenshotUploadComplete)
  listenersAttached = false
}

function resetSharedState() {
  SHARED_STATE.jobsReady.value = false
  SHARED_STATE.recentReady.value = false
  SHARED_STATE.recentRefreshing.value = false
  SHARED_STATE.galleryReady.value = false
  SHARED_STATE.galleryRefreshing.value = false
  SHARED_STATE.jobIds.value = []
  SHARED_STATE.jobsById.value = {}
  SHARED_STATE.recentItemIds.value = []
  SHARED_STATE.recentItemsById.value = {}
  SHARED_STATE.galleryItemIds.value = []
  SHARED_STATE.galleryItemsById.value = {}
  SHARED_STATE.previewTargetId.value = null
  jobsRefreshPromise = null
  recentRefreshPromise = null
  galleryRefreshPromise = null

  if (recentRefreshTimerId) {
    window.clearTimeout(recentRefreshTimerId)
    recentRefreshTimerId = null
  }
}

async function refreshJobs() {
  if (jobsRefreshPromise) return jobsRefreshPromise

  jobsRefreshPromise = (async () => {
    try {
      const payload = await lua.screenshot.getScreenshotJobsSnapshotJson()
      setJobs(payload)
      return SHARED_STATE.jobIds.value
    } catch {
      if (!SHARED_STATE.jobsReady.value) {
        setJobs([])
      }
      return SHARED_STATE.jobIds.value
    } finally {
      jobsRefreshPromise = null
    }
  })()

  return jobsRefreshPromise
}

async function refreshRecentItems() {
  if (recentRefreshPromise) return recentRefreshPromise

  SHARED_STATE.recentRefreshing.value = true
  recentRefreshPromise = (async () => {
    try {
      const payload = await lua.screenshot.getPhotomodeRollEntriesJson(10)
      setRecentItems(payload)
      return SHARED_STATE.recentItemIds.value
    } catch {
      if (!SHARED_STATE.recentReady.value) {
        setRecentItems([])
      }
      return SHARED_STATE.recentItemIds.value
    } finally {
      SHARED_STATE.recentRefreshing.value = false
      recentRefreshPromise = null
    }
  })()

  return recentRefreshPromise
}

async function refreshGalleryItems() {
  if (galleryRefreshPromise) return galleryRefreshPromise

  SHARED_STATE.galleryRefreshing.value = true
  galleryRefreshPromise = (async () => {
    try {
      const payload = await lua.screenshot.getPhotomodeRollEntriesJson(0)
      setGalleryItems(payload)
      return SHARED_STATE.galleryItemIds.value
    } catch {
      if (!SHARED_STATE.galleryReady.value) {
        setGalleryItems([])
      }
      return SHARED_STATE.galleryItemIds.value
    } finally {
      SHARED_STATE.galleryRefreshing.value = false
      galleryRefreshPromise = null
    }
  })()

  return galleryRefreshPromise
}

async function hydrate() {
  await Promise.all([
    refreshJobs(),
    refreshRecentItems(),
  ])
}

function setPreviewTarget(target) {
  if (!target) {
    SHARED_STATE.previewTargetId.value = null
    return
  }

  const previewTargetId = typeof target === "string"
    ? (SHARED_STATE.galleryItemsById.value[target] || SHARED_STATE.recentItemsById.value[target] ? target : buildRecentItemId(target))
    : target.id || buildRecentItemId(target.gamePath)

  SHARED_STATE.previewTargetId.value = SHARED_STATE.galleryItemsById.value[previewTargetId] || SHARED_STATE.recentItemsById.value[previewTargetId]
    ? previewTargetId
    : null
}

function clearPreviewTarget() {
  SHARED_STATE.previewTargetId.value = null
}

const jobs = computed(() =>
  SHARED_STATE.jobIds.value.map(jobId => SHARED_STATE.jobsById.value[jobId]).filter(Boolean)
)
const activeJobs = computed(() => jobs.value.filter(job => job.isActive))
const latestJob = computed(() => jobs.value[jobs.value.length - 1] || null)

const recentItems = computed(() =>
  SHARED_STATE.recentItemIds.value.map(itemId => SHARED_STATE.recentItemsById.value[itemId]).filter(Boolean)
)
const galleryItems = computed(() =>
  SHARED_STATE.galleryItemIds.value.map(itemId => SHARED_STATE.galleryItemsById.value[itemId]).filter(Boolean)
)
const previewTarget = computed(() =>
  SHARED_STATE.previewTargetId.value
    ? SHARED_STATE.galleryItemsById.value[SHARED_STATE.previewTargetId.value] || SHARED_STATE.recentItemsById.value[SHARED_STATE.previewTargetId.value] || null
    : null
)
const previewIndex = computed(() =>
  SHARED_STATE.previewTargetId.value
    ? (SHARED_STATE.galleryItemIds.value.includes(SHARED_STATE.previewTargetId.value)
      ? SHARED_STATE.galleryItemIds.value.indexOf(SHARED_STATE.previewTargetId.value)
      : SHARED_STATE.recentItemIds.value.indexOf(SHARED_STATE.previewTargetId.value))
    : -1
)

export const PHOTOMODE_MEDIA_JOB_PHASES = readonly(JOB_PHASE_LABELS)

export function usePhotomodeMediaState() {
  onMounted(() => {
    if (sharedStateResetTimerId) {
      window.clearTimeout(sharedStateResetTimerId)
      sharedStateResetTimerId = null
    }
    activeConsumers += 1
    if (activeConsumers === 1) {
      attachListeners()
      void hydrate()
    }
  })

  onUnmounted(() => {
    activeConsumers = Math.max(0, activeConsumers - 1)
    if (activeConsumers === 0) {
      detachListeners()
      sharedStateResetTimerId = window.setTimeout(() => {
        sharedStateResetTimerId = null
        if (activeConsumers === 0) {
          resetSharedState()
        }
      }, 0)
    }
  })

  return {
    jobsReady: readonly(SHARED_STATE.jobsReady),
    recentReady: readonly(SHARED_STATE.recentReady),
    recentRefreshing: readonly(SHARED_STATE.recentRefreshing),
    galleryReady: readonly(SHARED_STATE.galleryReady),
    galleryRefreshing: readonly(SHARED_STATE.galleryRefreshing),
    jobIds: readonly(SHARED_STATE.jobIds),
    jobsById: readonly(SHARED_STATE.jobsById),
    jobs: readonly(jobs),
    activeJobs: readonly(activeJobs),
    latestJob: readonly(latestJob),
    recentItemIds: readonly(SHARED_STATE.recentItemIds),
    recentItemsById: readonly(SHARED_STATE.recentItemsById),
    recentItems: readonly(recentItems),
    galleryItemIds: readonly(SHARED_STATE.galleryItemIds),
    galleryItemsById: readonly(SHARED_STATE.galleryItemsById),
    galleryItems: readonly(galleryItems),
    previewTargetId: readonly(SHARED_STATE.previewTargetId),
    previewTarget: readonly(previewTarget),
    previewIndex: readonly(previewIndex),
    refreshJobs,
    refreshRecentItems,
    refreshGalleryItems,
    setPreviewTarget,
    clearPreviewTarget,
  }
}
