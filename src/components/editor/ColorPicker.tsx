"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";

// ─── Color conversion helpers ───────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return [255, 255, 255];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let hh = 0;
  if (d !== 0) {
    if (max === rr) hh = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) hh = ((bb - rr) / d + 2) / 6;
    else hh = ((rr - gg) / d + 4) / 6;
  }
  return [hh * 360, s * 100, v * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hh = h / 60, ss = s / 100, vv = v / 100;
  const i = Math.floor(hh) % 6;
  const f = hh - Math.floor(hh);
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);
  const table: Array<[number, number, number]> = [
    [vv, t, p], [q, vv, p], [p, vv, t],
    [p, q, vv], [t, p, vv], [vv, p, q],
  ];
  const [r, g, b] = table[i] ?? [vv, vv, vv];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hsvToHex(h: number, s: number, v: number): string {
  return rgbToHex(...hsvToRgb(h, s, v));
}

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColorPickerProps {
  /** Current color value (HEX string, e.g. "#ff0000") */
  color: string;
  /** Called with new HEX color whenever user makes a change */
  onChange: (hex: string) => void;
  /** Called when the user wants to close the picker */
  onClose: () => void;
  /** Ref of the button that triggered the picker – used to position it */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Label shown in the picker header, e.g. "Fill Color" */
  label?: string;
}

// ─── Drag hook ────────────────────────────────────────────────────────────────

function useDrag(
  onMove: (e: MouseEvent) => void,
  onEnd?: () => void
) {
  return useCallback(
    (startEvent: React.MouseEvent) => {
      startEvent.preventDefault();
      startEvent.stopPropagation();

      const move = (e: MouseEvent) => onMove(e);
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        onEnd?.();
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMove]
  );
}

// ─── ColorPicker component ────────────────────────────────────────────────────

