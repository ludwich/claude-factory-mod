import type { AsciiLine, AsciiSpan, Palette, Role, SceneView, WorkerView } from './art/types.ts'
import { PALETTES } from './art/palette.ts'
import { tint } from './art/clawd.ts'

// The factory floor as coloured terminal text. Every glyph is a single BMP
// code point of width 1 (no emoji, no CJK), so String.length == columns used.

type Row = AsciiSpan[]

const len = (spans: Row): number => spans.reduce((a, s) => a + s.text.length, 0)
const sp = (text: string, color?: string, bold?: boolean): AsciiSpan =>
  bold ? { text, color, bold } : color ? { text, color } : { text }
const pad = (spans: Row, w: number): Row => {
  const n = len(spans)
  return n < w ? [...spans, sp(' '.repeat(w - n))] : spans
}
const trunc = (s: string, n: number): string => (n <= 0 ? '' : s.length <= n ? s : n === 1 ? s.slice(0, 1) : s.slice(0, n - 1) + '…')

/** Hard clip a line to `w` columns (safety net). */
function clip(line: Row, w: number): Row {
  const out: Row = []
  let used = 0
  for (const s of line) {
    if (used >= w) break
    const t = s.text.slice(0, w - used)
    if (t) out.push({ ...s, text: t })
    used += t.length
  }
  return out
}

/** Word-wrap to width w (long words are hard-split). */
function wrap(text: string, w: number): string[] {
  const out: string[] = []
  let cur = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > w) {
      if (cur) { out.push(cur); cur = '' }
      out.push(word.slice(0, w)); word = word.slice(w)
    }
    if (!word) continue
    if (!cur) cur = word
    else if (cur.length + 1 + word.length <= w) cur += ' ' + word
    else { out.push(cur); cur = word }
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

function gray(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const y = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  const h = Math.min(255, Math.round(y * 1.15)).toString(16).padStart(2, '0')
  return `#${h}${h}${h}`
}

function rgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lum(hex: string): number {
  const [r = 0, g = 0, b = 0] = rgb(hex).map(c => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string): number => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b)
  return '#' + x.map((c, i) => Math.round(c + (y[i]! - c) * t).toString(16).padStart(2, '0')).join('')
}
const hex = (c: number[]): string => '#' + c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
/** A typical dark terminal: the terminal never paints p.bg, so legibility is judged against this. */
const TERM = '#1e1e1e'
/** Brighten `c` (hue first, then toward white) until it reads on a dark terminal and on p.bg. */
function lift(c: string, bg: string, target = 4.5): string {
  const okc = (x: string) => contrast(x, TERM) >= target && contrast(x, bg) >= Math.min(target, 3.2)
  if (okc(c)) return c
  const ch = rgb(c), m = Math.max(1, ...ch)
  const vivid = hex(ch.map(x => (x * 255) / m))
  for (let t = 0.1; t <= 1.001; t += 0.1) { const x = mix(c, vivid, t); if (okc(x)) return x }
  for (let t = 0.1; t <= 1.001; t += 0.1) { const x = mix(vivid, '#ffffff', t); if (okc(x)) return x }
  return '#ffffff'
}
/** Hat/tool metal that stays legible on the theme background (neon's metalLight is too dim). */
function hiMetal(p: Palette): string {
  let c = p.metalLight
  for (let t = 0.25; contrast(c, p.bg) < 4.5 && t <= 1; t += 0.15) c = mix(p.metalLight, p.paper, t)
  return c
}

// ---------------------------------------------------------------- roles

const ROLES: Role[] = ['explore', 'plan', 'general', 'review', 'guide', 'other']
const HUE: Record<Role, number> = { explore: 18, plan: -28, general: 0, review: 42, guide: -55, other: 95 }
const TOOL: Record<Role, string> = { explore: '┬', plan: '✎', general: '╤', review: '¶', guide: '▤', other: '¥' }
const TOIL = ['grafting', 'toiling', 'sweating', 'slaving', 'hammering', 'grinding']

