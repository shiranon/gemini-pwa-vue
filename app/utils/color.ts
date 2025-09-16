export function hexToRgba(hex: string, alpha = 1): string {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  if (!/^[0-9a-f]{6}$/i.test(c)) {
    // Fallback: white
    return `rgba(255, 255, 255, ${alpha})`
  }
  const num = Number.parseInt(c, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 入力を #RRGGBB 形式へ正規化（不正な場合は defaultHex を返す） */
export function normalizeHex(hex: string, defaultHex = '#000000'): string {
  if (typeof hex !== 'string') return defaultHex
  let v = hex.trim()
  if (!v.startsWith('#')) v = `#${v}`
  v = v.toLowerCase()
  // #rgb -> #rrggbb
  const m3 = /^#([0-9a-f]{3})$/i.exec(v)
  if (m3 && typeof m3[1] === 'string' && m3[1].length === 3) {
    const s = m3[1]
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
  }
  // #rrggbb
  const m6 = /^#([0-9a-f]{6})$/i.exec(v)
  if (m6) return `#${m6[1]}`
  return defaultHex
}
