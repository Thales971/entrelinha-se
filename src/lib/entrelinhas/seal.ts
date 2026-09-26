function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64ToBytes(value: string) {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const PRIV = "entrelinha-seal-pkcs8";
const PUB = "entrelinha-seal-spki";

let owner = "";

export function sealOwner(userId: string) {
  owner = userId;
}

async function importPrivate(pkcs8: string) {
  return crypto.subtle.importKey("pkcs8", b64ToBytes(pkcs8), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}

async function importPublic(spki: string) {
  return crypto.subtle.importKey("spki", b64ToBytes(spki), { name: "ECDH", namedCurve: "P-256" }, false, []);
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
      const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
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
    { name: "HKDF", hash: "SHA-256", salt: asBytes(salt), info: asBytes(new TextEncoder().encode("entrelinha-carta-v1")) },
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
  const { priv, pub } = await localPair();
  const mine = await importPrivate(priv);
  const mePub = await importPublic(pub);
  const theirs = await importPublic(theirPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const meIv = crypto.getRandomValues(new Uint8Array(12));
  const toKey = await aesKey(await sharedBits(mine, theirs), iv);
  const meKey = await aesKey(await sharedBits(mine, mePub), meIv);
  const data = new TextEncoder().encode(plain);
  const forThem = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBytes(iv) }, toKey, data));
  const forMe = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBytes(meIv) }, meKey, data));
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
    const packed = JSON.parse(payload) as { v?: number; iv?: string; meIv?: string; forThem?: string; forMe?: string };
    if (packed.v !== 1 || !packed.iv || !packed.forThem || !packed.forMe || !packed.meIv) return null;
    const { priv, pub } = await localPair();
    const privateKey = await importPrivate(priv);
    const box = mine ? packed.forMe : packed.forThem;
    const iv = b64ToBytes(mine ? packed.meIv : packed.iv);
    const bits = mine
      ? await sharedBits(privateKey, await importPublic(pub))
      : await sharedBits(privateKey, await importPublic(theirPub));
    const key = await aesKey(bits, iv);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBytes(iv) }, key, b64ToBytes(box));
    return new TextDecoder().decode(clear);
  } catch {
    return null;
  }
}
