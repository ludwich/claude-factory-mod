import type { Palette, Role, SceneView, WorkerStatus, WorkerView } from './types.ts'
import { MAX_SLOTS, SCENE_H, SCENE_W } from './types.ts'
import { PALETTES } from './palette.ts'
import { backdrop, foreground } from './scene.ts'
import { foreman, shoutBubble } from './foreman.ts'
import { ROLE_ART } from './roles/index.ts'
import { esc } from './clawd.ts'

/** Which costume a subagent type wears. */
export function roleOf(type: string): Role {
  const t = type.toLowerCase()
  if (t.includes('explore') || t.includes('search') || t.includes('research')) return 'explore'
  if (t.includes('plan') || t.includes('architect') || t.includes('design')) return 'plan'
  if (t.includes('review') || t.includes('verif') || t.includes('audit') || t.includes('test')) return 'review'
  if (t.includes('guide') || t.includes('doc') || t.includes('help')) return 'guide'
  if (t.includes('general') || t === 'claude' || t.includes('fork') || t === 'worker') return 'general'
  return 'other'
}

/** The engine's AgentStatus folded to what the art draws. */
export function statusOf(s: string): WorkerStatus {
  if (s === 'running' || s === 'pending') return 'working'
  if (s === 'waiting') return 'waiting'
  if (s === 'idle') return 'idle'
  if (s === 'completed') return 'done'
  return 'failed'
}

/** Stable small number from an id. */
export function seedOf(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return h
}

/** Slot positions: two rows of four along the floor, right of the foreman.
 * Back row sits higher (and is drawn at 0.92 scale); front row is offset
 * right so heads sit between the back row's plates. */
export function slot(i: number): { x: number; y: number } {
  const row = Math.floor(i / 4)
  const col = i % 4
  return { x: 340 + col * 160 + (row ? 30 : 0), y: row ? 488 : 376 }
}

export const FOREMAN_POS = { x: 120, y: 330 }

const BACK_SCALE = 0.92

/** Assigns slots; keeps the target in view. Exactly one worker may be the target. */
export function layout(v: Omit<SceneView, 'width' | 'height'>): SceneView {
  const shown = v.workers.slice(0, MAX_SLOTS)
  const ti = shown.findIndex(w => w.isTarget)
  // a small crew stands in one row mid-floor; a full house splits into back and front rows
  const place = (i: number) => shown.length <= 4 ? { x: slot(i).x + 16, y: 440 } : slot(i)
  const workers: WorkerView[] = shown.map((w, i) => ({ ...w, ...place(i), isTarget: i === ti }))
  const overflow = v.overflow + Math.max(0, v.workers.length - MAX_SLOTS)
  const target = ti >= 0 ? workers[ti] : undefined
  return {
    ...v,
    width: SCENE_W,
    height: SCENE_H,
    workers,
    overflow,
    foreman: {
      ...v.foreman,
      ...FOREMAN_POS,
      targetX: target?.x,
      targetY: target?.y,
    },
  }
}

const STATUS_TAG: Record<WorkerStatus, string> = {
  working: 'ON THE LINE', waiting: 'WAITING', idle: 'IDLE', done: 'CLOCKED OUT', failed: 'BROKEN',
}

/** Short trade names for the bold line of a nameplate. */
const TRADE: Record<string, string> = {
  'general-purpose': 'HAND', 'claude-code-guide': 'GUIDE', 'statusline-setup': 'STATUSLINE',
  'code-reviewer': 'REVIEWER', 'output-style-setup': 'STYLIST', explore: 'EXPLORE', plan: 'PLAN',
}

export function tradeOf(type: string): string {
  const t = type.toLowerCase().replace(/^claude-code-/, '')
  if (TRADE[type.toLowerCase()]) return TRADE[type.toLowerCase()]!
  if (TRADE[t]) return TRADE[t]
  return cut(t.split(/[-_ :]/).filter(Boolean)[0]?.toUpperCase() || 'HAND', 10)
}

