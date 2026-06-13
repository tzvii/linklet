const ROUNDS = 4;
const KEYS = [0x1a2b, 0x5e6f, 0x9c0d, 0x3a4b];
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE = 36;
const SLUG_LEN = 5;
const MAX = Math.pow(BASE, SLUG_LEN);
const MOD = Math.pow(2, 15);

function feistel(n: number) {
  let left = Math.floor(n / MOD);
  let right = n % MOD;

  for (let i = 0; i < ROUNDS; i++) {
    const f = ((right * KEYS[i]) ^ (right >> 3) ^ KEYS[i]) % MOD;
    [left, right] = [right, (left + f) % MOD];
  }

  return left * MOD + right;
}

export function encoder(n: number) {
  do {
    n = feistel(n);
  } while (n >= MAX);

  let result = '';
  while (result.length < SLUG_LEN) {
    result = CHARS[n % BASE] + result;
    n = Math.floor(n / BASE);
  }
  return result;
}
