// Shared contract for every art module. Pure data + string-building only:
// no DOM, no Node. Every art function returns an SVG fragment string.

export type Theme = 'victorian' | 'noir' | 'neon'

export type Role = 'explore' | 'plan' | 'general' | 'review' | 'guide' | 'other'

export type WorkerStatus = 'working' | 'waiting' | 'idle' | 'done' | 'failed'

export type Palette = {
  /** wall / sky behind everything */
  bg: string
  bgDeep: string
  /** factory floor */
  floor: string
  floorLine: string
  /** machinery */
  metal: string
  metalDark: string
  metalLight: string
  /** brass / neon highlight */
  accent: string
  accentAlt: string
  /** text on signs, bubbles */
  ink: string
  paper: string
  smoke: string
  danger: string
  ok: string
  /** Claude's own orange and its shade; role tints shift from these */
  clawd: string
  clawdDark: string
  /** CSS filter or '' applied to the whole scene (sepia / grayscale / glow) */
  sceneFilter: string
}

export type WorkerView = {
  id: string
  role: Role
  /** subagent type as the engine names it, e.g. "Explore" */
  type: string
  /** the task, a few words */
  description: string
  status: WorkerStatus
  /** tool calls so far: "widgets produced" */
  tools: number
  lastTool?: string
  /** the foreman's whip / shout is aimed at this one right now */
  isTarget: boolean
  /** stable per-worker number for variety (0..999) */
  seed: number
  /** slot position: feet-centre of the character, assigned by compose */
  x: number
  y: number
}

export type ForemanMode = 'whipping' | 'solo' | 'idle'

export type ForemanView = {
  mode: ForemanMode
  tools: number
  lastTool?: string
  /** the line being screamed now ('' for none) */
  shout: string
  /** feet-centre position, assigned by compose */
  x: number
  y: number
  /** feet-centre of the worker being whipped, when mode is whipping */
  targetX?: number
  targetY?: number
}

export type SceneView = {
  theme: Theme
  width: number
  height: number
  foreman: ForemanView
  /** at most MAX_SLOTS drawn; overflow counts the rest */
  workers: WorkerView[]
  overflow: number
  /** increments on every shout: use for deterministic variety */
  n: number
}

export const SCENE_W = 960
export const SCENE_H = 540
export const MAX_SLOTS = 8

/** One span of terminal text. */
export type AsciiSpan = { text: string; color?: string; bold?: boolean }
export type AsciiLine = AsciiSpan[]

/** Seconds per whip cycle. The CRACK lands at 0.6 of the cycle; every
 * whip-synced animation starts at -WHIP_PHASE so a still frame shows the hit. */
export const WHIP_CYCLE = 1.2
export const WHIP_PHASE = 0.6
