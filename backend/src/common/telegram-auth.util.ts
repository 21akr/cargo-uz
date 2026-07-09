import * as crypto from 'crypto';

export interface TmaUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Validate Telegram Mini App initData per the official algorithm:
 *   secret  = HMAC_SHA256(key="WebAppData", msg=botToken)
 *   check   = HMAC_SHA256(key=secret, msg=dataCheckString) === hash
 * where dataCheckString is the sorted "k=v" pairs (minus `hash`) joined by "\n".
 * Returns the parsed user on success, or null on any failure.
 */
export function validateInitData(initData: string, botToken: string): TmaUser | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  // constant-time compare
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return user && typeof user.id === 'number' ? user : null;
  } catch {
    return null;
  }
}
