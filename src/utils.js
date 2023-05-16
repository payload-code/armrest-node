function collapseKey(obj, keylist, curObj) {
  let keys

  if (curObj === undefined) return
  if (curObj.constructor === Array) {
    keys = {}
    for (let i = 0; i < curObj.length; i += 1) keys[i] = null
  } else {
    keys = curObj
  }

  Object.keys(keys).forEach((key) => {
    if (curObj[key] === undefined) return

    if (
      curObj[key] === null ||
      (curObj[key].constructor !== Object && curObj[key].constructor !== Array)
    ) {
      let newKey = keylist[0]
      newKey += `[${keylist.slice(1).concat(key).join('][')}]`
      obj[newKey] = curObj[key]
      return
    }

    collapseKey(obj, keylist.concat(key), curObj[key])
  })
}

function nestedQStringKeys(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null) return

    if (
      obj[key] !== undefined &&
      obj[key].constructor !== Object &&
      obj[key].constructor !== Array
    )
      return

    collapseKey(obj, [key], obj[key])
    delete obj[key]
  })

  return obj
}

function clone(obj) {
  if (obj == null || typeof obj !== 'object') return obj
  const copy = new obj.constructor()
  Object.keys(obj).forEach((attr) => {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) copy[attr] = obj[attr]
  })
  return copy
}

export { nestedQStringKeys, clone }
