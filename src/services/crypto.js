const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function enc(str) {
  return new TextEncoder().encode(str);
}

function dec(bytes) {
  return new TextDecoder().decode(bytes);
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function hashPassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, 256);
  return toBase64(new Uint8Array(bits));
}

export async function deriveEncryptionKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return toBase64(new Uint8Array(raw));
}

export async function importKey(base64) {
  const raw = fromBase64(base64);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}

export async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc(plaintext));
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return toBase64(combined);
}

export async function decrypt(data, key) {
  const combined = fromBase64(data);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return dec(plaintext);
}
