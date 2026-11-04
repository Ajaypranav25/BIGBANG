const SUP: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}

/** 1.23 × 10¹⁰ style for large magnitudes, plain grouping otherwise. */
export function sci(value: number, digits = 2, plainBelow = 1e6): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) < plainBelow && Math.abs(value) >= 0.01) {
    return value.toLocaleString('en-US', { maximumFractionDigits: value < 10 ? digits : 0 })
  }
  const exp = Math.floor(Math.log10(Math.abs(value)))
  const mant = value / 10 ** exp
  const sup = String(exp)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('')
  return `${mant.toFixed(digits - 1)} × 10${sup}`
}

export function population(millions: number): string {
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)} billion`
  if (millions >= 1) return `${Math.round(millions)} million`
  return `${Math.round(millions * 1000)} thousand`
}

const SUP_TO_ASCII: Record<string, string> = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]))
const SUP_RUN = /[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g

export interface TextPart {
  text: string
  sup: boolean
}

/** Split "10⁻⁴³ s" into plain and superscript runs so they render with <sup> (fonts lack the glyphs). */
export function splitSuperscripts(s: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const m of s.matchAll(SUP_RUN)) {
    if (m.index! > last) parts.push({ text: s.slice(last, m.index), sup: false })
    parts.push({ text: [...m[0]].map((c) => SUP_TO_ASCII[c] ?? c).join('').replace('-', '−'), sup: true })
    last = m.index! + m[0].length
  }
  if (last < s.length) parts.push({ text: s.slice(last), sup: false })
  return parts
}

/** Write rich text into an element without innerHTML. */
export function writeRich(el: HTMLElement, s: string): void {
  if (el.dataset.text === s) return
  el.dataset.text = s
  el.replaceChildren(
    ...splitSuperscripts(s).map((p) => {
      if (!p.sup) return document.createTextNode(p.text)
      const sup = document.createElement('sup')
      sup.textContent = p.text
      return sup
    }),
  )
}
