import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Twemoji } from '@/components/Twemoji'
import { DigParticles } from '@/components/DigParticles'
import { useGame } from '@/game/GameContext'
import { useFx } from '@/game/FxContext'
import { sfx } from '@/lib/sounds'
import { GAME, upgradeCost } from '@pb/shared'

const logo = '/logo-no-bg.jpg'

const HELPER_EMOJI: Record<string, string> = {
  'cart-runner': '🛒',
  'lamp-keeper': '🏮',
  'drill-adept': '🔩',
}

const UPGRADE_EMOJI = {
  pickaxe: '⛏️',
  speed: '⚡',
  capacity: '🎒',
  multiplier: '✨',
} as const

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return Math.floor(n).toLocaleString('ru-RU')
}

function MuteButton() {
  const [muted, setMuted] = useState(sfx.muted)
  return (
    <button
      type="button"
      className="rounded-md p-1.5 hover:bg-[var(--muted)]"
      aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      onClick={() => setMuted(sfx.toggle())}
    >
      <Twemoji emoji={muted ? '🔇' : '🔊'} size={18} />
    </button>
  )
}

function BossTimer() {
  const { boss } = useGame()
  if (!boss) return <span className="text-xs text-[var(--muted-foreground)]">Босс: …</span>
  if (boss.status === 'active') {
    const left = Math.max(0, new Date(boss.endsAt!).getTime() - Date.now())
    const m = Math.floor(left / 60000)
    const s = Math.floor((left % 60000) / 1000)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
        <Twemoji emoji="🐉" size={14} />
        Бой! {m}:{String(s).padStart(2, '0')}
      </span>
    )
  }
  const start = new Date(boss.startsAt).getTime() - Date.now()
  const h = Math.max(0, Math.floor(start / 3600000))
  const m = Math.max(0, Math.floor((start % 3600000) / 60000))
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
      <Twemoji emoji="⏰" size={14} />
      Босс {boss.slotHour}:00 через {h}ч {m}м
    </span>
  )
}

function TopBar() {
  const { player } = useGame()
  const { softFlash } = useFx()
  if (!player) return null
  return (
    <header className="safe-top flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-display text-lg leading-none tracking-wide text-[var(--primary)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          Подземные богатства
        </p>
        <BossTimer />
      </div>
      <div className="flex items-center gap-2 text-right text-sm">
        <MuteButton />
        <div>
          <div
            key={softFlash}
            className={`inline-flex items-center gap-1 font-semibold text-[var(--primary)] ${softFlash ? 'anim-soft-pop' : ''}`}
          >
            <Twemoji emoji="🪙" size={16} />
            {formatNum(player.soft)}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Ур.{player.level} · ×{player.prestigeMult.toFixed(2)}
          </div>
        </div>
      </div>
    </header>
  )
}

