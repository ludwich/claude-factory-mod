// Fixed scenes for previews and judging. Not loaded by the engine.
import type { SceneView, Theme, WorkerView } from '../hooks/art/types.ts'
import { layout, roleOf, seedOf } from '../hooks/art/compose.ts'

type W = Omit<WorkerView, 'x' | 'y' | 'role' | 'seed'>
const w = (id: string, type: string, description: string, status: W['status'], tools: number, isTarget = false): W =>
  ({ id, type, description, status, tools, isTarget, lastTool: 'Grep' })

function scene(theme: Theme, n: number, mode: SceneView['foreman']['mode'], shout: string, ws: W[], overflow = 0): SceneView {
  return layout({
    theme, n, overflow,
    foreman: { mode, shout, tools: 42, lastTool: 'Edit', x: 0, y: 0 },
    workers: ws.map(x => ({ ...x, role: roleOf(x.type), seed: seedOf(x.id), x: 0, y: 0 })),
  })
}

export const SCENARIOS: Record<string, (t: Theme) => SceneView> = {
  idle: t => scene(t, 0, 'idle', '', []),
  solo: t => scene(t, 3, 'solo', 'FINE! I will Edit it MYSELF, you useless lot!', []),
  crew: t => scene(t, 7, 'whipping', 'EXPLORE FASTER, you lamp-headed grub! The auth code will not find ITSELF!', [
    w('a1', 'Explore', 'find auth middleware', 'working', 14, true),
    w('a2', 'Plan', 'design cache layer', 'working', 3),
    w('a3', 'general-purpose', 'migrate config', 'working', 22),
  ]),
  full: t => scene(t, 11, 'whipping', 'Is THAT a review? My GRANDMOTHER reviews faster, and she is a TOASTER!', [
    w('b1', 'Explore', 'map the repo', 'working', 31),
    w('b2', 'Plan', 'plan the rewrite', 'waiting', 5),
    w('b3', 'general-purpose', 'port tests', 'working', 18),
    w('b4', 'code-reviewer', 'review the diff', 'working', 9, true),
    w('b5', 'claude-code-guide', 'look up hooks docs', 'done', 12),
    w('b6', 'statusline-setup', 'tweak status line', 'failed', 4),
    w('b7', 'Explore', 'find dead code', 'working', 7),
    w('b8', 'general-purpose', 'bump deps', 'idle', 2),
    w('b9', 'Plan', 'overflow one', 'working', 1),
  ], 2),
}

export const THEMES: Theme[] = ['victorian', 'noir', 'neon']
