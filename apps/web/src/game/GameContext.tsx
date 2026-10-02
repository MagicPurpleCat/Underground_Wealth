import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BossPublicState, PlayerState } from '@pb/shared'
import {
  bossSlots,
  helpers,
  mines,
  quests,
  skillTree,
  tutorials,
  type HelperConfig,
  type MineConfig,
  type QuestTemplate,
  type SkillNode,
  type TutorialConfig,
  type BossSlotConfig,
} from '@pb/shared'
import { api } from '@/lib/api'
import { emitFx } from '@/lib/fxBus'
import { sfx } from '@/lib/sounds'

type Tab = 'mine' | 'upgrades' | 'helpers' | 'skills' | 'more'

type GameContextValue = {
  token: string | null
  player: PlayerState | null
  boss: BossPublicState | null
  tab: Tab
  setTab: (t: Tab) => void
  loading: boolean
  error: string | null
  mines: MineConfig[]
  helpers: HelperConfig[]
  skillTree: SkillNode[]
  quests: QuestTemplate[]
  tutorials: TutorialConfig[]
  bossSlots: BossSlotConfig[]
  loginDev: () => Promise<void>
  dig: () => Promise<void>
  convert: () => Promise<void>
  upgrade: (key: 'pickaxe' | 'speed' | 'capacity' | 'multiplier') => Promise<void>
  buyHelper: (id: string) => Promise<void>
  unlockSkill: (id: string) => Promise<void>
  unlockMine: (id: number) => Promise<void>
  prestige: () => Promise<void>
  claimQuest: (id: string) => Promise<void>
  hitBoss: () => Promise<void>
  refreshBoss: () => Promise<void>
  startBossDev: () => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pb_token'))
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [boss, setBoss] = useState<BossPublicState | null>(null)
  const [tab, setTab] = useState<Tab>('mine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wrap = useCallback(async (fn: () => Promise<void>) => {
    try {
      setError(null)
      await fn()
    } catch (e) {
      sfx.play('error')
      setError(String((e as Error).message))
    }
  }, [])

  const changeTab = useCallback((t: Tab) => {
    sfx.play('ui')
    setTab(t)
  }, [])

  const refreshBoss = useCallback(async () => {
    if (!token) return
    const b = await api.boss(token)
    setBoss(b)
  }, [token])

  useEffect(() => {
    ;(async () => {
      try {
        if (!token) {
          setLoading(false)
          return
        }
        const { player: p } = await api.me(token)
        setPlayer(p)
        await refreshBoss()
      } catch {
        localStorage.removeItem('pb_token')
        setToken(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [token, refreshBoss])

  useEffect(() => {
    if (!token) return
    const iv = setInterval(() => {
      refreshBoss().catch(() => undefined)
    }, 5000)
    return () => clearInterval(iv)
  }, [token, refreshBoss])

  const value = useMemo<GameContextValue>(
    () => ({
      token,
      player,
      boss,
      tab,
      setTab: changeTab,
      loading,
      error,
      mines,
      helpers,
      skillTree,
      quests,
      tutorials,
      bossSlots,
      loginDev: () =>
        wrap(async () => {
          sfx.play('ui')
          const res = await api.authDev()
          localStorage.setItem('pb_token', res.token)
          setToken(res.token)
          setPlayer(res.player)
          setBoss(await api.boss(res.token))
        }),
      dig: () =>
        wrap(async () => {
          if (!token) return
          sfx.play('dig')
          emitFx('dig')
          const { player: p } = await api.dig(token)
          setPlayer(p)
        }),
      convert: () =>
        wrap(async () => {
          if (!token) return
          sfx.play('convert')
          emitFx('convert')
          const { state } = await api.convert(token)
          setPlayer(state)
        }),
      upgrade: (key) =>
        wrap(async () => {
          if (!token) return
          sfx.play('upgrade')
          emitFx('upgrade')
          const { player: p } = await api.upgrade(token, key)
          setPlayer(p)
        }),
      buyHelper: (id) =>
        wrap(async () => {
          if (!token) return
          sfx.play('upgrade')
          emitFx('upgrade')
          const { player: p } = await api.buyHelper(token, id)
          setPlayer(p)
        }),
      unlockSkill: (id) =>
        wrap(async () => {
          if (!token) return
          sfx.play('claim')
          emitFx('upgrade')
          const { player: p } = await api.unlockSkill(token, id)
          setPlayer(p)
        }),
      unlockMine: (id) =>
        wrap(async () => {
          if (!token) return
          sfx.play('claim')
          emitFx('softBump')
          const { player: p } = await api.unlockMine(token, id)
          setPlayer(p)
        }),
      prestige: () =>
        wrap(async () => {
          if (!token) return
          sfx.play('prestige')
          emitFx('softBump')
          const { player: p } = await api.prestige(token)
          setPlayer(p)
        }),
      claimQuest: (id) =>
        wrap(async () => {
          if (!token) return
          sfx.play('claim')
          emitFx('convert')
          const { player: p } = await api.claimQuest(token, id)
          setPlayer(p)
        }),
      hitBoss: () =>
        wrap(async () => {
          if (!token) return
          sfx.play('hit')
          emitFx('hit')
          const { boss: b } = await api.hitBoss(token)
          setBoss(b)
        }),
      refreshBoss,
      startBossDev: () =>
        wrap(async () => {
          if (!token) return
          sfx.play('ui')
          const { boss: b } = await api.startBossDev(token)
          setBoss(b)
        }),
    }),
    [token, player, boss, tab, loading, error, wrap, refreshBoss, changeTab],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame outside provider')
  return ctx
}
