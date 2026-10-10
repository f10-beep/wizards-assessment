"use client";

import { useSyncExternalStore } from "react";

// Client-claimed, same stub-identity trust model as userPrincipal (see
// src/lib/userPrincipal.ts, ADR 0005/0006) — not verified, remembered
// locally so it doesn't need re-declaring on every visit.
export const IS_ORGANIZER_STORAGE_KEY = "gameNight.isOrganizer";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(IS_ORGANIZER_STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the current browser is currently claiming the organizer role —
 * off by default (the brief optimizes for players; organizer is the
 * secondary, opt-in role). See useStoredUserPrincipal for why
 * useSyncExternalStore rather than a useState lazy initializer (same
 * SSR/hydration hazard applies here).
 */
export function useStoredIsOrganizer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setStoredIsOrganizer(value: boolean): void {
  window.localStorage.setItem(IS_ORGANIZER_STORAGE_KEY, String(value));
  window.dispatchEvent(new StorageEvent("storage"));
}
