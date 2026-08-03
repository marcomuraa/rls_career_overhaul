let nowFunc = null
export const now = () => {
  if (!nowFunc) {
    nowFunc = typeof performance !== "undefined" ? performance.now.bind(performance) : Date.now
  }
  return nowFunc()
}