export function ColorPicker({
  color,
  onChange,
  onClose,
  triggerRef,
  label = "Colour picker",
}: ColorPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // ── Parse initial color ──────────────────────────────────────────────────
  const parseColor = (c: string): [number, number, number] => {
    const hex = isValidHex(c) ? c : "#ffffff";
    const [r, g, b] = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  };

  const [hsv, setHsv] = useState<[number, number, number]>(() =>
    parseColor(color)
  );
  const [hexInput, setHexInput] = useState(
    isValidHex(color) ? color.toLowerCase() : "#ffffff"
  );
  const [rgbInput, setRgbInput] = useState<[string, string, string]>(() => {
    const [r, g, b] = hsvToRgb(...(parseColor(color) as [number, number, number]));
    return [String(r), String(g), String(b)];
  });
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const [h, s, v] = hsv;

  // ── Sync when parent color changes ──────────────────────────────────────
  useEffect(() => {
    if (!isValidHex(color)) return;
    const [r, g, b] = hexToRgb(color);
    const newHsv = rgbToHsv(r, g, b);
    setHsv(newHsv);
    setHexInput(color.toLowerCase());
    const [nr, ng, nb] = hsvToRgb(...(newHsv as [number, number, number]));
    setRgbInput([String(nr), String(ng), String(nb)]);
  }, [color]);

  // ── Position picker near trigger ─────────────────────────────────────────
  useLayoutEffect(() => {
    const W = 290, H = 420;
    if (triggerRef?.current) {
      const r = triggerRef.current.getBoundingClientRect();
      let left = r.left - W - 14;
      if (left < 8) left = r.right + 14;
      if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
      let top = r.top;
      if (top + H > window.innerHeight - 8) top = window.innerHeight - H - 8;
      if (top < 8) top = 8;
      setPosition({ top, left });
    } else {
      setPosition({
        top: window.innerHeight / 2 - H / 2,
        left: window.innerWidth / 2 - W / 2,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close on click outside ───────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (
          !containerRef.current?.contains(t) &&
          !triggerRef?.current?.contains(t)
        ) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, 100);
    return () => clearTimeout(id);
  }, [onClose, triggerRef]);

  // ── Escape key to close ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Commit color change ──────────────────────────────────────────────────
  const commitColor = useCallback(
    (newH: number, newS: number, newV: number) => {
      const hex = hsvToHex(newH, newS, newV);
      setHsv([newH, newS, newV]);
      setHexInput(hex.toLowerCase());
      const [r, g, b] = hsvToRgb(newH, newS, newV);
      setRgbInput([String(r), String(g), String(b)]);
      onChange(hex);
    },
    [onChange]
  );

  // ── SV canvas interaction ─────────────────────────────────────────────────
  const handleSvMove = useCallback(
    (e: MouseEvent) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ns = clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100;
      const nv = (1 - clamp((e.clientY - rect.top) / rect.height, 0, 1)) * 100;
      commitColor(h, ns, nv);
    },
    [h, commitColor]
  );

  const startSvDrag = useDrag(handleSvMove);

  const handleSvMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ns = clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100;
    const nv = (1 - clamp((e.clientY - rect.top) / rect.height, 0, 1)) * 100;
    commitColor(h, ns, nv);
    startSvDrag(e);
  };

  // ── Hue slider interaction ────────────────────────────────────────────────
  const handleHueMove = useCallback(
    (e: MouseEvent) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nh = clamp((e.clientY - rect.top) / rect.height, 0, 1) * 360;
      commitColor(nh, s, v);
    },
    [s, v, commitColor]
  );

  const startHueDrag = useDrag(handleHueMove);

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nh = clamp((e.clientY - rect.top) / rect.height, 0, 1) * 360;
    commitColor(nh, s, v);
    startHueDrag(e);
  };

  // ── HEX input ─────────────────────────────────────────────────────────────
  const handleHexChange = (val: string) => {
    setHexInput(val);
    const clean = val.trim();
    if (isValidHex(clean)) {
      const [r, g, b] = hexToRgb(clean);
      const newHsv = rgbToHsv(r, g, b);
      setHsv(newHsv);
      setRgbInput([String(r), String(g), String(b)]);
      onChange(clean);
    }
  };

  // ── RGB input ─────────────────────────────────────────────────────────────
  const handleRgbChange = (channel: 0 | 1 | 2, val: string) => {
    const next: [string, string, string] = [...rgbInput];
    next[channel] = val;
    setRgbInput(next);
    const nums = next.map(Number);
    if (nums.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
      const [r, g, b] = nums as [number, number, number];
      const newHsv = rgbToHsv(r, g, b);
      setHsv(newHsv);
      const hex = rgbToHex(r, g, b);
      setHexInput(hex.toLowerCase());
      onChange(hex);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(hsvToHex(h, s, v)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const currentHex = hsvToHex(h, s, v);
  const hueOnlyColor = `hsl(${h},100%,50%)`;
  const [curR, curG, curB] = hsvToRgb(h, s, v);

  const posStyle: React.CSSProperties = position
    ? { position: "fixed", top: position.top, left: position.left, zIndex: 2147483647 }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 2147483647 };

  if (typeof document === "undefined") return null;

  // ─── Figma-style dark theme ───────────────────────────────────────────────
  const dark = "#1e1e1e";
  const dark2 = "#2c2c2c";
  const dark3 = "#3a3a3a";
  const textPrimary = "#e8e8e8";
  const textMuted = "#888";
  const accent = "#0d99ff";

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        ...posStyle,
        width: 290,
        background: dark,
        borderRadius: 10,
        boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
        fontFamily: "Inter,-apple-system,system-ui,sans-serif",
        border: `1px solid ${dark3}`,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 8px", borderBottom: `1px solid ${dark3}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Color preview swatch */}
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: `conic-gradient(${currentHex} 0deg 180deg, #ffffff 180deg 360deg)`,
            border: `1.5px solid ${dark3}`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: textMuted, fontFamily: "monospace" }}>{currentHex.toUpperCase()}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close colour picker"
          style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 4, borderRadius: 4, display: "flex", alignItems: "center", lineHeight: 1 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Main picker area: SV canvas + vertical hue slider ── */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px 8px" }}>
        {/* SV canvas */}
        <div
          ref={svRef}
          onMouseDown={handleSvMouseDown}
          style={{
            flex: 1, height: 200,
            position: "relative", cursor: "crosshair",
            borderRadius: 6, overflow: "hidden",
            background: hueOnlyColor,
            backgroundImage: "linear-gradient(to right,#fff,transparent),linear-gradient(to top,#000,transparent)",
            border: `1px solid ${dark3}`,
            touchAction: "none",
          }}
        >
          {/* Cursor ring */}
          <div style={{
            position: "absolute",
            left: `${s}%`, top: `${100 - v}%`,
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
            transform: "translate(-50%,-50%)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Vertical hue slider */}
        <div
          ref={hueRef}
          onMouseDown={handleHueMouseDown}
          style={{
            width: 16, height: 200,
            position: "relative", cursor: "ns-resize",
            borderRadius: 8,
            background: "linear-gradient(to bottom,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
            border: `1px solid ${dark3}`,
            flexShrink: 0,
            touchAction: "none",
          }}
        >
          {/* Hue thumb */}
          <div style={{
            position: "absolute",
            left: "50%", top: `${(h / 360) * 100}%`,
            width: 20, height: 8,
            borderRadius: 4,
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            transform: "translate(-50%,-50%)",
            pointerEvents: "none",
            border: `1px solid ${dark3}`,
          }} />
        </div>
      </div>

      {/* ── Color preview + copy ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 10px" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          backgroundColor: currentHex,
          border: `1.5px solid ${dark3}`, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Preview</div>
          <div style={{ fontSize: 11, color: textPrimary, fontFamily: "monospace" }}>{currentHex.toUpperCase()}</div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy HEX"}
          style={{
            background: copied ? accent : dark2, border: `1px solid ${dark3}`,
            cursor: "pointer", padding: "6px 8px", borderRadius: 5,
            color: copied ? "#fff" : textMuted, display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, transition: "all 0.15s",
          }}
        >
          {copied
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          }
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* ── Inputs: HEX + RGB ── */}
      <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* HEX input */}
        <div>
          <label style={{ fontSize: 9, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>Hex</label>
          <div style={{ display: "flex", alignItems: "center", background: dark2, border: `1px solid ${dark3}`, borderRadius: 6, overflow: "hidden" }}>
            <span style={{ color: textMuted, padding: "0 0 0 9px", fontSize: 13, fontFamily: "monospace", lineHeight: 1 }}>#</span>
            <input
              type="text"
              value={hexInput.replace(/^#/, "")}
              onChange={(e) => handleHexChange("#" + e.target.value)}
              onFocus={(e) => { setHexInput(currentHex); e.target.select(); }}
              onBlur={() => setHexInput(currentHex.toLowerCase())}
              onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } else e.stopPropagation(); }}
              onKeyUp={(e) => e.stopPropagation()}
              aria-label="Hex colour"
              maxLength={6}
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 12, fontFamily: "monospace", color: textPrimary,
                padding: "7px 8px 7px 4px", outline: "none",
                caretColor: accent,
              }}
            />
          </div>
        </div>

        {/* RGB inputs */}
        <div>
          <label style={{ fontSize: 9, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>RGB</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
            {(["R", "G", "B"] as const).map((ch, i) => (
              <div key={ch}>
                <div style={{ background: dark2, border: `1px solid ${dark3}`, borderRadius: 6, overflow: "hidden" }}>
                  <input
                    type="number"
                    min={0} max={255}
                    value={rgbInput[i]}
                    onChange={(e) => handleRgbChange(i as 0 | 1 | 2, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => setRgbInput([String(curR), String(curG), String(curB)])}
                    onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } else e.stopPropagation(); }}
                    onKeyUp={(e) => e.stopPropagation()}
                    aria-label={`${ch} channel`}
                    style={{
                      width: "100%", border: "none", background: "transparent",
                      fontSize: 12, fontFamily: "monospace", color: textPrimary,
                      padding: "7px 6px", outline: "none", textAlign: "center",
                      caretColor: accent, WebkitAppearance: "none", MozAppearance: "textfield",
                    }}
                  />
                </div>
                <div style={{ textAlign: "center", fontSize: 9, color: textMuted, marginTop: 2 }}>{ch}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HSL display (read-only) */}
        <div>
          <label style={{ fontSize: 9, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>HSL</label>
          <div style={{ background: dark2, border: `1px solid ${dark3}`, borderRadius: 6, padding: "6px 9px", display: "flex", justifyContent: "space-between" }}>
            {(() => {
              // HSV -> HSL
              const ss = s / 100, vv = v / 100;
              const l = vv * (1 - ss / 2);
              const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
              return [
                `${Math.round(h)}°`,
                `${Math.round(sl * 100)}%`,
                `${Math.round(l * 100)}%`,
              ].map((val, i) => (
                <span key={i} style={{ fontSize: 11, fontFamily: "monospace", color: textPrimary }}>{val}</span>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
