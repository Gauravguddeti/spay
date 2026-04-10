const IV_LENGTH_BYTES = 12
const AUTH_TAG_LENGTH_BYTES = 16

function getRuntimeCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Runtime crypto is unavailable")
  }

  return globalThis.crypto
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set")
  }

  const runtimeCrypto = getRuntimeCrypto()
  const encodedSecret = new TextEncoder().encode(secret)
  const digest = await runtimeCrypto.subtle.digest("SHA-256", encodedSecret)

  return runtimeCrypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ])
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function isEncryptedTokenFormat(value: string): boolean {
  const parts = value.split(":")
  if (parts.length !== 2) {
    return false
  }

  const [ivHex, cipherHex] = parts
  if (ivHex.length !== IV_LENGTH_BYTES * 2 || cipherHex.length <= AUTH_TAG_LENGTH_BYTES * 2) {
    return false
  }

  const hexRegex = /^[0-9a-fA-F]+$/
  return hexRegex.test(ivHex) && hexRegex.test(cipherHex)
}

export async function encryptToken(plaintext: string): Promise<string> {
  const runtimeCrypto = getRuntimeCrypto()
  const key = await getEncryptionKey()
  const iv = runtimeCrypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const payload = new TextEncoder().encode(plaintext)

  const encryptedPayloadBuffer = await runtimeCrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    payload,
  )

  const encryptedPayload = new Uint8Array(encryptedPayloadBuffer)
  return `${bytesToHex(iv)}:${bytesToHex(encryptedPayload)}`
}

export async function decryptToken(ciphertext: string): Promise<string> {
  if (!isEncryptedTokenFormat(ciphertext)) {
    throw new Error("TOKEN_DECRYPT_FAILED")
  }

  const [ivHex, encryptedPayloadHex] = ciphertext.split(":")
  const iv = hexToBytes(ivHex)
  const encryptedPayload = hexToBytes(encryptedPayloadHex)

  if (encryptedPayload.length <= AUTH_TAG_LENGTH_BYTES) {
    throw new Error("TOKEN_DECRYPT_FAILED")
  }

  const runtimeCrypto = getRuntimeCrypto()
  const key = await getEncryptionKey()
  const decryptedPayload = await runtimeCrypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedPayload,
  )

  return new TextDecoder().decode(decryptedPayload)
}

export async function decryptTokenWithCompatibility(ciphertext: string): Promise<{
  token: string
  usedLegacyPlaintext: boolean
}> {
  if (!ciphertext.includes(":")) {
    return {
      token: ciphertext,
      usedLegacyPlaintext: true,
    }
  }

  return {
    token: await decryptToken(ciphertext),
    usedLegacyPlaintext: false,
  }
}
