// define mod mounting point structure here
export const MODSLOTS = {
  test: null,
  mainmenu: {
    top: null,
    button: null,
  },
  vehconfig: {
    parts: {
      bottom: null,
    },
    tuning: {
      bottom: null,
    },
  },
}

// this not just creates a flat list but also sets names on the MODSLOTS object
export const MODSLOTS_LIST = Object.entries(MODSLOTS).reduce((res, [key, value]) => {
  const dive = (obj, prefix, parent, parentKey) => {
    if (!obj) {
      if (parent && parentKey) parent[parentKey] = prefix
      return [prefix]
    }
    return Object.entries(obj).reduce((arr, [k, v]) => {
      return arr.concat(dive(v, `${prefix}.${k}`, obj, k))
    }, [])
  }
  return res.concat(dive(value, key, MODSLOTS, key))
}, []).sort()