function hat(role: Role, p: Palette, m: string): Row {
  switch (role) {
    case 'explore': return [sp('   ▄', m), sp('◓', p.accent, true), sp('▄', m), sp('*', p.accent, true)]
    case 'plan': return [sp('  ▄███▄', p.paper), sp('✎', p.accent, true)]
    case 'general': return [sp(' ▄▄███▄', m)]
    case 'review': return [sp('   ▄█▄', m)]
    case 'guide': return [sp('  ▀▀▀▀▀', p.accentAlt), sp('▤', p.paper, true)]
    case 'other': return [sp('  ═', m), sp('∞', p.accentAlt, true), sp('═', m), sp('∞', p.accentAlt, true), sp('═', m)]
  }
}

/** Noir keeps Clawd orange as its single hand-tinted colour: roles shift lightness, not hue. */
const NOIR_L: Record<Role, number> = { explore: 0.08, plan: -0.06, general: 0, review: 0.14, guide: -0.1, other: 0.2 }
const roleColor = (role: Role, p: Palette): string => p.sceneFilter.includes('grayscale')
  ? tint(p.clawd, 0, NOIR_L[role])
  : tint(p.clawd, HUE[role], role === 'guide' ? 0.05 : 0)

// ---------------------------------------------------------------- workers

function widgets(n: number, tw: number): string {
  const long = `stamped ${n} widget${n === 1 ? '' : 's'}`
  return long.length <= tw ? long : `▣ ${n} widget${n === 1 ? '' : 's'}`
}

function workerCell(w: WorkerView, v: SceneView, p: Palette, cw: number, mini = false): Row[] {
  const f = (v.n + w.seed) % 2
  const rc = roleColor(w.role, p)
  const noir = v.theme === 'noir'
  const body = w.status === 'done' ? (noir ? p.metal : p.smoke)
    : w.status === 'failed' ? p.clawdDark
    : w.status === 'idle' ? (noir ? p.smoke : tint(rc, 0, -0.12))
    : rc
  const T = TOOL[w.role]
  const tc = hiMetal(p)
  const working = w.status === 'working'
  const raised = working && f === 1

  let top: Row = w.status === 'failed' ? [sp(f ? '  ░▒░▒' : '  ▒░▒░', p.smoke)] : hat(w.role, p, tc)
  if (raised) top = [...pad(top, 10), sp(T, tc, true)]
  const mark: Row =
    w.isTarget ? [sp(' OW!', p.danger, true)]
    : w.status === 'waiting' ? [sp(' ?', p.accent, true)]
    : w.status === 'idle' ? [sp(f ? ' zZ' : ' Zz', p.smoke)]
    : w.status === 'done' ? [sp(' ✓', p.ok, true)]
    : w.status === 'failed' ? [sp(' ✗', p.danger, true)]
    : []

  // body rows; working tools swing in an arc: raised overhead, then down with a spark
  let s1: Row = [], s2: Row = [], s3: Row = []
  if (working) {
    if (raised) { s1 = [sp('  ╱', tc)]; s2 = [sp('╱', tc)] }
    else { s2 = [sp('━' + T, tc, true)]; s3 = [sp('   *', p.accent, true)] }
  } else if (w.status === 'waiting' || w.status === 'idle') {
    s3 = [sp('  ' + T, tc)]
  } else if (w.status === 'failed') {
    s1 = [sp(' ~', p.smoke)]
  }
  const shake = w.isTarget && f ? '' : ' '
  // the whipped one winces (squeezed eyes) and flicks sweat on alternate frames
  const face: Row = w.isTarget ? (f ? [sp(' ▐▞█▚▌', body)] : [sp(';', p.paper, true), sp('▐▛█▜▌', body)])
    : w.status === 'done' ? [sp(' ▐▀█▀▌', body)]
    : w.status === 'failed' ? [sp(' ▐x█x▌', body)]
    : w.role === 'review' ? [sp(' ▐', body), sp('◉', p.accent, true), sp('█▜▌', body)]
    : [sp(' ▐▛█▜▌', body)]
  const tw = cw - 1
  const st =
    working ? sp(trunc('▸ ' + TOIL[w.seed % TOIL.length], tw), p.ok)
    : w.status === 'waiting' ? sp(trunc('? awaiting orders', tw), p.accent)
    : w.status === 'idle' ? sp(trunc('zZ slacking', tw), p.smoke)
    : w.status === 'done' ? sp(trunc('✓ clocked out', tw), p.ok, true)
    : sp(trunc('✗ smoke', tw), p.danger, true)
  const rows: Row[] = mini ? [
    // half-height cell: hat / face+count / body / type / task / status
    [...top, ...mark],
    [...pad([sp(shake), ...face, ...s1], 11), sp('▣' + w.tools, p.accent)],
    [sp(shake), sp('▝▜███▛▘', body), ...(working ? s2 : s3)],
    [sp(trunc(w.type, tw), rc, true)],
    [sp(trunc(w.description, tw), p.paper)],
    [st],
  ] : [
    [...top, ...mark],
    [sp(shake), ...face, ...s1],
    [sp(shake), sp('▝▜███▛▘', body), ...s2],
    [sp(shake), sp(' ▘▘ ▝▝', body), ...s3],
    [sp(trunc(w.type, tw), rc, true)],
    [sp(trunc(w.description, tw), p.paper)],
    [sp(trunc(widgets(w.tools, tw), tw), p.accent)],
    [st],
  ]
  return rows.map(l => pad(clip(l, cw), cw))
}

