import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onFx, type FxKind } from '@/lib/fxBus'

type FxEvent = { id: number; kind: FxKind; at: number }

type FxContextValue = {
  events: FxEvent[]
  digBurst: number
  softFlash: number
}

const FxContext = createContext<FxContextValue | null>(null)

let seq = 0

export function FxProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<FxEvent[]>([])
  const [digBurst, setDigBurst] = useState(0)
  const [softFlash, setSoftFlash] = useState(0)

  const onPulse = useCallback((kind: FxKind) => {
    const id = ++seq
    const at = Date.now()
    setEvents((prev) => [...prev.slice(-12), { id, kind, at }])
    if (kind === 'dig') setDigBurst((n) => n + 1)
    if (kind === 'convert' || kind === 'softBump' || kind === 'upgrade') setSoftFlash((n) => n + 1)
    window.setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    }, 700)
  }, [])

  useEffect(() => onFx(onPulse), [onPulse])

  const value = useMemo(
    () => ({ events, digBurst, softFlash }),
    [events, digBurst, softFlash],
  )

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>
}

export function useFx() {
  const ctx = useContext(FxContext)
  if (!ctx) throw new Error('useFx outside provider')
  return ctx
}
