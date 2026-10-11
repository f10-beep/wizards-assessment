"use client";

import { useSyncExternalStore } from "react";

// No real auth yet — see docs/decisions/0005-user-principal-identity.md.
// The remembered principal is stored client-side so the stub identity
// field doesn't need retyping on every visit.
export const USER_PRINCIPAL_STORAGE_KEY = "gameNight.userPrincipal";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot(): string {
  return window.localStorage.getItem(USER_PRINCIPAL_STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

/**
 * The remembered principal, read directly from localStorage rather than
 * duplicated into component state — "" during SSR and the client's first
 * (hydration) render, then the real stored value afterward once
 * useSyncExternalStore re-subscribes client-side. Mirroring localStorage
 * into a useState lazy initializer instead would make the client's first
 * render disagree with the server's whenever a principal is already
 * remembered, which is a hydration-mismatch error for any component that
 * branches rendered text on it (see EventDetails/MyEvents history).
 * Shared between the RSVP form and "My events" so both read/write the
 * same key consistently.
 */
export function useStoredUserPrincipal(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Same as useStoredUserPrincipal, trimmed — every consumer except
 * StubAuthBar's own raw, editable input field wants the trimmed form (an
 * identity key, not display text being typed), so trim once here instead
 * of at each call site.
 */
export function useStoredTrimmedUserPrincipal(): string {
  return useStoredUserPrincipal().trim();
}

export function setStoredUserPrincipal(principal: string): void {
  window.localStorage.setItem(USER_PRINCIPAL_STORAGE_KEY, principal);
  // The native "storage" event only fires in *other* tabs, not this one —
  // dispatch it manually so this tab's own useSyncExternalStore subscriber
  // picks up the change immediately too.
  window.dispatchEvent(new StorageEvent("storage"));
}
