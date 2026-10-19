import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'agent-factory',
  props: { title: 'Agent Factory', isFocused: false, bodyColumns: 100, placement: 'dock' },
} as const

test('a hired subagent shows up on the floor, gets screamed at, then clocks out', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  mock.store(on)
  let status = 'running'
  on('agent.list', async () => ({
    value: [{ id: 'ag1', description: 'find auth middleware', type: 'Explore', status }],
  }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('tool.call', { tool: 'Agent' }, async () => ({ result: { status: 'completed' } }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/w', surface: 'desktop', isInteractive: true })

  await $.tool.call({
    tool: 'Agent',
    description: 'find auth middleware',
    prompt: 'look around',
    subagent_type: 'Explore',
  } as never)
  await clock.advance(400)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'agent-factory', surface, ...PANE })
    expect(await ui.find({ text: /find auth/ })).toBeDefined()
    await ui.unmount()
  }

  // The foreman's timer picks the only worker and screams at it.
  await clock.advance(5_000)
  const desk = await $.ui.mount({ plugin: 'agent-factory', surface: 'desktop', ...PANE })
  const svg = await desk.find({ type: 'Svg' })
  expect(String(svg?.props.alt)).toMatch(/screams "/)
  expect(await desk.find({ text: /WORKING/ })).toBeDefined()
  await desk.unmount()

  // Clocking out, then leaving the floor after the linger.
  status = 'completed'
  await clock.advance(2_000)
  const done = await $.ui.mount({ plugin: 'agent-factory', surface: 'desktop', ...PANE })
  expect(await done.find({ text: /DONE/ })).toBeDefined()
  await done.unmount()
  await clock.advance(40_000)
  const empty = await $.ui.mount({ plugin: 'agent-factory', surface: 'desktop', ...PANE })
  expect(await empty.find({ text: /Nobody on the line/ })).toBeDefined()
  await empty.unmount()
})

test('theme buttons switch and persist the theme', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('agent.list', async () => ({ value: [] }) as never)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'agent-factory', surface, ...PANE })
    await ui.press({ key: 'theme-neon' })
    expect((await ui.find({ key: 'theme-neon' }))?.props.variant).toBe('primary')
    await ui.press({ key: 'theme-victorian' })
    await ui.unmount()
  }
})
