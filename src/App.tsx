import {
  Keyboard,
  MousePointerClick,
  RotateCcw,
  Save,
  Volume2,
  Waves,
} from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "./domain/audioEngine";
import {
  STRING_ORDER,
  createDefaultPreset,
  findDuplicateKey,
  getDisplayBindingsForString,
  getFingeredBindingIds,
  normalizeKey,
  selectHighestPressedBinding,
  supportsVibrato,
  updateBindingKey,
} from "./domain/keymap";
import { KeyBinding, KeymapPreset, BowDirection } from "./domain/types";
import { clearSavedKeymap, loadKeymapPreset, saveKeymapPreset } from "./domain/storage";

type EditingState = {
  bindingId: string;
  message: string;
};

type BowTracking = {
  pointerId: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  bowDirection: BowDirection;
};

const RESERVED_KEYS = new Set(["Space"]);
const MIN_BOW_INTENSITY = 0.04;

export function App() {
  const [preset, setPreset] = useState<KeymapPreset>(() => loadKeymapPreset());
  const [savedStatus, setSavedStatus] = useState("已载入");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [activeBindingId, setActiveBindingId] = useState<string | null>(null);
  const [bowDirection, setBowDirection] = useState<BowDirection | null>(null);
  const [bowIntensity, setBowIntensity] = useState(0);
  const [vibratoActive, setVibratoActive] = useState(false);
  const [volume, setVolume] = useState(0.7);

  const audioEngine = useRef<AudioEngine>();
  const pressedKeys = useRef<Set<string>>(new Set());
  const activeBindingIdRef = useRef<string | null>(activeBindingId);
  const activeBindingRef = useRef<KeyBinding | null>(null);
  const bindingsRef = useRef<KeyBinding[]>(preset.bindings);
  const editingRef = useRef<EditingState | null>(editing);
  const bowTracking = useRef<BowTracking | null>(null);

  const bindingsByKey = useMemo(() => {
    return new Map(
      preset.bindings.map((binding) => [normalizeKey(binding.key), binding]),
    );
  }, [preset.bindings]);

  const activeBinding = useMemo(
    () => preset.bindings.find((binding) => binding.id === activeBindingId) ?? null,
    [activeBindingId, preset.bindings],
  );

  const fingeredBindingIds = useMemo(
    () => getFingeredBindingIds(preset.bindings, activeBinding),
    [activeBinding, preset.bindings],
  );

  useEffect(() => {
    audioEngine.current = new AudioEngine();
  }, []);

  useEffect(() => {
    activeBindingIdRef.current = activeBindingId;
  }, [activeBindingId]);

  useEffect(() => {
    activeBindingRef.current = activeBinding;
    if (!supportsVibrato(activeBinding)) {
      setVibratoActive(false);
      audioEngine.current?.setVibrato(false);
    }
  }, [activeBinding]);

  useEffect(() => {
    bindingsRef.current = preset.bindings;
  }, [preset.bindings]);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    audioEngine.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = normalizeKey(event.key);

      if (editingRef.current) {
        handleRebind(key);
        event.preventDefault();
        return;
      }

      if (key === "Space") {
        const canVibrate = supportsVibrato(activeBindingRef.current);
        setVibratoActive(canVibrate);
        audioEngine.current?.setVibrato(canVibrate);
        if (!canVibrate) {
          setSavedStatus("空弦不支持揉弦");
        }
        event.preventDefault();
        return;
      }

      const binding = bindingsByKey.get(key);
      if (!binding) return;

      pressedKeys.current.add(key);
      setActiveBindingId(
        selectHighestPressedBinding(pressedKeys.current, bindingsByKey)?.id ?? null,
      );
      event.preventDefault();
    };

    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      const key = normalizeKey(event.key);

      if (key === "Space") {
        setVibratoActive(false);
        audioEngine.current?.setVibrato(false);
        event.preventDefault();
        return;
      }

      pressedKeys.current.delete(key);
      setActiveBindingId(
        selectHighestPressedBinding(pressedKeys.current, bindingsByKey)?.id ?? null,
      );
    };

    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [bindingsByKey]);

  function handleRebind(nextKey: string) {
    if (!editingRef.current) return;

    if (nextKey === "Escape") {
      setEditing(null);
      return;
    }

    if (RESERVED_KEYS.has(nextKey)) {
      setEditing((current) =>
        current ? { ...current, message: `${nextKey} 已用于揉弦` } : current,
      );
      return;
    }

    try {
      const nextBindings = updateBindingKey(
        bindingsRef.current,
        editingRef.current.bindingId,
        nextKey,
      );
      setPreset((current) => ({
        ...current,
        bindings: nextBindings,
        updatedAt: new Date().toISOString(),
      }));
      setEditing(null);
      setSavedStatus("有未保存修改");
    } catch (error) {
      setEditing((current) =>
        current
          ? {
              ...current,
              message:
                error instanceof Error ? error.message : `${nextKey} 已被占用`,
            }
          : current,
      );
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button === 1) return;
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();

    if (!activeBinding) {
      setSavedStatus("先按一个左手键位");
      return;
    }

    const direction: BowDirection = event.button === 2 ? "up" : "down";
    bowTracking.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      bowDirection: direction,
    };
    setBowDirection(direction);
    setBowIntensity(0);
    setSavedStatus("按住并移动弓区发声");
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const tracking = bowTracking.current;
    if (!tracking || tracking.pointerId !== event.pointerId) return;

    event.preventDefault();

    const elapsedMs = Math.max(event.timeStamp - tracking.lastTime, 8);
    const distance = Math.hypot(
      event.clientX - tracking.lastX,
      event.clientY - tracking.lastY,
    );
    const speedPxPerMs = distance / elapsedMs;
    const intensity = Math.min(Math.max(speedPxPerMs / 0.9, 0), 1);

    bowTracking.current = {
      ...tracking,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
    };

    setBowIntensity(intensity);

    if (intensity < MIN_BOW_INTENSITY) {
      audioEngine.current?.updateBow({
        intensity: 0,
        bowDirection: tracking.bowDirection,
      });
      return;
    }

    const binding = activeBindingRef.current;
    if (!binding) {
      setSavedStatus("先按一个左手键位");
      return;
    }

    audioEngine.current?.startNote(binding, tracking.bowDirection, intensity);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button === 1 &&
      bowTracking.current?.pointerId !== event.pointerId
    ) {
      return;
    }
    event.preventDefault();
    bowTracking.current = null;
    setBowDirection(null);
    setBowIntensity(0);
    audioEngine.current?.stopNote();
  }

  function handleSave() {
    const nextPreset = {
      ...preset,
      name: "Custom cello layout",
      updatedAt: new Date().toISOString(),
    };
    saveKeymapPreset(nextPreset);
    setPreset(nextPreset);
    setSavedStatus("已保存");
  }

  function handleReset() {
    clearSavedKeymap();
    pressedKeys.current.clear();
    setPreset(createDefaultPreset());
    setActiveBindingId(null);
    setBowDirection(null);
    setBowIntensity(0);
    setEditing(null);
    setSavedStatus("已恢复默认");
  }

  return (
    <main className="app-shell">
      <section className="stage" aria-label="Cello simulator">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cello Simulator</p>
            <h1>大提琴模拟器</h1>
          </div>
          <div className="toolbar" aria-label="Keymap actions">
            <label className="volume-control" title="音量">
              <Volume2 size={18} aria-hidden="true" />
              <input
                aria-label="音量"
                min="0"
                max="1"
                step="0.01"
                type="range"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
            <button type="button" onClick={handleSave} title="保存布局">
              <Save size={18} aria-hidden="true" />
              保存
            </button>
            <button type="button" onClick={handleReset} title="恢复默认布局">
              <RotateCcw size={18} aria-hidden="true" />
              默认
            </button>
          </div>
        </header>

        <section className="play-surface-grid">
          <div
            className="bow-pad"
            role="button"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(event) => event.preventDefault()}
            aria-label="弓弦演奏区"
          >
            <div className="bow-pad-inner">
              <MousePointerClick size={32} aria-hidden="true" />
              <div>
                <span className="metric-label">右手</span>
                <strong>
                  {bowDirection === "down"
                    ? `左键下弓 ${Math.round(bowIntensity * 100)}%`
                    : bowDirection === "up"
                      ? `右键上弓 ${Math.round(bowIntensity * 100)}%`
                      : "按住移动"}
                </strong>
              </div>
            </div>
            <div className="bow-lines" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="status-panel" aria-live="polite">
            <div className="status-item">
              <Keyboard size={20} aria-hidden="true" />
              <span>
                <span className="metric-label">左手</span>
                <strong>
                  {activeBinding
                    ? `${activeBinding.stringName} 弦 ${activeBinding.note}`
                    : "未选定"}
                </strong>
              </span>
            </div>
            <div className="status-item">
              <Waves size={20} aria-hidden="true" />
              <span>
                <span className="metric-label">揉弦</span>
                <strong>{vibratoActive ? "开启" : "关闭"}</strong>
              </span>
            </div>
            <p className="status-text">{editing?.message ?? savedStatus}</p>
          </div>
        </section>

        <section className="fingerboard" aria-label="键位布局">
          {STRING_ORDER.map((stringName) => (
            <div className="string-row" key={stringName}>
              <div className="string-name">{stringName}</div>
              <div className="binding-strip">
                {getDisplayBindingsForString(preset.bindings, stringName)
                  .map((binding) => {
                    const duplicate = findDuplicateKey(
                      preset.bindings,
                      binding.key,
                      binding.id,
                    );
                    const isActive = binding.id === activeBindingId;
                    const isFingered = fingeredBindingIds.has(binding.id);
                    const isEditing = binding.id === editing?.bindingId;

                    return (
                      <button
                        className={[
                          "binding-button",
                          isFingered ? "is-fingered" : "",
                          isActive ? "is-active" : "",
                          isEditing ? "is-editing" : "",
                          duplicate ? "has-conflict" : "",
                        ].join(" ")}
                        key={binding.id}
                        type="button"
                        title={`修改 ${binding.note} 键位`}
                        onClick={() =>
                          setEditing({
                            bindingId: binding.id,
                            message: "按下新的键位，Esc 取消",
                          })
                        }
                      >
                        <span className="keycap">
                          {isEditing ? "..." : binding.key}
                        </span>
                        <span className="note-name">{binding.note}</span>
                        <span className="position-name">{binding.positionLabel}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
