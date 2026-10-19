import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { FactoryForeman, FactoryShout, FactoryTheme, FactoryWorker } from '../types'
import { layout, renderScene, roleOf, seedOf, statusOf } from './art/compose.ts'
import { asciiScene } from './ascii.ts'
import { doneShout, failShout, pickShout, soloShout } from './shouts.ts'
import type { SceneView } from './art/types.ts'

const PLUGIN = 'agent-factory'
const PANE = 'agent-factory'
const TITLE = 'Agent Factory'
const STORE_THEME = 'agent-factory.theme'
const STORE_LOUD = 'agent-factory.isLoud'

/** How long a finished worker stays on the floor before clocking out. */
const LINGER_MS = 30_000
const POLL_MS = 1_500
const SHOUT_MS = 4_000
const SOLO_SHOUT_MS = 9_000

const workers = atom({ plugin: 'agent-factory', key: 'workers' } as const, [] as FactoryWorker[])
const foreman = atom({ plugin: 'agent-factory', key: 'foreman' } as const, { isBusy: false, tools: 0 } as FactoryForeman)
const shout = atom({ plugin: 'agent-factory', key: 'shout' } as const, { text: '', n: 0 } as FactoryShout)
const theme = atom({ plugin: 'agent-factory', key: 'theme' } as const, 'victorian' as FactoryTheme)
const isLoud = atom({ plugin: 'agent-factory', key: 'isLoud' } as const, false)

const THEMES: { id: FactoryTheme; label: string }[] = [
  { id: 'victorian', label: 'Victorian mill' },
  { id: 'noir', label: 'Silent film' },
  { id: 'neon', label: 'Neon sweatshop' },
]

// Tool calls counted between polls, so a burst of calls is one redraw.
const counts = new Map<string, { n: number; last?: string }>()
let mainCount = { n: 0, last: undefined as string | undefined }
let lastShoutAt = 0
// Workers that already clocked out and left the floor: the engine keeps
// listing them, the floor does not.
const retired = new Set<string>()

function isActive(w: FactoryWorker): boolean {
  const s = statusOf(w.status)
  return s === 'working' || s === 'waiting'
}

async function holler($: EngineInterface, text: string, targetId?: string) {
  const now = await $.clock.now()
  lastShoutAt = now
  await update($, shout, s => ({ text, targetId, n: (s?.n ?? 0) + 1 }))
  if (await read($, isLoud)) {
    $.audio.speak(text).catch(() => undefined)
  }
}

/** Merge the engine's agent list with what the floor already shows. */
async function poll($: EngineInterface) {
  let list: AgentInfo[]
  try {
    list = await $.agent.list()
  } catch {
    return
  }
  const now = await $.clock.now()
  const before = await read($, workers)
  const byId = new Map(before.map(w => [w.id, w]))
  const next: FactoryWorker[] = []
  const events: { kind: 'done' | 'fail'; w: FactoryWorker }[] = []

  for (const a of list) {
    if (a.teammateId || retired.has(a.id)) continue
    const old = byId.get(a.id)
    const c = counts.get(a.id)
    const status = a.status
    const wasActive = old ? isActive(old) : true
    const ended = statusOf(status) === 'done' || statusOf(status) === 'failed'
    const w: FactoryWorker = {
      id: a.id,
      type: a.type,
      description: a.description || old?.description || a.type,
      status,
      tools: (old?.tools ?? 0) + (c?.n ?? 0),
      lastTool: c?.last ?? old?.lastTool,
      endedAt: ended ? (old?.endedAt ?? now) : undefined,
    }
    if (ended && wasActive && old) events.push({ kind: statusOf(status) === 'done' ? 'done' : 'fail', w })
    if (w.endedAt !== undefined && now - w.endedAt > LINGER_MS) {
      retired.add(w.id)
      continue
    }
    next.push(w)
  }
  counts.clear()

  const changed = JSON.stringify(next) !== JSON.stringify(before)
  if (changed) await update($, workers, () => next)

  if (mainCount.n > 0) {
    const add = mainCount
    mainCount = { n: 0, last: undefined }
    await update($, foreman, f => ({ ...f, tools: f.tools + add.n, lastTool: add.last ?? f.lastTool }))
  }

  const s = await read($, shout)
  for (const ev of events) {
    const input = { role: roleOf(ev.w.type), task: ev.w.description, type: ev.w.type, n: s.n }
    await holler($, ev.kind === 'done' ? doneShout(input) : failShout(input), ev.w.id)
  }
}

/** Every few seconds: scream at somebody. */
async function tick($: EngineInterface) {
  const now = await $.clock.now()
  const crew = (await read($, workers)).filter(isActive)
  const s = await read($, shout)
  if (crew.length > 0) {
    if (now - lastShoutAt < SHOUT_MS - 100) return
    const w = crew[s.n % crew.length]!
    await holler($, pickShout({ role: roleOf(w.type), task: w.description, type: w.type, tools: w.tools, n: s.n }), w.id)
    return
  }
  const f = await read($, foreman)
  if (f.isBusy) {
    if (now - lastShoutAt < SOLO_SHOUT_MS) return
    await holler($, soloShout(s.n, f.lastTool))
  } else if (s.text) {
    await update($, shout, x => ({ ...x, text: '', targetId: undefined }))
  }
}

