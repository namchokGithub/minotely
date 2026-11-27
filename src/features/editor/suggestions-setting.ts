const enabledKey = (uid: string) => `minotely:suggestions-enabled:${uid}`;

/** Inline Autocomplete on this device for this account (D53); on unless turned off. */
export function getSuggestionsEnabled(uid: string): boolean {
  try {
    return localStorage.getItem(enabledKey(uid)) !== "false";
  } catch {
    return true;
  }
}

export function saveSuggestionsEnabled(uid: string, enabled: boolean): boolean {
  try {
    localStorage.setItem(enabledKey(uid), String(enabled));
    return true;
  } catch {
    return false;
  }
}
