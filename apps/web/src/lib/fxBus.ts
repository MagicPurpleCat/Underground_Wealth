export type FxKind = 'dig' | 'hit' | 'convert' | 'upgrade' | 'softBump'

type Listener = (kind: FxKind) => void

const listeners = new Set<Listener>()

export function emitFx(kind: FxKind) {
  listeners.forEach((l) => l(kind))
}

export function onFx(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