function MineScreen() {
  const { player, dig, convert, boss, hitBoss, setTab, mines, unlockMine, startBossDev } = useGame()
  const { digBurst, events } = useFx()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (boss?.status !== 'active') return
    const iv = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(iv)
  }, [boss?.status])

  if (!player) return null
  const mine = mines.find((m) => m.id === player.mineId) ?? mines[0]
  const nextMine = mines.find((m) => m.id === player.mineId + 1)
  const hpPct = boss ? (boss.hp / boss.maxHp) * 100 : 0
  const swinging = events.some((e) => e.kind === 'dig' && Date.now() - e.at < 280)
  void tick

  return (
    <div className="anim-tab-in flex flex-1 flex-col gap-4 px-4 pb-4">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mine.bgAsset})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
        <DigParticles />
        <div className="relative z-10 flex flex-col items-center px-4 text-center">
          <div className={swinging || digBurst ? 'anim-pick-swing' : ''} key={digBurst}>
            <Twemoji emoji="⛏️" size={48} className="mb-2 drop-shadow-lg" />
          </div>
          <img
            src={mine.oreAsset}
            alt={mine.oreName}
            className="mb-3 h-20 w-20 rounded-full object-cover shadow-lg shadow-black/50 ring-2 ring-[var(--primary)]/50"
          />
          <h2 className="font-display text-2xl text-[var(--foreground)] drop-shadow-md">{mine.name}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--foreground)]/85">
            <img src={mine.oreAsset} alt="" className="h-5 w-5 rounded-full object-cover" />
            {mine.oreName}: {formatNum(player.ore)} · курс ×{mine.oreToSoft}
          </p>
          <Button size="lg" className="mt-6 min-w-48 active:scale-95" onClick={() => dig()}>
            <Twemoji emoji="⛏️" size={18} />
            Копать
          </Button>
          <Button variant="secondary" className="mt-3" onClick={() => convert()}>
            <Twemoji emoji="🪙" size={18} />
            Сдать руду
          </Button>
        </div>
      </div>

      {boss?.status === 'active' && (
        <div className="anim-tab-in rounded-xl border border-[var(--accent)] bg-[var(--card)] p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Twemoji emoji="🐉" size={18} />
              Серверный босс
            </span>
            <span>
              {formatNum(boss.hp)} / {formatNum(boss.maxHp)}
            </span>
          </div>
          <Progress value={hpPct} className={`mb-3 ${hpPct < 30 ? 'anim-hp-pulse' : ''}`} />
          <Button className="w-full active:scale-95" variant="destructive" onClick={() => hitBoss()}>
            <Twemoji emoji="💥" size={18} />
            Удар · мой урон {formatNum(boss.myDamage)}
          </Button>
          <ul className="mt-3 space-y-1 text-xs text-[var(--muted-foreground)]">
            {boss.top.slice(0, 5).map((t, i) => (
              <li key={t.maxUserId} className="flex items-center gap-1">
                <Twemoji emoji={i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔸'} size={14} />
                {t.displayName}: {formatNum(t.damage)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextMine && (
        <Button
          variant="outline"
          className="backdrop-blur-sm"
          disabled={player.soft < nextMine.unlockSoft}
          onClick={() => unlockMine(nextMine.id)}
        >
          <img src={nextMine.oreAsset} alt="" className="h-5 w-5 rounded-full object-cover" />
          Открыть «{nextMine.name}» · {formatNum(nextMine.unlockSoft)}
        </Button>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 text-xs" onClick={() => setTab('more')}>
          <Twemoji emoji="📜" size={14} />
          Квесты / престиж
        </Button>
        <Button variant="ghost" className="flex-1 text-xs" onClick={() => startBossDev()}>
          <Twemoji emoji="🧪" size={14} />
          Dev: старт босса
        </Button>
      </div>
    </div>
  )
}

function UpgradesScreen() {
  const { player, upgrade } = useGame()
  if (!player) return null
  const keys = [
    ['pickaxe', 'Кирка'],
    ['speed', 'Скорость'],
    ['capacity', 'Вместимость'],
    ['multiplier', 'Множитель'],
  ] as const

  return (
    <div className="anim-tab-in flex flex-1 flex-col gap-3 px-4">
      <h2 className="font-display inline-flex items-center gap-2 text-xl">
        <Twemoji emoji="🛠️" size={22} />
        Улучшения
      </h2>
      {keys.map(([key, label]) => {
        const lvl = player.upgrades[key]
        const cost = upgradeCost(lvl)
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Twemoji emoji={UPGRADE_EMOJI[key]} size={28} />
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Ур. {lvl}</div>
              </div>
            </div>
            <Button size="sm" disabled={player.soft < cost} onClick={() => upgrade(key)}>
              <Twemoji emoji="🪙" size={14} />
              {formatNum(cost)}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function HelpersScreen() {
  const { player, helpers, buyHelper } = useGame()
  if (!player) return null
  return (
    <div className="anim-tab-in flex flex-1 flex-col gap-3 px-4">
      <h2 className="font-display inline-flex items-center gap-2 text-xl">
        <Twemoji emoji="👷" size={22} />
        Помощники
      </h2>
      {helpers.map((h) => {
        const owned = player.helpers.find((x) => x.helperId === h.id)
        const level = owned?.level ?? 0
        const cost = Math.floor(h.baseCost * Math.pow(h.costGrowth, level))
        return (
          <div
            key={h.id}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Twemoji emoji={HELPER_EMOJI[h.id] ?? '👤'} size={28} />
              <div>
                <div className="font-semibold">{h.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {h.orePerSec}/с · босс +{h.bossDamageBonus} · ур.{level}
                </div>
              </div>
            </div>
            <Button size="sm" disabled={player.soft < cost} onClick={() => buyHelper(h.id)}>
              {level ? 'Ап' : 'Нанять'} {formatNum(cost)}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function SkillsScreen() {
  const { player, skillTree, unlockSkill } = useGame()
  if (!player) return null
  const branchEmoji = { mining: '⛏️', helpers: '👷', boss: '🐉' } as const
  return (
    <div className="anim-tab-in flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
      <h2 className="font-display inline-flex items-center gap-2 text-xl">
        <Twemoji emoji="🌳" size={22} />
        Навыки · {player.skillPoints} оч.
      </h2>
      {(['mining', 'helpers', 'boss'] as const).map((branch) => (
        <div key={branch} className="space-y-2">
          <h3 className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
            <Twemoji emoji={branchEmoji[branch]} size={14} />
            {branch === 'mining' ? 'Добыча' : branch === 'helpers' ? 'Помощники' : 'Босс'}
          </h3>
          {skillTree
            .filter((s) => s.branch === branch)
            .map((s) => {
              const owned = player.skills.includes(s.id)
              const locked = s.requires?.some((r) => !player.skills.includes(r))
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {s.effect.key} +{Math.round(s.effect.value * 100)}%
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={owned || locked || player.skillPoints < s.cost}
                    onClick={() => unlockSkill(s.id)}
                  >
                    {owned ? <Twemoji emoji="✅" size={16} /> : `${s.cost} SP`}
                  </Button>
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}

function MoreScreen() {
  const { player, quests, prestige, claimQuest } = useGame()
  if (!player) return null
  const progress = player.questProgress ?? {}
  return (
    <div className="anim-tab-in flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <section>
        <h2 className="font-display inline-flex items-center gap-2 text-xl">
          <Twemoji emoji="📜" size={22} />
          Квесты
        </h2>
        <div className="mt-2 space-y-2">
          {quests.map((q) => {
            const cur = progress[q.metric] ?? 0
            const claimed = (progress[`claimed:${q.id}`] ?? 0) > 0
            const ready = cur >= q.target && !claimed
            return (
              <div
                key={q.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{q.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {Math.min(cur, q.target)}/{q.target} · {q.type}
                    </div>
                  </div>
                  <Button size="sm" disabled={!ready} onClick={() => claimQuest(q.id)}>
                    {claimed ? <Twemoji emoji="✅" size={16} /> : 'Забрать'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="font-display inline-flex items-center gap-2 text-xl">
          <Twemoji emoji="♻️" size={22} />
          Престиж
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Нужно {formatNum(GAME.prestigeSoftRequirement)} монет. Сброс шахты, улучшений и помощников.
          Множитель +{GAME.prestigeMultPerRun} навсегда. Сейчас ×{player.prestigeMult.toFixed(2)} (
          {player.prestigeCount}×).
        </p>
        <Button
          className="mt-3 w-full"
          variant="destructive"
          disabled={player.soft < GAME.prestigeSoftRequirement}
          onClick={() => {
            if (confirm('Точно сделать престиж? Прогресс шахты сбросится.')) prestige()
          }}
        >
          <Twemoji emoji="♻️" size={16} />
          Престиж
        </Button>
      </section>

      <section className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
        <span className="mr-1 inline-flex align-middle">
          <Twemoji emoji="🛒" size={16} />
        </span>
        Магазин (hard) — заглушка v1. Донат не обязателен.
      </section>
    </div>
  )
}

function TabBar() {
  const { tab, setTab } = useGame()
  const items: Array<[typeof tab, string, string]> = [
    ['mine', 'Шахта', '⛏️'],
    ['upgrades', 'Улучш', '🛠️'],
    ['helpers', 'Помощ', '👷'],
    ['skills', 'Навыки', '🌳'],
    ['more', 'Ещё', '☰'],
  ]
  return (
    <nav className="safe-bottom grid grid-cols-5 border-t border-[var(--border)] bg-[var(--card)]/80 px-1 pt-2 backdrop-blur-md">
      {items.map(([id, label, emoji]) => (
        <button
          key={id}
          type="button"
          onClick={() => setTab(id)}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors ${
            tab === id ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
          }`}
        >
          <Twemoji emoji={emoji === '☰' ? '📦' : emoji} size={18} />
          {label}
        </button>
      ))}
    </nav>
  )
}

function Splash({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/bg/mine-copper.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/50 to-black/75" />
      <div className="anim-splash-bob relative z-10">
        <img
          src={logo}
          alt="Подземные богатства"
          className="h-36 w-36 rounded-full object-cover shadow-lg shadow-black/40 ring-2 ring-[var(--primary)]/40"
        />
      </div>
      <div className="relative z-10">
        <h1 className="font-display text-3xl text-[var(--primary)] drop-shadow-md">Подземные богатства</h1>
        <p className="mt-2 inline-flex flex-wrap items-center justify-center gap-1 text-sm text-[var(--foreground)]/90">
          <Twemoji emoji="⛏️" size={16} />
          Копай глубже — расти быстрее —
          <Twemoji emoji="🐉" size={16} />
          бей боссов вместе.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <img src="/ores/ore-copper.jpg" alt="Медная руда" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/20" />
          <img src="/ores/ore-amber.jpg" alt="Янтарная руда" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/20" />
        </div>
      </div>
      <Button
        size="lg"
        className="relative z-10"
        onClick={() => {
          sfx.play('ui')
          onEnter()
        }}
      >
        <Twemoji emoji="🚪" size={18} />
        Войти (dev)
      </Button>
    </div>
  )
}

export function AppShell() {
  const { player, loading, error, tab, loginDev, mines } = useGame()
  const mine = mines.find((m) => m.id === player?.mineId) ?? mines[0]
  const bg = mine?.bgAsset ?? '/bg/mine-copper.jpg'

  if (loading) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-3 overflow-hidden text-[var(--foreground)]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
        <div className="absolute inset-0 bg-black/60" />
        <span className="anim-splash-bob relative z-10">
          <Twemoji emoji="⛏️" size={40} />
        </span>
        <span className="relative z-10">Загрузка шахты…</span>
      </div>
    )
  }

  if (!player) return <Splash onEnter={() => loginDev()} />

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center transition-[background-image] duration-700"
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-[#1a1410]/82 to-black/88" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <TopBar />
        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-[var(--destructive)]/20 px-3 py-2 text-sm text-[#ffb4a8]">
            <Twemoji emoji="⚠️" size={16} />
            {error}
          </div>
        )}
        <main className="flex flex-1 flex-col overflow-hidden">
          {tab === 'mine' && <MineScreen />}
          {tab === 'upgrades' && <UpgradesScreen />}
          {tab === 'helpers' && <HelpersScreen />}
          {tab === 'skills' && <SkillsScreen />}
          {tab === 'more' && <MoreScreen />}
        </main>
        <TabBar />
      </div>
    </div>
  )
}
