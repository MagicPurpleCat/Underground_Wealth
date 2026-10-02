import type { BossPublicState, PlayerState } from '@pb/shared'

const API = '/api'

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (init?.token) headers.set('Authorization', `Bearer ${init.token}`)
  const res = await fetch(`${API}${path}`, { ...init, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data as T
}

export const api = {
  authDev(userId = 'dev-1', name = 'Слава') {
    return request<{ token: string; player: PlayerState }>('/auth/max', {
      method: 'POST',
      body: JSON.stringify({ initData: `dev:${userId}:${name}` }),
    })
  },
  me(token: string) {
    return request<{ player: PlayerState }>('/me', { token })
  },
  config() {
    return request<{
      mines: unknown
      helpers: unknown
      skillTree: unknown
      quests: unknown
      tutorials: unknown
      bossSlots: unknown
    }>('/config')
  },
  dig(token: string) {
    return request<{ player: PlayerState }>('/dig', { method: 'POST', token })
  },
  convert(token: string) {
    return request<{ state: PlayerState; softGain: number }>('/convert', { method: 'POST', token })
  },
  upgrade(token: string, key: string) {
    return request<{ player: PlayerState }>('/upgrade', {
      method: 'POST',
      token,
      body: JSON.stringify({ key }),
    })
  },
  buyHelper(token: string, helperId: string) {
    return request<{ player: PlayerState }>('/helpers/buy', {
      method: 'POST',
      token,
      body: JSON.stringify({ helperId }),
    })
  },
  unlockSkill(token: string, skillId: string) {
    return request<{ player: PlayerState }>('/skills/unlock', {
      method: 'POST',
      token,
      body: JSON.stringify({ skillId }),
    })
  },
  unlockMine(token: string, mineId: number) {
    return request<{ player: PlayerState }>('/mines/unlock', {
      method: 'POST',
      token,
      body: JSON.stringify({ mineId }),
    })
  },
  prestige(token: string) {
    return request<{ player: PlayerState }>('/prestige', { method: 'POST', token })
  },
  claimQuest(token: string, questId: string) {
    return request<{ player: PlayerState }>('/quests/claim', {
      method: 'POST',
      token,
      body: JSON.stringify({ questId }),
    })
  },
  boss(token: string) {
    return request<BossPublicState>('/boss', { token })
  },
  hitBoss(token: string) {
    return request<{ boss: BossPublicState }>('/boss/hit', { method: 'POST', token })
  },
  bossHistory(token: string) {
    return request<{ history: unknown[] }>('/boss/history', { token })
  },
  shop() {
    return request<{ enabled: boolean; message: string }>('/shop')
  },
  startBossDev(token: string) {
    return request<{ boss: BossPublicState }>('/dev/boss/start', { method: 'POST', token })
  },
}
