import { createDefaultPreset } from "./keymap";
import { KeymapPreset } from "./types";

export const KEYMAP_STORAGE_KEY = "cello-simulator:keymap";

export function loadKeymapPreset(
  storage: Storage = window.localStorage,
): KeymapPreset {
  const rawPreset = storage.getItem(KEYMAP_STORAGE_KEY);

  if (!rawPreset) {
    return createDefaultPreset();
  }

  try {
    const preset = JSON.parse(rawPreset) as KeymapPreset;

    if (!Array.isArray(preset.bindings)) {
      return createDefaultPreset();
    }

    return preset;
  } catch {
    return createDefaultPreset();
  }
}

export function saveKeymapPreset(
  preset: KeymapPreset,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(KEYMAP_STORAGE_KEY, JSON.stringify(preset));
}

export function clearSavedKeymap(storage: Storage = window.localStorage): void {
  storage.removeItem(KEYMAP_STORAGE_KEY);
}