function cut(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

const MONO = `'Courier New',monospace`
// 7px pixel cog, drawn at (0,0) top-left
const COG = 'M2 0h3v1h1v1h1v3h-1v1h-1v1h-3v-1h-1v-1h-1v-3h1v-1h1zM3 2v3h1v-3z'

/** Shared type styles for every nameplate (emitted once per scene). */
function plateStyle(p: Palette): string {
  return `<style>.np text{font:bold 8px ${MONO};fill:${p.paper}}.np .t{font:bold 11px Georgia,serif;letter-spacing:.6px;fill:${p.paper}}` +
    `.np .d{font-size:9px;font-weight:normal;opacity:.85}.np .e{text-anchor:end}.np .k{font-size:9px;opacity:.8}</style>`
}

/** Brass nameplate under each worker: trade, status, task, widgets. */
export function nameplate(w: WorkerView, p: Palette): string {
  const color = w.status === 'done' ? p.ok : w.status === 'working' ? p.accent : p.smoke
  const tag = STATUS_TAG[w.status]
  const status = w.status === 'failed'
    ? `<rect x="${62 - tag.length * 5}" y="3" width="${tag.length * 5 + 7}" height="10" fill="${p.danger}"/><text x="66" y="11" class="e">${tag}</text>`
    : `<text x="68" y="11" class="e" style="fill:${color}">${tag}</text>`
  const stroke = w.isTarget
    ? `<rect x="-75" y="1" width="150" height="24" fill="none" stroke="${p.danger}" stroke-width="2">` +
      `<animate attributeName="opacity" values="1;.35;1" dur=".6s" repeatCount="indefinite"/></rect>`
    : `<rect x="-75.5" y=".5" width="151" height="25" fill="none" stroke="${p.metal}"/>`
  const n = String(w.tools)
  return (
    `<g transform="translate(${w.x},${w.y + 4})" class="np">` +
    `<rect x="-77" y="-1" width="156" height="30" fill="${p.ink}" opacity=".55"/>` +
    `<rect x="-76" width="152" height="26" fill="${p.metalDark}"/>` +
    `<rect x="-76" width="152" height="2" fill="${p.metalLight}" opacity=".6"/>` +
    stroke +
    `<text x="-69" y="12" class="t"${w.isTarget ? ` style="fill:${p.accent}"` : ''}>${esc(tradeOf(w.type))}</text>` +
    status +
    `<text x="-69" y="22" class="d">${esc(cut(w.description, 19))}</text>` +
    `<text x="68" y="22" class="e k">${n}</text>` +
    `<path transform="translate(${60 - n.length * 5.4},16)" d="${COG}" fill="${p.accent}" fill-rule="evenodd"/>` +
    `</g>`
  )
}

const RECT = /^<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"((?:(?! r[xy]=)[^>])*)\/>$/

/** Shave bytes inside tags only: float noise, leading zeros, inherited
 * crispEdges, and childless plain rects rewritten as (shorter) paths. */
function tighten(svg: string): string {
  return svg.replace(/<[^>]+>/g, t => t
    .replace(/\d+\.\d{3,}/g, m => String(Math.round(+m * 100) / 100))
    .replace(/([";, (-])0\.(\d)/g, '$1.$2')
    .replace(/ shape-rendering="crispEdges"/g, '')
    .replace(RECT, (_, x, y, w, h, rest) => `<path d="M${x} ${y}h${w}v${h}h-${w}z"${rest}/>`))
}

/** One worker: contact shadow + costume, back row shrunk about its feet. */
function worker(w: WorkerView, p: Palette): string {
  const art = `<rect x="${w.x - 40}" y="${w.y - 3}" width="80" height="6" fill="#000" opacity=".35"/>` + ROLE_ART[w.role](w, p)
  return w.y < 420 ? `<g transform="translate(${w.x},${w.y}) scale(${BACK_SCALE}) translate(${-w.x},${-w.y})">${art}</g>` : art
}

/** The whole factory as one SVG document. */
export function renderScene(v: SceneView): string {
  const p = PALETTES[v.theme]
  // back row first so the front row overlaps it; plates are UI, drawn over everything but the bubble
  const order = [...v.workers].sort((a, b) => a.y - b.y)
  const crew = order.map(w => worker(w, p)).join('')
  const plates = (order.length ? plateStyle(p) : '') + order.map(w => nameplate(w, p)).join('')
  const more = v.overflow > 0
    ? `<g transform="translate(${SCENE_W - 108},232)" shape-rendering="crispEdges"><rect x="-1" y="-1" width="98" height="32" fill="${p.ink}"/><rect width="96" height="30" fill="${p.metalDark}" stroke="${p.accent}"/>` +
      `<text x="48" y="13" text-anchor="middle" font-family="${MONO}" font-size="11" font-weight="bold" fill="${p.accent}">+${v.overflow} MORE</text>` +
      `<text x="48" y="24" text-anchor="middle" font-family="${MONO}" font-size="8" fill="${p.paper}">IN THE BACK</text></g>`
    : ''
  // noir hand-tints: only the hall goes grey, the Clawds keep their orange
  const sinCity = p.sceneFilter.includes('grayscale')
  const f = p.sceneFilter ? ` style="filter:${p.sceneFilter}"` : ''
  const hall = (s: string) => sinCity ? `<g${f}>${s}</g>` : s
  const body =
    hall(backdrop(p, v)) +
    crew +
    foreman(v.foreman, p) +
    hall(foreground(p, v)) +
    plates +
    shoutBubble(v.foreman.shout, v.foreman.x, v.foreman.y - 80, p) +
    more
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W}" height="${SCENE_H}" shape-rendering="crispEdges">` +
    `<title>${esc('Claude & Sons Agent Works')}</title>` +
    tighten(sinCity ? body : `<g${f}>${body}</g>`) +
    `</svg>`
  )
}
