import type { SessionRecord } from "./session";
import { findSession, loadSessions, MAX_SESSIONS, parseSessions, saveSession, SESSIONS_STORAGE_KEY } from "./storage";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};

const session = (id: string): SessionRecord => ({
  id,
  startedAt: "2026-10-26T18:00:00.000Z",
  endedAt: "2026-10-26T18:03:00.000Z",
  words: [{ word: "CAT", activeMs: 9000, letters: [{ letter: "C", result: "pass", activeMs: 3000, readAs: null }] }],
});

describe("session storage", () => {
  it("round-trips sessions, newest last", () => {
    const storage = memoryStorage();
    saveSession(storage, session("a"));
    saveSession(storage, session("b"));
    expect(loadSessions(storage).map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("replaces a session saved twice", () => {
    const storage = memoryStorage();
    saveSession(storage, session("a"));
    saveSession(storage, session("a"));
    expect(loadSessions(storage)).toHaveLength(1);
  });

  it("keeps only the newest sessions", () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_SESSIONS + 5; i++) saveSession(storage, session(`s${i}`));
    const ids = loadSessions(storage).map((s) => s.id);
    expect(ids).toHaveLength(MAX_SESSIONS);
    expect(ids[0]).toBe("s5");
  });

  it.each([null, "", "not json", '{"version":2,"sessions":[]}', '{"version":1}'])("treats %p as empty", (raw) => {
    expect(parseSessions(raw)).toEqual([]);
  });

  it("drops malformed sessions but keeps good ones", () => {
    const raw = JSON.stringify({ version: 1, sessions: [session("good"), { id: "bad" }, { ...session("x"), words: [{}] }] });
    expect(parseSessions(raw).map((s) => s.id)).toEqual(["good"]);
  });

  it("keeps a session's hold time and drops a malformed one", () => {
    const raw = JSON.stringify({ version: 1, sessions: [{ ...session("ok"), holdMs: 200 }, { ...session("bad"), holdMs: "fast" }] });
    expect(parseSessions(raw).map((s) => [s.id, s.holdMs])).toEqual([["ok", 200]]);
  });

  it("keeps how letters were confirmed, and drops a session with an unknown value", () => {
    const letter = (confirmedBy: string) => ({ letter: "C", result: "pass", activeMs: 1, readAs: null, confirmedBy });
    const withVia = (id: string, confirmedBy: string) => ({
      ...session(id),
      words: [{ word: "C", activeMs: 1, letters: [letter(confirmedBy)] }],
    });
    const raw = JSON.stringify({ version: 1, sessions: [withVia("ok", "slide"), withVia("bad", "teleport")] });
    const parsed = parseSessions(raw);
    expect(parsed.map((s) => s.id)).toEqual(["ok"]);
    expect(parsed[0]?.words[0]?.letters[0]?.confirmedBy).toBe("slide");
  });

  it("survives blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSessions(blocked)).toEqual([]);
    expect(saveSession(blocked, session("a"))).toBe(false);
    expect(saveSession(undefined, session("a"))).toBe(false);
  });

  it("writes under a namespaced key", () => {
    const storage = memoryStorage();
    saveSession(storage, session("a"));
    expect([...storage.data.keys()]).toEqual([SESSIONS_STORAGE_KEY]);
  });
});

describe("findSession", () => {
  const all = [session("a"), session("b")];
  it("finds by id or falls back to the latest", () => {
    expect(findSession(all, "a")?.id).toBe("a");
    expect(findSession(all)?.id).toBe("b");
    expect(findSession(all, "missing")).toBeNull();
    expect(findSession([])).toBeNull();
  });
});