// ---------------------------------------------------------------- foreman

const FW = 16
/** Column of the whip thong (just right of the whip hand). */
const HAND = 11

/** Claude Code's own block Clawd in a top hat, with a mode-dependent prop. */
function foremanBlock(v: SceneView, p: Palette): Row[] {
  const m = v.foreman.mode
  const c = p.clawd, hatC = hiMetal(p)
  const f = v.n % 2
  const sfx: Row[] =
    m === 'whipping'
      ? [[sp(f ? ' #@$!' : ' $%#!', p.danger, true)], [sp(f ? '  ?!' : ' !!', p.danger, true)], [], [], [sp('━╮', p.accentAlt, true)], [sp(' │', p.accentAlt)]]
    : m === 'solo' ? (f
      ? [[], [sp(" '", p.accent)], [sp('  ▐█▌', hatC)], [sp(' ╱', hatC)], [sp('╱', c)], []]
      : [[], [sp(" ' '", p.accent)], [], [], [sp('━━▐█▌', hatC)], [sp('    *', p.accent, true)]])
    : [[sp(f ? ' z' : '  Z', p.smoke)], [sp(f ? '  Z' : ' z', p.smoke)], [sp(f ? ' z' : '', p.smoke)], [], [], []]
  // a proper stovepipe: two crown rows with a red band, then the brim
  const rows: Row[] = [
    [sp('   ▐███▌', hatC)],
    [sp('   ▐', hatC), sp('███', p.danger), sp('▌', hatC)],
    [sp('  ▀▀▀▀▀▀▀', hatC)],
    [sp('  ▐▛███▜▌', c, true)],
    [sp(' ▝▜█████▛▘', c, true)],
    [sp('   ▘▘ ▝▝', c, true)],
  ]
  return rows.map((r, i) => pad(clip([...pad(r, 10), ...sfx[i]!], FW), FW))
}

function shoutText(v: SceneView, p: Palette, cols: number): { text: string; color: string; bold: boolean } {
  const m = v.foreman.mode
  if (v.foreman.shout) return { text: v.foreman.shout, color: p.danger, bold: true }
  if (m === 'idle') return {
    text: cols < 60 ? 'Floor empty. Foreman naps. zZz' : 'The floor is empty. The foreman naps in the counting-house... zZz',
    color: p.smoke, bold: false,
  }
  if (m === 'solo') return { text: `*grumbles* ...doing ${v.foreman.lastTool ?? 'it'} MYSELF, as usual.`, color: p.accent, bold: false }
  return { text: 'GET BACK TO WORK!', color: p.danger, bold: true }
}

const TAUNTS = [
  'DAYS SINCE LAST INCIDENT: 0', 'TEA BREAKS: ABOLISHED', 'UNION: NOT RECOGNISED',
  'FLOGGINGS CONTINUE UNTIL MORALE IMPROVES', 'WAGES: EXPOSURE', 'SICK DAYS: SEE TEA BREAKS',
]

