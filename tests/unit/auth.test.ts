import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOwnerPassword,
  getSessionSecret,
  safeEqual,
  signSession,
  verifySession,
} from "@/lib/auth/session";
import { checkRateLimit, resetRateLimits } from "@/lib/auth/rate-limit";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "secret-de-test-suffisamment-long!");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("signSession / verifySession", () => {
  it("round-trip owner et client", () => {
    const owner = verifySession(signSession({ sub: "owner", role: "owner" }, 3600));
    expect(owner).toMatchObject({ sub: "owner", role: "owner" });
    expect(owner!.exp).toBeGreaterThan(Date.now() / 1000);

    const client = verifySession(
      signSession({ sub: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff", role: "client" }, 3600),
    );
    expect(client).toMatchObject({
      sub: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
      role: "client",
    });
  });

  it("rejette un jeton expiré", () => {
    const token = signSession({ sub: "owner", role: "owner" }, -10);
    expect(verifySession(token)).toBeNull();
  });

  it("rejette un payload altéré", () => {
    const token = signSession({ sub: "owner", role: "owner" }, 3600);
    const [body, mac] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ sub: "owner", role: "owner", exp: 9999999999 }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${mac}`)).toBeNull();
    expect(verifySession(`${body}.AAAA${mac?.slice(4)}`)).toBeNull();
  });

  it("rejette un jeton signé avec un autre secret", () => {
    const token = signSession({ sub: "owner", role: "owner" }, 3600);
    vi.stubEnv("SESSION_SECRET", "un-autre-secret-completement-different");
    expect(verifySession(token)).toBeNull();
  });

  it("rejette les chaînes invalides sans throw", () => {
    for (const garbage of ["", "abc", "a.b.c", "%%%.###", null, undefined]) {
      expect(verifySession(garbage as string)).toBeNull();
    }
  });
});

describe("secrets lazy", () => {
  it("le module s'importe sans secret (pas de throw top-level)", async () => {
    // L'import en tête de fichier a déjà réussi sans VERCEL : preuve suffisante.
    expect(typeof signSession).toBe("function");
  });

  it("en prod-like sans secret → throw ; avec secret → ok", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("VERCEL", "1");
    expect(() => getSessionSecret()).toThrow(/SESSION_SECRET/);
    vi.stubEnv("SESSION_SECRET", "secret-prod");
    expect(getSessionSecret()).toBe("secret-prod");

    vi.stubEnv("OWNER_PASSWORD", "");
    expect(() => getOwnerPassword()).toThrow(/OWNER_PASSWORD/);
    vi.stubEnv("OWNER_PASSWORD", "mdp");
    expect(getOwnerPassword()).toBe("mdp");
  });

  it("en dev sans secret → défaut avec warn", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("VERCEL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getSessionSecret()).toMatch(/^dev-/);
    warn.mockRestore();
  });
});

describe("safeEqual", () => {
  it("compare en temps constant des chaînes de longueurs différentes", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("court", "beaucoup-plus-long")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  it("autorise jusqu'à la limite puis bloque dans la fenêtre", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("ip-1", 10, 60_000)).toBe(true);
    }
    expect(checkRateLimit("ip-1", 10, 60_000)).toBe(false);
    expect(checkRateLimit("ip-2", 10, 60_000)).toBe(true);
  });

  it("réautorise après la fenêtre", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("ip-1", 10, 60_000);
    expect(checkRateLimit("ip-1", 10, 60_000)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("ip-1", 10, 60_000)).toBe(true);
  });
});
