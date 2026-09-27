const PRIV = "entrelinha-seal-pkcs8";
const PUB = "entrelinha-seal-spki";
const MAX_LETTER_LENGTH = 2000;
const MAX_BOX_LENGTH = 5000;

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64ToBytes(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new Error("base64 invalido");
  }
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let owner = "";

export function sealOwner(userId: string) {
  owner = userId;
}

async function importPrivate(pkcs8: string) {
  const raw = b64ToBytes(pkcs8);
  if (raw.length < 32) throw new Error("chave privada invalida");
  return crypto.subtle.importKey("pkcs8", raw, { name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
  ]);
}

async function importPublic(spki: string) {
  const raw = b64ToBytes(spki);
  if (raw.length < 32) throw new Error("chave publica invalida");
  return crypto.subtle.importKey("spki", raw, { name: "ECDH", namedCurve: "P-256" }, false, []);
}

async function localPair() {
  if (!owner) throw new Error("sem dono");
  const privKey = `${PRIV}:${owner}`;
  const pubKey = `${PUB}:${owner}`;
  let priv = localStorage.getItem(privKey);
  let pub = localStorage.getItem(pubKey);
  if (!priv || !pub) {
    const legacyPriv = localStorage.getItem(PRIV);
    const legacyPub = localStorage.getItem(PUB);
    const claimed = localStorage.getItem(`${PRIV}:claimed`);
    if (legacyPriv && legacyPub && !claimed) {
      priv = legacyPriv;
      pub = legacyPub;
      localStorage.setItem(`${PRIV}:claimed`, owner);
      localStorage.removeItem(PRIV);
      localStorage.removeItem(PUB);
    } else {
      const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
        "deriveBits",
      ]);
      priv = bytesToB64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)));
      pub = bytesToB64(new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey)));
    }
    localStorage.setItem(privKey, priv);
    localStorage.setItem(pubKey, pub);
  }
  return { priv, pub };
}

function asBytes(view: Uint8Array) {
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return new Uint8Array(buffer);
}

async function aesKey(bits: ArrayBuffer, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asBytes(salt),
      info: asBytes(new TextEncoder().encode("entrelinha-carta-v1")),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function sharedBits(priv: CryptoKey, pub: CryptoKey) {
  return crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
}

export async function localPublicKey() {
  return (await localPair()).pub;
}

export async function sealLetter(plain: string, theirPub: string) {
  if (!plain.trim() || plain.length > MAX_LETTER_LENGTH) throw new Error("Carta muito grande.");
  const { priv, pub } = await localPair();
  const mine = await importPrivate(priv);
  const mePub = await importPublic(pub);
  const theirs = await importPublic(theirPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const meIv = crypto.getRandomValues(new Uint8Array(12));
  const toKey = await aesKey(await sharedBits(mine, theirs), iv);
  const meKey = await aesKey(await sharedBits(mine, mePub), meIv);
  const data = new TextEncoder().encode(plain);
  const forThem = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBytes(iv) }, toKey, data),
  );
  const forMe = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBytes(meIv) }, meKey, data),
  );
  return JSON.stringify({
    v: 1,
    iv: bytesToB64(iv),
    meIv: bytesToB64(meIv),
    forThem: bytesToB64(forThem),
    forMe: bytesToB64(forMe),
  });
}

export async function openLetter(payload: string, theirPub: string, mine: boolean) {
  try {
    if (payload.length > 8000) return null;
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const packed = parsed as {
      v?: unknown;
      iv?: unknown;
      meIv?: unknown;
      forThem?: unknown;
      forMe?: unknown;
    };
    const iv = typeof packed.iv === "string" ? packed.iv : "";
    const meIv = typeof packed.meIv === "string" ? packed.meIv : "";
    const forThem = typeof packed.forThem === "string" ? packed.forThem : "";
    const forMe = typeof packed.forMe === "string" ? packed.forMe : "";
    if (
      packed.v !== 1 ||
      !iv ||
      !meIv ||
      !forThem ||
      !forMe ||
      forThem.length > MAX_BOX_LENGTH ||
      forMe.length > MAX_BOX_LENGTH
    )
      return null;
    const ivBytes = b64ToBytes(iv);
    const meIvBytes = b64ToBytes(meIv);
    if (ivBytes.length !== 12 || meIvBytes.length !== 12) return null;
    const { priv, pub } = await localPair();
    const privateKey = await importPrivate(priv);
    const box = mine ? forMe : forThem;
    const boxIv = mine ? meIvBytes : ivBytes;
    const bits = mine
      ? await sharedBits(privateKey, await importPublic(pub))
      : await sharedBits(privateKey, await importPublic(theirPub));
    const key = await aesKey(bits, boxIv);
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asBytes(boxIv) },
      key,
      b64ToBytes(box),
    );
    if (clear.byteLength > MAX_LETTER_LENGTH * 4) return null;
    return new TextDecoder().decode(clear);
  } catch {
    return null;
  }
}
