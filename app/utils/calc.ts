export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, decimals = 0): number {
  const p = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * p) / p
}

export function toPercent(value: number, decimals = 0): number {
  return round(value * 100, decimals)
}

export function fromPercent(percent: number, decimals = 2): number {
  return round(percent / 100, decimals)
}
