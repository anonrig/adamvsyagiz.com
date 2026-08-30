export type Point = { x: number; y: number }

export function scale(value: number, domain: [number, number], range: [number, number]): number {
  const [d0, d1] = domain
  const [r0, r1] = range
  if (d1 === d0) {
    return r0
  }
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0)
}

export function polyline(
  values: (number | null)[],
  domainX: [number, number],
  domainY: [number, number],
  rangeX: [number, number],
  rangeY: [number, number],
): string {
  const parts: string[] = []
  values.forEach((value, index) => {
    if (value === null) {
      return
    }
    const x = scale(index, domainX, rangeX)
    const y = scale(value, domainY, rangeY)
    parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  })
  return parts.join(' ')
}

export function areaPath(
  values: (number | null)[],
  domainX: [number, number],
  domainY: [number, number],
  rangeX: [number, number],
  rangeY: [number, number],
  baseline = 0,
): string {
  const line = polyline(values, domainX, domainY, rangeX, rangeY)
  if (!line) {
    return ''
  }
  const lastIndex = values.findLastIndex((value) => value !== null)
  const firstIndex = values.findIndex((value) => value !== null)
  if (lastIndex < 0 || firstIndex < 0) {
    return ''
  }
  const x0 = scale(firstIndex, domainX, rangeX)
  const x1 = scale(lastIndex, domainX, rangeX)
  const yBase = scale(baseline, domainY, rangeY)
  return `${line} L${x1.toFixed(1)} ${yBase.toFixed(1)} L${x0.toFixed(1)} ${yBase.toFixed(1)} Z`
}

export function ticks(min: number, max: number, count: number): number[] {
  if (count <= 1) {
    return [min]
  }
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, index) => min + step * index)
}
