import { createHmac, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(process.env.JWT_SECRET ?? 'dev-change-me');
}

/** Dev-friendly Max initData parse. Production should verify HMAC with MAX_APP_SECRET. */
export function parseMaxInitData(initData: string): { userId: string; displayName: string } | null {
  if (!initData) return null;

  // Dev bypass: "dev:<userId>:<name>"
  if (initData.startsWith('dev:')) {
    const [, userId, name] = initData.split(':');
    if (!userId) return null;
    return { userId, displayName: name || 'Dev Miner' };
  }

  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as { id: number | string; first_name?: string; username?: string };
    const appSecret = process.env.MAX_APP_SECRET;
    if (appSecret) {
      const check = params.get('hash');
      if (!check) return null;
      params.delete('hash');
      const dataCheck = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      const computed = createHmac('sha256', appSecret).update(dataCheck).digest('hex');
      const a = Buffer.from(computed);
      const b = Buffer.from(check);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    }
    return {
      userId: String(user.id),
      displayName: user.first_name || user.username || 'Шахтёр',
    };
  } catch {
    return null;
  }
}

export async function issueToken(userId: string, displayName: string) {
  return new SignJWT({ displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  if (!payload.sub) throw new Error('INVALID_TOKEN');
  return {
    userId: payload.sub,
    displayName: String(payload.displayName ?? 'Шахтёр'),
  };
}
