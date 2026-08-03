const LUA_PREFIX = "pause"
const VUE_PREFIX = "menu.pause"

export function toLuaRouteName(vueRouteName) {
  if (!vueRouteName) return vueRouteName
  if (vueRouteName.startsWith(VUE_PREFIX)) {
    const suffix = vueRouteName.slice(VUE_PREFIX.length)
    return LUA_PREFIX + suffix
  }
  return vueRouteName
}

export function toVueRouteName(luaRouteName) {
  if (!luaRouteName) return luaRouteName
  if (luaRouteName.startsWith(LUA_PREFIX)) {
    const suffix = luaRouteName.slice(LUA_PREFIX.length)
    return VUE_PREFIX + suffix
  }
  return luaRouteName
}
