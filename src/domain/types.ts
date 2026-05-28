export type StringName = "C" | "G" | "D" | "A";

export type BowDirection = "down" | "up";

export interface KeyBinding {
  id: string;
  stringName: StringName;
  key: string;
  note: string;
  frequency: number;
  positionLabel: string;
}

export interface KeymapPreset {
  name: string;
  bindings: KeyBinding[];
  updatedAt: string;
}