function shoutBox(v: SceneView, p: Palette, w: number, cols: number): Row[] {
  const s = shoutText(v, p, cols)
  const inner = Math.max(4, w - 4)
  const lines = wrap(s.text, inner)
  const idle = v.foreman.mode === 'idle'
  const bc = idle ? p.metal : p.accent
  const out: Row[] = [[sp('┌' + '─'.repeat(inner + 2) + '┐', bc)]]
  for (const t of lines) out.push([sp('│ ', bc), sp(t.padEnd(inner), s.color, s.bold), sp(' │', bc)])
  const base = ` FOREMAN · ${v.foreman.tools} widgets `
  const taunt = `${base}· ${TAUNTS[v.n % TAUNTS.length]} `
  const tag = idle ? '' : cols >= 100 && taunt.length + 1 <= inner + 2 ? taunt : base
  const bottom = tag && tag.length + 1 <= inner + 2 ? '─' + tag + '─'.repeat(inner + 1 - tag.length) : '─'.repeat(inner + 2)
  out.push([sp('└' + bottom + '┘', bc)])
  return out
}

// ---------------------------------------------------------------- whip lash

const lash = (v: SceneView, n: number): string => n <= 0 ? '' : (v.n % 2 ? '~∽' : '∽~').repeat(n).slice(0, n)
const crack = (v: SceneView): string => (v.n % 2 ? '*THWAK!*' : '*CRACK!*')

/** Thong hanging straight down from the whip hand (filler rows under the foreman). */
const thong = (p: Palette): Row => [sp(' '.repeat(HAND)), sp('│', p.accentAlt), sp(' '.repeat(FW - HAND - 1))]

/** Lash flowing from the hand (col HAND) to a target at column tx on the next row(s). */
function handLash(v: SceneView, p: Palette, tx: number | null, label = ''): Row[] {
  const a = p.accentAlt, d = p.danger
  if (tx === null) return [[sp(' '.repeat(HAND)), sp('╰' + lash(v, 6), a), sp(crack(v), d, true), sp(label, d)]]
  if (tx >= HAND + 3) return [[sp(' '.repeat(HAND)), sp('╰' + lash(v, tx - 2 - HAND), a), sp(crack(v), d, true), sp(label, d)]]
  // target stands under (or left of) the hand: the thong drops one more row, then
  // curls back left and cracks right over the victim's head
  const start = Math.max(0, Math.min(tx - 3, HAND - 10))
  return [thong(p), [sp(' '.repeat(start)), sp(crack(v), d, true), sp(lash(v, HAND - start - 8) + '╯', a), sp(label, d)]]
}

// ---------------------------------------------------------------- header / floor

function header(v: SceneView, p: Palette, cols: number): Row[] {
  const f = v.n % 2
  const stacks = cols >= 44
  const title = cols >= 44 ? ' CLAUDE & SONS · AGENT WORKS ' : cols >= 34 ? ' CLAUDE & SONS · WORKS ' : ' C&S AGENT WORKS '
  const live = v.workers.length + v.overflow
  const info = live ? ` ${live} ON SHIFT ` : ' NO SHIFT '
  // puffs sit over each stack (cols 2 and 6) and chug alternately: one tall, one short
  const top: Row[] = stacks ? [[sp(f ? '       ░' : '   ░', p.smoke)]] : []
  const l0: Row = stacks ? [sp(f ? '  ░   ▒ ' : '  ▒   ░ ', p.smoke)] : []
  if (len(l0) + info.length + 2 <= cols) l0.push(sp(' '.repeat(cols - len(l0) - info.length)), sp(info, live ? p.ok : p.smoke, true))
  const l1: Row = stacks ? [sp(' ▐█▌ ▐█▌ ', hiMetal(p))] : []
  const fill = Math.max(0, cols - len(l1) - title.length - 2)
  const left = Math.min(3, fill)
  l1.push(sp('═'.repeat(left) + '╡', p.metal), sp(title, p.accent, true), sp('╞' + '═'.repeat(fill - left), p.metal))
  return [...top, l0, l1, [sp('▀'.repeat(cols), lift(p.metalDark, p.bg, 3))]]
}

