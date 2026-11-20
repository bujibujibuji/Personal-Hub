// 旧版 WebView 兼容补丁：部分安卓手机的系统 WebView 版本较旧（Chrome 49~70），
// 缺少 ES2016+ 的内置方法。缺失时 app-service.js 运行报错，
// 表现为闪屏停留约 10 秒后、除底部导航外整页空白。
// 必须在 main.js 最顶部最先导入；均做特性检测，不覆盖原生实现。
/* eslint-disable no-extend-native */
function defineMethod(target, name, value) {
  if (!target || target[name]) return
  Object.defineProperty(target, name, {
    value,
    writable: true,
    configurable: true,
  })
}

// ES2022：Array/String.prototype.at
defineMethod(Array.prototype, 'at', function at(index) {
  const len = this.length >>> 0
  const i = Math.trunc(Number(index) || 0)
  const pos = i < 0 ? len + i : i
  return pos >= 0 && pos < len ? this[pos] : undefined
})

defineMethod(String.prototype, 'at', function at(index) {
  const str = String(this)
  const len = str.length >>> 0
  const i = Math.trunc(Number(index) || 0)
  const pos = i < 0 ? len + i : i
  return pos >= 0 && pos < len ? str[pos] : undefined
})

// ES2022：Object.hasOwn
defineMethod(Object, 'hasOwn', function hasOwn(target, key) {
  return target != null && Object.prototype.hasOwnProperty.call(Object(target), key)
})

// ES2021：String.prototype.replaceAll
defineMethod(String.prototype, 'replaceAll', function replaceAll(search, replacement) {
  const pattern =
    search instanceof RegExp
      ? new RegExp(search.source, search.flags.includes('g') ? search.flags : `${search.flags}g`)
      : search
  return String(this).replace(pattern, replacement)
})

// ES2017：Object.entries / Object.values（Chrome 54+）
defineMethod(Object, 'entries', function entries(target) {
  const result = []
  if (target == null) return result
  Object.keys(Object(target)).forEach(function (key) {
    result.push([key, target[key]])
  })
  return result
})

defineMethod(Object, 'values', function values(target) {
  const result = []
  if (target == null) return result
  Object.keys(Object(target)).forEach(function (key) {
    result.push(target[key])
  })
  return result
})

// ES2019：Object.fromEntries（Chrome 73+）
defineMethod(Object, 'fromEntries', function fromEntries(entries) {
  const result = {}
  if (!entries) return result
  const list = Array.from(entries)
  for (let i = 0; i < list.length; i += 1) {
    const pair = list[i]
    if (pair) result[pair[0]] = pair[1]
  }
  return result
})

// ES2017：String.prototype.padStart / padEnd（Chrome 57+）
defineMethod(String.prototype, 'padStart', function padStart(length, pad) {
  const str = String(this)
  const target = Math.trunc(Number(length) || 0)
  if (str.length >= target) return str
  const filler = pad === undefined ? ' ' : String(pad)
  if (!filler) return str
  let prefix = ''
  while (prefix.length + str.length < target) prefix += filler
  return prefix.slice(0, target - str.length) + str
})

defineMethod(String.prototype, 'padEnd', function padEnd(length, pad) {
  const str = String(this)
  const target = Math.trunc(Number(length) || 0)
  if (str.length >= target) return str
  const filler = pad === undefined ? ' ' : String(pad)
  if (!filler) return str
  let suffix = ''
  while (str.length + suffix.length < target) suffix += filler
  return str + suffix.slice(0, target - str.length)
})

// ES2019：String.prototype.trimStart / trimEnd（Chrome 66+）
defineMethod(String.prototype, 'trimStart', function trimStart() {
  return String(this).replace(/^\s+/, '')
})

defineMethod(String.prototype, 'trimEnd', function trimEnd() {
  return String(this).replace(/\s+$/, '')
})

// ES2019：Array.prototype.flat / flatMap（Chrome 69+）
defineMethod(Array.prototype, 'flat', function flat(depth) {
  const level = depth === undefined ? 1 : Math.trunc(Number(depth) || 0)
  const result = []
  const flatten = (list, current) => {
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i]
      if (Array.isArray(item) && current > 0) flatten(item, current - 1)
      else if (i in list) result.push(item)
    }
  }
  flatten(this, level < 0 ? Infinity : level)
  return result
})

defineMethod(Array.prototype, 'flatMap', function flatMap(callback, thisArg) {
  return this.map(callback, thisArg).flat(1)
})

// ES2018：Promise.prototype.finally（Chrome 63+）
if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
  Promise.prototype.finally = function finally_(callback) {
    const run = typeof callback === 'function' ? callback : function () {}
    return this.then(
      (value) => Promise.resolve(run()).then(() => value),
      (reason) =>
        Promise.resolve(run()).then(() => {
          throw reason
        }),
    )
  }
}

// ES2020：String.prototype.matchAll（Chrome 73+），仅老引擎需要。
defineMethod(String.prototype, 'matchAll', function matchAll(pattern) {
  const source = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g')
  const flags = source.flags.includes('g') ? source.flags : `${source.flags}g`
  const regex = new RegExp(source.source, flags)
  const text = String(this)
  const matches = []
  let match = regex.exec(text)
  while (match) {
    matches.push(match)
    if (match[0] === '') regex.lastIndex += 1
    match = regex.exec(text)
  }
  return matches[Symbol.iterator]()
})

// ES2019：queueMicrotask（Chrome 71+）
if (typeof queueMicrotask === 'undefined') {
  const enqueue =
    typeof Promise !== 'undefined'
      ? function (callback) {
          Promise.resolve().then(callback)
        }
      : function (callback) {
          setTimeout(callback, 0)
        }
  if (typeof window !== 'undefined') window.queueMicrotask = enqueue
  if (typeof globalThis !== 'undefined') globalThis.queueMicrotask = enqueue
}
