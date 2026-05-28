import { KeyBinding, KeymapPreset, StringName } from "./types";
import { noteToFrequency } from "./notes";

interface BindingSeed {
  stringName: StringName;
  key: string;
  note: string;
  positionLabel: string;
}

const DEFAULT_BINDING_SEEDS: BindingSeed[] = [
  { stringName: "C", key: "5", note: "C2", positionLabel: "空弦" },
  { stringName: "C", key: "4", note: "D2", positionLabel: "一指" },
  { stringName: "C", key: "3", note: "D#2", positionLabel: "二指" },
  { stringName: "C", key: "2", note: "E2", positionLabel: "三指" },
  { stringName: "C", key: "1", note: "F2", positionLabel: "四指" },
  { stringName: "G", key: "T", note: "G2", positionLabel: "空弦" },
  { stringName: "G", key: "R", note: "A2", positionLabel: "一指" },
  { stringName: "G", key: "E", note: "A#2", positionLabel: "二指" },
  { stringName: "G", key: "W", note: "B2", positionLabel: "三指" },
  { stringName: "G", key: "Q", note: "C3", positionLabel: "四指" },
  { stringName: "D", key: "G", note: "D3", positionLabel: "空弦" },
  { stringName: "D", key: "F", note: "E3", positionLabel: "一指" },
  { stringName: "D", key: "D", note: "F3", positionLabel: "二指" },
  { stringName: "D", key: "S", note: "F#3", positionLabel: "三指" },
  { stringName: "D", key: "A", note: "G3", positionLabel: "四指" },
  { stringName: "A", key: "B", note: "A3", positionLabel: "空弦" },
  { stringName: "A", key: "V", note: "B3", positionLabel: "一指" },
  { stringName: "A", key: "C", note: "C4", positionLabel: "二指" },
  { stringName: "A", key: "X", note: "C#4", positionLabel: "三指" },
  { stringName: "A", key: "Z", note: "D4", positionLabel: "四指" },
];

export const STRING_ORDER: StringName[] = ["C", "G", "D", "A"];

export function normalizeKey(key: string): string {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function createDefaultBindings(): KeyBinding[] {
  return DEFAULT_BINDING_SEEDS.map((seed) => ({
    ...seed,
    id: `${seed.stringName}-${seed.note}`,
    frequency: noteToFrequency(seed.note),
  }));
}

export function createDefaultPreset(): KeymapPreset {
  return {
    name: "Default cello layout",
    bindings: createDefaultBindings(),
    updatedAt: new Date().toISOString(),
  };
}

export function findDuplicateKey(
  bindings: KeyBinding[],
  key: string,
  ignoredBindingId?: string,
): KeyBinding | undefined {
  const normalizedKey = normalizeKey(key);
  return bindings.find(
    (binding) =>
      binding.id !== ignoredBindingId &&
      normalizeKey(binding.key) === normalizedKey,
  );
}

export function updateBindingKey(
  bindings: KeyBinding[],
  bindingId: string,
  nextKey: string,
): KeyBinding[] {
  const normalizedKey = normalizeKey(nextKey);
  const duplicate = findDuplicateKey(bindings, normalizedKey, bindingId);

  if (duplicate) {
    throw new Error(`${normalizedKey} is already assigned to ${duplicate.note}`);
  }

  return bindings.map((binding) =>
    binding.id === bindingId ? { ...binding, key: normalizedKey } : binding,
  );
}

export function selectHighestPressedBinding(
  pressedKeys: Iterable<string>,
  bindingsByKey: Map<string, KeyBinding>,
): KeyBinding | null {
  let selectedBinding: KeyBinding | null = null;

  for (const key of pressedKeys) {
    const binding = bindingsByKey.get(normalizeKey(key));
    if (!binding) continue;

    if (!selectedBinding || binding.frequency > selectedBinding.frequency) {
      selectedBinding = binding;
    }
  }

  return selectedBinding;
}

export function supportsVibrato(binding: KeyBinding | null): boolean {
  return Boolean(binding && binding.positionLabel !== "空弦");
}

export function getDisplayBindingsForString(
  bindings: KeyBinding[],
  stringName: StringName,
): KeyBinding[] {
  return bindings
    .filter((binding) => binding.stringName === stringName)
    .sort((left, right) => right.frequency - left.frequency);
}

export function getFingeredBindingIds(
  bindings: KeyBinding[],
  activeBinding: KeyBinding | null,
): Set<string> {
  if (!activeBinding) {
    return new Set();
  }

  return new Set(
    bindings
      .filter((binding) => {
        const isSameString = binding.stringName === activeBinding.stringName;
        const isBelowOrAtActive = binding.frequency <= activeBinding.frequency;
        const isNaturalOrOpen = !binding.note.includes("#") && !binding.note.includes("b");

        return (
          isSameString &&
          isBelowOrAtActive &&
          (isNaturalOrOpen || binding.id === activeBinding.id)
        );
      })
      .map((binding) => binding.id),
  );
}
