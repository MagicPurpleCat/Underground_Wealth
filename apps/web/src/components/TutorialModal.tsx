import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Twemoji } from '@/components/Twemoji'
import { useGame } from '@/game/GameContext'

export function TutorialModal() {
  const { player, tutorials, token } = useGame()
  const [step, setStep] = useState(0)
  const [hidden, setHidden] = useState(false)

  const pending = useMemo(() => {
    if (!player) return null
    const forMine = tutorials.find((t) => t.mineId === player.mineId)
    if (!forMine) return null
    // show if tutorial id is in seen list as "just unlocked" — for mine 2+ require not yet dismissed this session
    if (player.mineId === 1 && player.seenTutorials.includes('mine-1')) return null
    if (player.seenTutorials.includes(forMine.id) && player.mineId > 1) {
      // first visit after unlock: seen_tutorials already contains id from unlockMine — still show once per session
      const key = `pb_tut_${forMine.id}`
      if (sessionStorage.getItem(key)) return null
    }
    if (player.mineId === 1) return null
    return forMine
  }, [player, tutorials])

  useEffect(() => {
    setStep(0)
    setHidden(false)
  }, [pending?.id])

  if (!pending || hidden || !player) return null
  const line = pending.lines[step]
  if (!line) return null

  const finish = async () => {
    sessionStorage.setItem(`pb_tut_${pending.id}`, '1')
    setHidden(true)
    if (token) {
      await fetch('/api/tutorials/seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tutorialId: pending.id }),
      }).catch(() => undefined)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <Twemoji emoji="🧭" size={36} />
          <div>
            <div className="text-sm font-semibold text-[var(--primary)]">{line.speaker}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Проводник шахты</div>
          </div>
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-[var(--muted)] px-3 py-2 text-sm leading-relaxed">
          {line.text}
        </div>
        <div className="mt-4 flex gap-2">
          {step < pending.lines.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
              <Twemoji emoji="➡️" size={16} />
              Дальше
            </Button>
          ) : (
            <Button className="flex-1" onClick={finish}>
              <Twemoji emoji="⛏️" size={16} />
              В шахту
            </Button>
          )}
          <Button variant="ghost" onClick={finish}>
            Пропустить
          </Button>
        </div>
      </div>
    </div>
  )
}
