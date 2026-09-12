import { createPrivateKey, sign as cryptoSign } from "node:crypto";

/** Deterministic JSON: sorted keys, stable across runs — the bytes we sign. */
export function stableStringify(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o).sort()) out[k] = walk(o[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

export function signPassport(passport: Record<string, unknown>): {
  signature: string | null;
  keyId: string;
} {
  const pem = process.env.TOOLPROOF_SIGNING_KEY;
  if (!pem) return { signature: null, keyId: "dev-unsigned" };
  try {
    const key = createPrivateKey(pem.replace(/\\n/g, "\n"));
    const sig = cryptoSign(null, Buffer.from(stableStringify(passport)), key);
    return { signature: sig.toString("base64"), keyId: "tpk-1" };
  } catch {
    return { signature: null, keyId: "sign-error" };
  }
}
