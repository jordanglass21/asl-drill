// Session history in localStorage. Versioned and validated on read, so a
// corrupted or older value never breaks the app. Kept to plain JSON so it can
// move to accounts later (Phase 2).

import type { LetterResult, SessionRecord, WordResult } from "./session";

export const SESSIONS_STORAGE_KEY = "asl-drill:sessions";
export const SESSIONS_VERSION = 1;
export const MAX_SESSIONS = 100;

interface StoredSessions {
  version: typeof SESSIONS_VERSION;
  sessions: SessionRecord[];
}

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isLetter(v: unknown): v is LetterResult {
  const l = v as Partial<LetterResult> | null;
  return (
    !!l && isString(l.letter) && (l.result === "pass" || l.result === "miss") && isNumber(l.activeMs) &&
    (l.readAs === null || isString(l.readAs))
  );
}

function isWord(v: unknown): v is WordResult {
  const w = v as Partial<WordResult> | null;
  return !!w && isString(w.word) && isNumber(w.activeMs) && Array.isArray(w.letters) && w.letters.every(isLetter);
}

function isSession(v: unknown): v is SessionRecord {
  const s = v as Partial<SessionRecord> | null;
  return !!s && isString(s.id) && isString(s.startedAt) && isString(s.endedAt) && Array.isArray(s.words) && s.words.every(isWord);
}

/** Parses stored history, dropping anything malformed. Newest last. */
export function parseSessions(raw: string | null | undefined): SessionRecord[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Partial<StoredSessions>;
    if (data.version !== SESSIONS_VERSION || !Array.isArray(data.sessions)) return [];
    return data.sessions.filter(isSession);
  } catch {
    return [];
  }
}

export function loadSessions(storage: Pick<Storage, "getItem"> | undefined): SessionRecord[] {
  try {
    return parseSessions(storage?.getItem(SESSIONS_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Appends a session (replacing one with the same id) and keeps the newest MAX_SESSIONS. */
export function saveSession(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  session: SessionRecord,
): boolean {
  try {
    if (!storage) return false;
    const sessions = loadSessions(storage).filter((s) => s.id !== session.id);
    sessions.push(session);
    const value: StoredSessions = { version: SESSIONS_VERSION, sessions: sessions.slice(-MAX_SESSIONS) };
    storage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** A session by id, or the most recent one. */
export function findSession(sessions: readonly SessionRecord[], id?: string | null): SessionRecord | null {
  if (id) return sessions.find((s) => s.id === id) ?? null;
  return sessions.at(-1) ?? null;
}
