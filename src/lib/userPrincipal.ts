// No real auth yet — see docs/decisions/0004-user-principal-identity.md.
// The remembered principal is stored client-side so the stub identity
// field doesn't need retyping on every visit. Shared between any
// component that needs to read or write it (EventDetails' RSVP form,
// MyEvents' "whose events" field) so the key itself has one source of
// truth.
export const USER_PRINCIPAL_STORAGE_KEY = "gameNight.userPrincipal";

export function getStoredUserPrincipal(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USER_PRINCIPAL_STORAGE_KEY) ?? "";
}