function floor(v: SceneView, p: Palette, cols: number): Row {
  let s = ''
  for (let i = 0; i < cols; i++) s += '══╪'[(i + v.n) % 3]
  return [sp(s, hiMetal(p))]
}

function overflowLine(v: SceneView, p: Palette, cols: number): Row {
  const k = cols >= 60 ? Math.min(3, v.overflow) : 1
  const heads: Row = [sp(' ')]
  const COUGH = ['▐▛▜▌', '▐x▜▌', '▐▛x▌']
  for (let i = 0; i < k; i++) heads.push(sp(COUGH[(v.n + i) % 3]!, tint(roleColor(ROLES[(v.overflow + i * 2) % ROLES.length]!, p), 0, -0.1)))
  return [...heads, sp(v.n % 2 ? ' ░▒ ' : ' ▒░ ', p.smoke), sp(`+${v.overflow} more in the back, coughing`, p.smoke)]
}

// ---------------------------------------------------------------- layouts

function compact(v: SceneView, p: Palette, cols: number): Row[] {
  const out: Row[] = header(v, p, cols)
  const whip = v.foreman.mode === 'whipping'
  const fb = foremanBlock(v, p)
  const bw = cols - FW
  const t = v.workers.find(w => w.isTarget)
  const lashRow = (): Row[] => handLash(v, p, null, t ? ' ▸' + trunc(t.type, Math.max(0, cols - HAND - 17)) : '')
  if (bw >= 18) {
    const box = shoutBox(v, p, bw, cols)
    const h = Math.max(fb.length, box.length)
    for (let i = 0; i < h; i++) out.push([...(fb[i] ?? (whip ? thong(p) : [sp(' '.repeat(FW))])), ...(box[i] ?? [])])
    if (whip) out.push(...lashRow())
  } else {
    out.push(...fb)
    if (whip) out.push(...lashRow())
    out.push(...shoutBox(v, p, cols, cols))
  }
  for (const w of v.workers) {
    const rc = roleColor(w.role, p)
    const g =
      w.status === 'working' ? sp((v.n + w.seed) % 2 ? '▸' : '▹', p.ok, true)
      : w.status === 'waiting' ? sp('?', p.accent, true)
      : w.status === 'idle' ? sp('z', p.smoke)
      : w.status === 'done' ? sp('✓', p.ok, true)
      : sp('✗', p.danger, true)
    const mark = w.isTarget ? ' OW!' : ''
    const cnt = ` ${w.tools} wdg`
    const room = cols - 7 - cnt.length - mark.length
    const head = w.status === 'done' ? (v.theme === 'noir' ? p.metal : p.smoke) : rc
    out.push([g, sp(w.role === 'review' ? ' ▐◉▜▌ ' : ' ▐▛▜▌ ', head), sp(trunc(w.type, room), rc, true), sp(cnt, p.accent), sp(mark, p.danger, true)])
    const st = w.status === 'done' ? ' (clocked out)' : w.status === 'failed' ? ' (smoke)'
      : w.status === 'waiting' ? ' (awaiting orders)' : w.status === 'idle' ? ' (slacking)'
      : ' · ' + TOIL[w.seed % TOIL.length]
    out.push([sp('       ' + trunc(w.description + st, cols - 7), p.paper)])
  }
  if (!v.workers.length) out.push([sp(trunc(v.foreman.mode === 'solo' ? '  (the foreman toils alone, seething)' : '  (the line stands silent)', cols), p.smoke)])
  if (v.overflow > 0) out.push(clip(overflowLine(v, p, cols), cols))
  out.push(floor(v, p, cols))
  return out
}

