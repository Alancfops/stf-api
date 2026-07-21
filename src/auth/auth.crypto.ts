import { createHash, randomInt } from 'node:crypto';

import * as argon2 from 'argon2';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateResetToken(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
