export type FactoryTheme = 'victorian' | 'noir' | 'neon'

export type FactoryWorker = {
  id: string
  type: string
  description: string
  status: string
  tools: number
  lastTool?: string
  endedAt?: number
}

export type FactoryForeman = { isBusy: boolean; tools: number; lastTool?: string }

export type FactoryShout = { text: string; targetId?: string; n: number }

declare module 'claude-code' {
  interface PluginState {
    'agent-factory': {
      workers: FactoryWorker[]
      foreman: FactoryForeman
      shout: FactoryShout
      theme: FactoryTheme
      isLoud: boolean
    }
  }
}
