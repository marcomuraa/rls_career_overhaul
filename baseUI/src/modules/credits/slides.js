const DEFAULT_LAYOUT = Object.freeze({
  maxRowsPerSlide: 19,
  groupTitleRows: 3,
  groupSubtitleRows: 2,
  groupTertiaryRows: 1,
  dividerRows: 2,
  tryTwoColumns: true,
})

function isEmptyMember(member) {
  return !member?.first && !member?.last && !member?.aka && !member?.role
}

function isSlideBreakMember(member) {
  return isEmptyMember(member) && !!member?.slideBreak
}

function isDividerMember(member) {
  return isEmptyMember(member) && !!member?.divider
}

function trimEdgeEmptyMembers(members) {
  let start = 0
  let end = members.length - 1
  while (start <= end && isEmptyMember(members[start])) start += 1
  while (end >= start && isEmptyMember(members[end])) end -= 1
  return members.slice(start, end + 1)
}

function decorateChunkMembers(members, tryTwoColumns) {
  const decorated = members.map(member => ({
    ...member,
    _isContent: !isEmptyMember(member),
    _isDivider: isDividerMember(member),
    _isTwoColumnFull: false,
  }))

  if (!tryTwoColumns) return decorated

  let contentSinceDivider = 0
  for (let idx = 0; idx < decorated.length; idx += 1) {
    const member = decorated[idx]
    if (member._isDivider) {
      member._isTwoColumnFull = true
      const prev = decorated[idx - 1]
      if (prev?._isContent && contentSinceDivider % 2 === 1) {
        prev._isTwoColumnFull = true
      }
      contentSinceDivider = 0
      continue
    }
    if (member._isContent) contentSinceDivider += 1
  }

  if (contentSinceDivider % 2 === 1) {
    for (let idx = decorated.length - 1; idx >= 0; idx -= 1) {
      const member = decorated[idx]
      if (member._isDivider) break
      if (member._isContent) {
        member._isTwoColumnFull = true
        break
      }
    }
  }

  return decorated
}

function canUseTwoColumns(group, layout) {
  if (!layout.tryTwoColumns) return false
  const contentMembers = group.members.filter(member => !isEmptyMember(member))
  if (!contentMembers.length) return false
  return contentMembers.every(member => !member?.role)
}

function groupHeaderRows(group, layout) {
  let headerRows = 0
  if (group?.groupTitle) headerRows += layout.groupTitleRows
  if (group?.groupSubtitle) headerRows += layout.groupSubtitleRows
  if (group?.groupTertiaryTitle) headerRows += layout.groupTertiaryRows
  return headerRows
}

function groupRows(group, layout) {
  let memberRows = 0

  if (group.tryTwoColumns) {
    let pendingInRow = false
    for (const member of group.members) {
      if (isDividerMember(member)) {
        memberRows += layout.dividerRows
        pendingInRow = false
        continue
      }
      if (!pendingInRow) {
        memberRows += 1
        pendingInRow = true
      } else {
        pendingInRow = false
      }
    }
  } else {
    for (const member of group.members) {
      if (isDividerMember(member)) {
        memberRows += layout.dividerRows
      } else {
        memberRows += 1
      }
    }
  }

  return groupHeaderRows(group, layout) + memberRows
}

function splitGroupByMembers(group, layout) {
  const groupForColumns = {
    ...group,
    tryTwoColumns: canUseTwoColumns(group, layout),
  }
  const maxMemberRowsPerSlide = Math.max(1, layout.maxRowsPerSlide - groupHeaderRows(groupForColumns, layout))
  const chunks = []
  let chunkMembers = []
  let chunkRows = 0
  let pendingInTwoColRow = false

  const flushChunk = () => {
    const trimmed = trimEdgeEmptyMembers(chunkMembers)
    if (!trimmed.length) {
      chunkMembers = []
      chunkRows = 0
      pendingInTwoColRow = false
      return
    }
    chunks.push({
      groupTitle: group.groupTitle,
      groupSubtitle: group.groupSubtitle,
      groupTertiaryTitle: group.groupTertiaryTitle,
      groupSingle: group.groupSingle,
      tryTwoColumns: groupForColumns.tryTwoColumns,
      members: decorateChunkMembers(trimmed, groupForColumns.tryTwoColumns),
    })
    chunkMembers = []
    chunkRows = 0
    pendingInTwoColRow = false
  }

  for (const member of group.members) {
    if (isSlideBreakMember(member)) {
      flushChunk()
      continue
    }

    if (isDividerMember(member)) {
      if (chunkRows + layout.dividerRows > maxMemberRowsPerSlide) flushChunk()
      chunkMembers.push(member)
      chunkRows += layout.dividerRows
      pendingInTwoColRow = false
      continue
    }

    if (groupForColumns.tryTwoColumns) {
      const startsNewRow = !pendingInTwoColRow
      if (startsNewRow && chunkRows >= maxMemberRowsPerSlide) flushChunk()
      chunkMembers.push(member)
      if (startsNewRow) {
        chunkRows += 1
        pendingInTwoColRow = true
      } else {
        pendingInTwoColRow = false
      }
      continue
    }

    if (chunkRows >= maxMemberRowsPerSlide) flushChunk()
    chunkMembers.push(member)
    chunkRows += 1
  }

  flushChunk()
  return chunks
}

function appendGroupChunk(currentSlide, groupChunk, layout, currentRows) {
  const rowsNeeded = groupRows(groupChunk, layout)

  if (currentRows + rowsNeeded > layout.maxRowsPerSlide) return null

  currentSlide.push(groupChunk)
  return currentRows + rowsNeeded
}

export function buildCreditSlides(groups = [], layoutOptions = {}) {
  const layout = {
    ...DEFAULT_LAYOUT,
    ...layoutOptions,
  }

  const slides = []
  let currentSlide = []
  let currentRows = 0

  const flushCurrent = () => {
    if (!currentSlide.length) return
    slides.push(currentSlide)
    currentSlide = []
    currentRows = 0
  }

  for (const group of groups) {
    const chunks = splitGroupByMembers(group, layout)

    if (group.groupSingle) {
      flushCurrent()
      for (const chunk of chunks) {
        slides.push([chunk])
      }
      continue
    }

    for (const chunk of chunks) {
      const updatedRows = appendGroupChunk(currentSlide, chunk, layout, currentRows)
      if (updatedRows !== null) {
        currentRows = updatedRows
        continue
      }

      flushCurrent()
      const rowsAfterFlush = appendGroupChunk(currentSlide, chunk, layout, currentRows)
      currentRows = rowsAfterFlush ?? currentRows
    }
  }

  flushCurrent()
  return slides
}

export { DEFAULT_LAYOUT }