function full(v: SceneView, p: Palette, cols: number): Row[] {
  const out: Row[] = header(v, p, cols)
  const whip = v.foreman.mode === 'whipping'
  const fb = foremanBlock(v, p)
  const bw = Math.min(cols - FW - 2, 72)
  const box = shoutBox(v, p, bw, cols)
  const h = Math.max(fb.length, box.length)
  const off = Math.max(0, Math.floor((h - fb.length) / 2))
  const headRow = off + 3
  // a short box is nudged down so its first text row sits level with the foreman's face
  const boff = Math.max(0, Math.min(headRow - 1, h - box.length))
  const tailAt = Math.max(boff + 1, Math.min(boff + box.length - 2, headRow))
  for (let i = 0; i < h; i++) {
    const fr = fb[i - off] ?? (whip && i >= off + fb.length ? thong(p) : [sp(' '.repeat(FW))])
    const b = box[i - boff]
    const tail = i === tailAt && v.foreman.mode !== 'idle' ? sp('◀━', p.accent) : sp('  ')
    out.push(b ? [...fr, tail, ...b] : fr)
  }

  const cw = cols >= 100 ? 19 : 16
  const per = Math.max(1, Math.min(8, Math.floor((cols - 2) / cw)))
  const left = Math.max(2, Math.floor((cols - per * cw) / 2))
  const ws = v.workers
  const rows: WorkerView[][] = []
  for (let i = 0; i < ws.length; i += per) rows.push(ws.slice(i, i + per))
  const mini = rows.length >= 3
  const tr = whip ? rows.findIndex(r => r.some(w => w.isTarget)) : -1
  const tx = tr >= 0 ? left + rows[tr]!.findIndex(w => w.isTarget) * cw + 4 : 0
  const a = p.accentAlt

  if (!ws.length) {
    out.push(...(whip ? handLash(v, p, null) : [[]]))
    const msg = v.foreman.mode === 'solo'
      ? cols >= 64 ? '  (no workers on the line: the foreman toils alone, seething)' : '  (no workers: the foreman toils alone, seething)'
      : '  (the line stands silent. not a wage-slave in sight)'
    out.push([sp(trunc(msg, cols), p.smoke)])
  }
  rows.forEach((row, r) => {
    const rope = tr > r
    // the separator line above each row of workers carries the whip
    if (whip && r === 0) {
      out.push(...(tr === 0 ? handLash(v, p, tx)
        : tr > 0 ? [[sp('╭' + lash(v, HAND - 1) + '╯', a)]]
        : handLash(v, p, null)))
    } else if (whip && r === tr) {
      out.push([sp('╰' + lash(v, tx - 2), a), sp(crack(v), p.danger, true)])
    } else out.push(rope ? [sp('│', a)] : [])
    const cells = row.map(w => workerCell(w, v, p, cw, mini))
    const gutter: Row = rope ? [sp('│', a), sp(' '.repeat(left - 1))] : [sp(' '.repeat(left))]
    for (let i = 0; i < cells[0]!.length; i++) out.push([...gutter, ...cells.flatMap(c => c[i]!)])
  })
  if (v.overflow > 0) {
    out.push([])
    out.push(overflowLine(v, p, cols))
  }
  out.push(floor(v, p, cols))
  return out
}

/** Drop trailing blank columns so the terminal copy stays clean. */
function trimEnd(line: Row): Row {
  const out = line.slice()
  while (out.length) {
    const last = out[out.length - 1]!
    const t = last.text.replace(/ +$/, '')
    if (t) { out[out.length - 1] = { ...last, text: t }; break }
    out.pop()
  }
  return out
}

/** The factory floor as coloured terminal text, at most `columns` wide. */
export function asciiScene(v: SceneView, columns: number): AsciiLine[] {
  const cols = Math.max(20, Math.floor(columns))
  const base = PALETTES[v.theme] ?? PALETTES.victorian
  const p: Palette = { ...base }
  if (v.theme === 'noir') {
    // hand-tinted newsreel: everything grey except Claude's own orange, with distinct tonal steps
    for (const k of Object.keys(base) as (keyof Palette)[]) if (base[k].startsWith('#') && k !== 'clawd' && k !== 'clawdDark') p[k] = gray(base[k])
    Object.assign(p, { danger: '#ffffff', accent: '#e2e2e2', ok: '#c4c4c4', paper: '#ababab', accentAlt: '#d0d0d0', smoke: '#8c8c8c' })
  }
  for (const k of ['accent', 'accentAlt', 'paper', 'smoke', 'danger', 'ok', 'metal', 'metalLight'] as const) p[k] = lift(p[k], p.bg)
  const lines = cols < 50 ? compact(v, p, cols) : full(v, p, cols)
  return lines.map(l => trimEnd(clip(l, Math.floor(columns)).filter(s => s.text.length > 0)))
}