async function openPane($: EngineInterface) {
  await $.ui.open({ id: PANE, title: TITLE })
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const storedTheme = await $.store.get(STORE_THEME)
    if (storedTheme === 'victorian' || storedTheme === 'noir' || storedTheme === 'neon') {
      await update($, theme, () => storedTheme)
    }
    if ((await $.store.get(STORE_LOUD)) === true) await update($, isLoud, () => true)

    await $.command.register({
      name: 'factory',
      description: 'Open the Agent Factory floor: Claude the foreman and the subagents on the line',
    })
    $.clock.every(POLL_MS, () => void poll($))
    $.clock.every(1_000, () => void tick($))
    void openPane($)

    return next(e)
  })

  on('command.run', { command: 'factory' }, async $ => {
    await openPane($)
    return { text: 'The factory floor is open. Back to work, all of you.' }
  })

  on('turn.start', async ($, e, next) => {
    await update($, foreman, f => ({ ...f, isBusy: true }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, foreman, f => ({ ...f, isBusy: false }))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    if (e.agentId) {
      const c = counts.get(e.agentId) ?? { n: 0 }
      counts.set(e.agentId, { n: c.n + 1, last: tool })
    } else {
      mainCount = { n: mainCount.n + 1, last: tool }
    }
    if (tool === 'Agent' && !e.agentId) {
      // A new hire: open the floor and look at the roster now, not in 1.5s.
      void openPane($)
      $.clock.after(300, () => void poll($))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const [ws, f, s, t, loud] = await Promise.all([
      read($, workers), read($, foreman), read($, shout), read($, theme), read($, isLoud),
    ])
    const active = ws.filter(isActive)
    const view: SceneView = layout({
      theme: t,
      n: s.n,
      overflow: 0,
      foreman: {
        mode: active.length > 0 ? 'whipping' : f.isBusy ? 'solo' : 'idle',
        shout: s.text,
        tools: f.tools,
        lastTool: f.lastTool,
        x: 0,
        y: 0,
      },
      workers: ws.map(w => ({
        id: w.id,
        role: roleOf(w.type),
        type: w.type,
        description: w.description,
        status: statusOf(w.status),
        tools: w.tools,
        lastTool: w.lastTool,
        isTarget: w.id === s.targetId,
        seed: seedOf(w.id),
        x: 0,
        y: 0,
      })),
    })

    const setTheme = (id: FactoryTheme) => async () => {
      await update($, theme, () => id)
      await $.store.set(STORE_THEME, id)
    }
    const toggleLoud = async () => {
      const v = !(await read($, isLoud))
      await update($, isLoud, () => v)
      await $.store.set(STORE_LOUD, v)
      $.ui.toast(v ? 'Megaphone ON. The foreman will now scream out loud.' : 'Megaphone off. Silent fury only.')
    }

    const roster = ws.length === 0
      ? 'Nobody on the line. The foreman paces.'
      : `${active.length} on the line, ${ws.length - active.length} clocked out · foreman ${f.tools} tool calls`

    if (e.surface === 'terminal') {
      const { Box, Text, Button } = $.ui.resolve(e)
      const cols = Math.max(30, e.props.bodyColumns ?? e.viewport?.columns ?? 80)
      const lines = asciiScene(view, cols)
      return (
        <Box flexDirection="column">
          {lines.map(line => (
            <Text>
              {line.map(span => (
                <Text color={span.color} bold={span.bold}>{span.text}</Text>
              ))}
            </Text>
          ))}
          <Box>
            {THEMES.map((th, i) => (
              <Button key={`theme-${th.id}`} hotkey={String(i + 1)} variant={t === th.id ? 'primary' : undefined} label={th.label} onPress={setTheme(th.id)} />
            ))}
            <Button key="loud" hotkey="m" label={loud ? 'Megaphone: ON' : 'Megaphone: off'} onPress={toggleLoud} />
          </Box>
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Svg
          source={renderScene(view)}
          isInteractive
          alt={`Agent Factory: Claude the foreman (${view.foreman.mode}) ${s.text ? `screams "${s.text}" ` : ''}at ${active.length} subagent workers.`}
        />
        <Box>
          {THEMES.map(th => (
            <Button key={`theme-${th.id}`} variant={t === th.id ? 'primary' : undefined} label={th.label} onPress={setTheme(th.id)} />
          ))}
          <Button key="loud" label={loud ? '📢 Megaphone: ON' : '📢 Megaphone: off'} onPress={toggleLoud} />
        </Box>
        <Text dimColor>{roster}</Text>
        {ws.map(w => (
          <Text>
            <Text bold>{w.type}</Text> · {w.description} · {w.tools} widgets · {statusOf(w.status).toUpperCase()}
          </Text>
        ))}
      </Box>
    )
  })
}
