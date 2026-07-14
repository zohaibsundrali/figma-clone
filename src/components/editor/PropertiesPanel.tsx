"use client";

import React, { useEffect, useState, useRef } from "react";
import { ColorPicker } from "./ColorPicker";
import { useEditorContext } from "./EditorContext";
import {
  renderPlaintextFromRichText,
  type TLShape,
  type Editor
} from "tldraw";
import {
  Settings2,
  ChevronDown,
  ChevronUp,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Maximize2,
  Type,
  Palette,
  Plus,
  Compass,
  FileText,
  Pipette,
  List,
  ListOrdered,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Upload,
  LayoutGrid,
  ArrowRight,
  Minus,
  X,
} from "lucide-react";
import {
  isAutoLayoutContainer,
  getAutoLayoutConfig,
  applyAutoLayout,
  removeAutoLayout,
  updateAutoLayoutConfig,
  type LayoutDirection,
  type LayoutAlignment,
  type LayoutDistribution,
  type SizingMode,
} from "@/lib/auto-layout-engine";

// Standard Figma Colors
const COLOR_MAP: Record<string, string> = {
  black: "#1E1E1E",
  grey: "#7B889B",
  "light-violet": "#D4C5FF",
  violet: "#9C80FF",
  blue: "#0D99FF",
  "light-blue": "#8CD3FF",
  yellow: "#FFD000",
  orange: "#FF9000",
  green: "#10B981",
  "light-green": "#A7F3D0",
  "light-red": "#FCA5A5",
  red: "#EF4444",
  white: "#FFFFFF",
};

// Font-weight list
const WEIGHTS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

const FONT_WEIGHT_MAP: Record<string, string[]> = {
  "Inter": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Roboto": ["100", "300", "400", "500", "700", "900"],
  "Poppins": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Montserrat": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Open Sans": ["300", "400", "500", "600", "700", "800"],
  "Arial": ["400", "700"],
};

class FontStore {
  private db: IDBDatabase | null = null;

  async init() {
    if (this.db) return;
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported."));
        return;
      }
      const request = indexedDB.open("figma-custom-fonts-db", 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("fonts")) {
          db.createObjectStore("fonts", { keyPath: "name" });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveFont(name: string, dataUrl: string, type: string) {
    try {
      await this.init();
      return new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction("fonts", "readwrite");
        const store = tx.objectStore("fonts");
        store.put({ name, dataUrl, type });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async getAllFonts(): Promise<Array<{ name: string; dataUrl: string; type: string }>> {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction("fonts", "readonly");
        const store = tx.objectStore("fonts");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async deleteFont(name: string) {
    try {
      await this.init();
      return new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction("fonts", "readwrite");
        const store = tx.objectStore("fonts");
        store.delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(err);
    }
  }
}
const fontStore = new FontStore();

async function loadCustomFontInBrowser(name: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  const id = `custom-font-style-${name.replace(/\s+/g, "-").toLowerCase()}`;
  let styleEl = document.getElementById(id) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = id;
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @font-face {
      font-family: '${name}';
      src: url('${dataUrl}') format('${dataUrl.includes("woff2") ? "woff2" : dataUrl.includes("woff") ? "woff" : "truetype"}');
    }
  `;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let hStr = hex.replace("#", "").trim();
  if (hStr === "transparent" || !hStr) {
    return { h: 0, s: 0, v: 100 };
  }
  if (hStr.length === 3) {
    hStr = hStr.split("").map((c) => c + c).join("");
  }
  if (hStr.length === 8) {
    hStr = hStr.substring(0, 6);
  }
  const r = (parseInt(hStr.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(hStr.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(hStr.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else if (max === b) {
      h = ((r - g) / d + 4) / 6;
    }
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; }
  else if (hh >= 1 && hh < 2) { r = x; g = c; }
  else if (hh >= 2 && hh < 3) { g = c; b = x; }
  else if (hh >= 3 && hh < 4) { g = x; b = c; }
  else if (hh >= 4 && hh < 5) { r = x; b = c; }
  else if (hh >= 5 && hh < 6) { r = c; b = x; }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

// Plain text <-> TipTap JSON helpers
// Build TipTap/ProseMirror JSON directly to avoid HTML whitespace-collapsing issues
function textToRichText(_editor: Editor, text: string) {
  // Split on newlines to create paragraphs
  const lines = text.split("\n");
  const content = lines.map((line) => {
    if (line.length === 0) {
      // Empty paragraph (blank line)
      return { type: "paragraph" };
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: line }],
    };
  });
  return { type: "doc", content };
}

function richTextToText(editor: Editor, richText: any): string {
  if (!richText) return "";
  try {
    return renderPlaintextFromRichText(editor, richText);
  } catch {
    if (!richText.content) return "";
    return richText.content
      .map((p: any) => {
        if (!p.content) return "";
        return p.content.map((t: any) => t.text || "").join("");
      })
      .join("\n");
  }
}

function applyListFormat(text: string, type: "bullet" | "number" | "none"): string {
  const lines = text.split("\n");
  if (type === "none") {
    return lines.map((line) => line.replace(/^(\s*[-•*]\s*|\s*\d+\.\s*)/, "")).join("\n");
  }

  const cleanLines = lines.map((line) => line.replace(/^(\s*[-•*]\s*|\s*\d+\.\s*)/, ""));

  if (type === "bullet") {
    return cleanLines.map((line) => `• ${line}`).join("\n");
  } else {
    return cleanLines.map((line, idx) => `${idx + 1}. ${line}`).join("\n");
  }
}

export function PropertiesPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const { editor } = useEditorContext();
  const [selectedShapes, setSelectedShapes] = useState<TLShape[]>([]);
  const [fontSearch, setFontSearch] = useState("");
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [googleFontInput, setGoogleFontInput] = useState("");
  const [activeColorPicker, setActiveColorPicker] = useState<"color" | "backgroundColor" | "strokeColor" | "shadowColor" | null>(null);

  // Refs for color picker trigger buttons (used for fixed positioning)
  const colorPickerBtnRef = useRef<HTMLButtonElement>(null);
  const bgColorPickerBtnRef = useRef<HTMLButtonElement>(null);
  const strokeColorPickerBtnRef = useRef<HTMLButtonElement>(null);
  const shadowColorPickerBtnRef = useRef<HTMLButtonElement>(null);

  // Prevent spacebar and hotkey conflicts with tldraw when editing properties panel inputs
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== "checkbox" && target.type !== "radio")
      ) {
        if (e.key === " ") {
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKey, true);
    window.addEventListener("keyup", handleGlobalKey, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKey, true);
      window.removeEventListener("keyup", handleGlobalKey, true);
    };
  }, []);

  // Load custom fonts on component mount
  useEffect(() => {
    async function loadAllFonts() {
      try {
        const list = await fontStore.getAllFonts();
        const names: string[] = [];
        for (const f of list) {
          await loadCustomFontInBrowser(f.name, f.dataUrl);
          names.push(f.name);
        }
        const storedGFonts = localStorage.getItem("figma-custom-google-fonts");
        if (storedGFonts) {
          const gNames = JSON.parse(storedGFonts) as string[];
          names.push(...gNames);
        }
        setCustomFonts(names);
      } catch (err) {
        console.error("Failed to load custom fonts:", err);
      }
    }
    loadAllFonts();
  }, []);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // 1. Load JSZip from CDN
      const JSZip: any = await new Promise((resolve, reject) => {
        if ((window as any).JSZip) {
          resolve((window as any).JSZip);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        script.onload = () => resolve((window as any).JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
      });

      const zip = await JSZip.loadAsync(file);
      const fontFiles: string[] = [];

      for (const relativePath of Object.keys(zip.files)) {
        const zipEntry = zip.files[relativePath];
        if (zipEntry.dir) continue;

        const lowercasePath = relativePath.toLowerCase();
        if (
          lowercasePath.endsWith(".ttf") ||
          lowercasePath.endsWith(".otf") ||
          lowercasePath.endsWith(".woff") ||
          lowercasePath.endsWith(".woff2")
        ) {
          const content = await zipEntry.async("uint8array");
          const ext = lowercasePath.substring(lowercasePath.lastIndexOf("."));
          const mimeType = ext === ".woff2" ? "font/woff2" : ext === ".woff" ? "font/woff" : "font/ttf";

          const baseName = relativePath.substring(relativePath.lastIndexOf("/") + 1, relativePath.lastIndexOf("."));
          const cleanName = baseName.replace(/[-_]/g, " ");

          const blob = new Blob([content], { type: mimeType });
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolveRead) => {
            reader.onload = () => resolveRead(reader.result as string);
            reader.readAsDataURL(blob);
          });

          await fontStore.saveFont(cleanName, dataUrl, mimeType);
          await loadCustomFontInBrowser(cleanName, dataUrl);

          fontFiles.push(cleanName);
        }
      }

      if (fontFiles.length > 0) {
        setCustomFonts((prev) => {
          const next = [...fontFiles, ...prev];
          return Array.from(new Set(next));
        });

        updateMetaProp("fontFamily", fontFiles[0]);
        alert(`Successfully imported ${fontFiles.length} font(s) from ZIP!`);
      } else {
        alert("No font files (.ttf, .otf, .woff, .woff2) found in the ZIP archive.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process ZIP file.");
    }
  };

  const handleImportGoogleFont = () => {
    const fontName = googleFontInput.trim();
    if (!googleFontInput.trim()) return;

    const formattedName = fontName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    const id = `google-font-${formattedName.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(formattedName)}:ital,wght@0,100..900;1,100..900&display=swap`;
      document.head.appendChild(link);
    }

    setCustomFonts((prev) => {
      const next = [formattedName, ...prev];
      return Array.from(new Set(next));
    });

    const storedGFonts = localStorage.getItem("figma-custom-google-fonts");
    const gList = storedGFonts ? JSON.parse(storedGFonts) as string[] : [];
    if (!gList.includes(formattedName)) {
      gList.push(formattedName);
      localStorage.setItem("figma-custom-google-fonts", JSON.stringify(gList));
    }

    updateMetaProp("fontFamily", formattedName);
    setGoogleFontInput("");
    alert(`Google Font "${formattedName}" imported and applied successfully!`);
  };

  const handleRemoveCustomFont = async (name: string) => {
    try {
      // 1. Remove from local storage list if it's a Google Font
      const storedGFonts = localStorage.getItem("figma-custom-google-fonts");
      if (storedGFonts) {
        const gList = JSON.parse(storedGFonts) as string[];
        const updatedList = gList.filter((n) => n !== name);
        localStorage.setItem("figma-custom-google-fonts", JSON.stringify(updatedList));
      }

      // Remove Google Font link tag from DOM if exists
      const gLink = document.getElementById(`google-font-${name.replace(/\s+/g, "-").toLowerCase()}`);
      if (gLink) gLink.remove();

      // 2. Remove from IndexedDB if it was uploaded from ZIP
      await fontStore.deleteFont(name);

      // Remove local custom font face style tag from DOM if exists
      const customStyle = document.getElementById(`custom-font-style-${name.replace(/\s+/g, "-").toLowerCase()}`);
      if (customStyle) customStyle.remove();

      // 3. Update React state
      setCustomFonts((prev) => prev.filter((n) => n !== name));

      // 4. Reset selected shapes fontFamily to Inter if they were using this font
      if (sharedFontFamily === name) {
        updateMetaProp("fontFamily", "Inter");
      }
    } catch (err) {
      console.error("Failed to remove font:", err);
      alert("An error occurred while removing the font.");
    }
  };

  // Collapsible panels state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    layout: false,
    autoLayout: true,
    content: false,
    typography: false,
    fill: false,
    background: false,
    stroke: false,
    effects: false,
    advanced: true,
  });

  // Recent colors picker
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("figma-recent-colors");
      if (stored) {
        setRecentColors(JSON.parse(stored));
      } else {
        setRecentColors(["#1E1E1E", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF", "#FFFFFF"]);
      }
    }
  }, []);

  const saveRecentColor = (color: string) => {
    if (!color || recentColors.includes(color)) return;
    const updated = [color, ...recentColors.slice(0, 13)];
    setRecentColors(updated);
    localStorage.setItem("figma-recent-colors", JSON.stringify(updated));
  };

  useEffect(() => {
    if (!editor) return;
    const ed = editor;

    function update() {
      // Find all selected shapes
      const selected = ed.getSelectedShapes();
      setSelectedShapes(selected);
    }

    update();
    const cleanup = ed.store.listen(update, { scope: "document" });
    return cleanup;
  }, [editor]);

  // Close font dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    const loadingView = <div className="p-3 text-xs text-muted">Loading...</div>;
    if (embedded) return loadingView;
    return (
      <aside className="flex w-[280px] flex-col border-l border-border bg-surface">
        <div className="flex h-10 items-center gap-2 border-b border-border px-3 bg-surface">
          <Settings2 className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium text-foreground">Properties</span>
        </div>
        {loadingView}
      </aside>
    );
  }

  if (selectedShapes.length === 0) {
    const emptyView = (
      <div className="flex-grow p-4 text-xs text-muted flex items-center justify-center text-center h-full">
        Select elements on the canvas to edit properties.
      </div>
    );
    if (embedded) return emptyView;
    return (
      <aside className="flex w-[280px] flex-col border-l border-border bg-surface h-full">
        <div className="flex h-10 items-center gap-2 border-b border-border px-3 bg-surface">
          <Settings2 className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium text-foreground">Properties</span>
        </div>
        {emptyView}
      </aside>
    );
  }

  // Filter text shapes in selection
  const textShapes = selectedShapes.filter((s) => s.type === "text");
  const hasTextInSelection = textShapes.length > 0;

  // Toggle collapses
  const toggleCollapse = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper: read shared property across selection
  function getSharedProp<T>(readFn: (shape: TLShape) => T, defaultValue: T): T | "Mixed" {
    const val = readFn(selectedShapes[0]);
    const allSame = selectedShapes.every((s) => readFn(s) === val);
    return allSame ? val : "Mixed";
  }

  // Helper: read shared meta property
  function getSharedMetaProp<T>(key: string, defaultValue: T): T | "Mixed" {
    const val = (selectedShapes[0].meta as any)?.[key] ?? defaultValue;
    const allSame = selectedShapes.every((s) => {
      const sVal = (s.meta as any)?.[key] ?? defaultValue;
      return sVal === val;
    });
    return allSame ? val : "Mixed";
  }

  // Helper: update property for selection
  function updateProp(key: string, value: unknown) {
    if (!editor) return;
    editor.markHistoryStoppingPoint(`change-property-${key}`);
    editor.updateShapes(
      selectedShapes.map((s) => {
        if (key === "x") return { id: s.id, type: s.type, x: value as number };
        if (key === "y") return { id: s.id, type: s.type, y: value as number };
        if (key === "rotation") return { id: s.id, type: s.type, rotation: value as number };
        if (key === "opacity") return { id: s.id, type: s.type, opacity: value as number };

        return {
          id: s.id,
          type: s.type,
          props: {
            ...s.props,
            [key]: value,
          },
        };
      }) as any
    );
  }

  // Helper: update meta property for selection
  function updateMetaProp(key: string, value: unknown) {
    if (!editor) return;
    editor.markHistoryStoppingPoint(`change-meta-${key}`);
    editor.updateShapes(
      selectedShapes.map((s) => ({
        id: s.id,
        type: s.type,
        meta: {
          ...s.meta,
          [key]: value,
        },
      })) as any
    );
  }

  // Multi-update values helper
  function updateMetaProps(updates: Record<string, unknown>) {
    if (!editor) return;
    editor.markHistoryStoppingPoint("change-multiple-meta");
    editor.updateShapes(
      selectedShapes.map((s) => ({
        id: s.id,
        type: s.type,
        meta: {
          ...s.meta,
          ...updates,
        },
      })) as any
    );
  }

  function updateAlign(align: "start" | "middle" | "end" | "justify") {
    if (!editor) return;
    const tldrawAlign = align === "justify" ? "start" : align;
    editor.markHistoryStoppingPoint("change-text-alignment");
    editor.updateShapes(
      selectedShapes.map((s) => ({
        id: s.id,
        type: s.type,
        props: {
          ...s.props,
          textAlign: tldrawAlign,
        },
        meta: {
          ...s.meta,
          textAlign: align,
        },
      })) as any
    );
  }

  // 1. Layout values
  const sharedX = getSharedProp((s) => Math.round(s.x), 0);
  const sharedY = getSharedProp((s) => Math.round(s.y), 0);
  const sharedW = getSharedProp((s) => ("w" in s.props ? Math.round(s.props.w as number) : 0), 0);
  const sharedH = getSharedProp((s) => ("h" in s.props ? Math.round(s.props.h as number) : 0), 0);
  const sharedRotation = getSharedProp(
    (s) => Math.round((s.rotation * 180) / Math.PI),
    0
  );

  // 2. Content values (text layers only)
  const sharedText = getSharedProp((s) => {
    if (s.type === "text") {
      return richTextToText(editor, s.props.richText);
    }
    return "";
  }, "");

  // 3. Typography values
  const sharedFontFamily = getSharedMetaProp("fontFamily", "Inter");
  const sharedFontSize = getSharedMetaProp("fontSize", 16);
  const sharedFontWeight = getSharedMetaProp("fontWeight", "normal");
  const sharedFontStyle = getSharedMetaProp("fontStyle", "normal");
  const sharedTextDecoration = getSharedMetaProp("textDecoration", "none");
  const sharedTextCase = getSharedMetaProp("textCase", "none");
  const sharedLineHeight = getSharedMetaProp("lineHeight", "1.3");
  const sharedLetterSpacing = getSharedMetaProp("letterSpacing", "normal");
  const sharedParagraphSpacing = getSharedMetaProp("paragraphSpacing", 0);
  const sharedParagraphIndentation = getSharedMetaProp("paragraphIndentation", 0);

  // Alignments (use native tldraw props for text shapes, overriden by meta)
  const sharedAlign = getSharedProp((s) => (s.meta as any)?.textAlign || (s.props as any).textAlign || "start", "start");
  const sharedVerticalAlign = getSharedMetaProp("verticalAlign", "middle");

  // Advanced fields
  const sharedResizeMode = getSharedMetaProp("resizeMode", "auto-width");
  const sharedTextDirection = getSharedMetaProp("direction", "ltr");
  const sharedTextOverflow = getSharedMetaProp("overflow", "visible");

  // 4. Fill values (Text color / general color)
  const sharedColor = getSharedMetaProp("color", "#FFFFFF");
  const sharedOpacity = getSharedProp((s) => s.opacity, 1);

  // 5. Background values
  const sharedBgColor = getSharedMetaProp("backgroundColor", "transparent");
  const sharedBgPaddingX = getSharedMetaProp("bgPaddingX", 0);
  const sharedBgPaddingY = getSharedMetaProp("bgPaddingY", 0);
  const sharedBgRadius = getSharedMetaProp("bgRadius", 0);

  // 6. Stroke values
  const sharedStrokeEnabled = getSharedMetaProp("strokeEnabled", false);
  const sharedStrokeColor = getSharedMetaProp("strokeColor", "#7c3aed");
  const sharedStrokeWidth = getSharedMetaProp("strokeWidth", 1);

  // 7. Effects values
  const sharedShadowEnabled = getSharedMetaProp("shadowEnabled", false);
  const sharedShadowX = getSharedMetaProp("shadowX", 0);
  const sharedShadowY = getSharedMetaProp("shadowY", 4);
  const sharedShadowBlur = getSharedMetaProp("shadowBlur", 10);
  const sharedShadowColor = getSharedMetaProp("shadowColor", "rgba(0,0,0,0.25)");

  // Fonts source list
  const FONTS = ["Inter", "Arial", "Roboto", "Poppins", "Montserrat", "Open Sans"];
  const allFontsList = Array.from(new Set([...customFonts, ...FONTS]));
  const filteredFonts = allFontsList.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()));

  // Trigger Eyedropper API
  const handleEyedropper = async (target: "color" | "bg" | "stroke") => {
    if (typeof window === "undefined" || !("EyeDropper" in window)) {
      alert("Eyedropper tool is not supported by your browser.");
      return;
    }
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const hex = result.sRGBHex;
        saveRecentColor(hex);
        if (target === "color") updateMetaProp("color", hex);
        if (target === "bg") updateMetaProp("backgroundColor", hex);
        if (target === "stroke") updateMetaProp("strokeColor", hex);
      }
    } catch (e) {
      console.warn("Eyedropper cancelled or failed:", e);
    }
  };

  return (
    <div className="flex-grow overflow-y-auto bg-surface select-none pb-10 text-foreground">

      {/* 1. LAYOUT SECTION */}
      <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
        <button
          onClick={() => toggleCollapse("layout")}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
          aria-label="Toggle Layout Section"
        >
          <span className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            <span>Layout</span>
          </span>
          {collapsed.layout ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {!collapsed.layout && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* X position */}
              <div className="flex items-center space-x-2">
          <span className="text-[10px] text-muted/80 w-3 font-mono">X</span>
                <input
                  type="number"
                  aria-label="X position"
                  value={sharedX === "Mixed" ? "" : sharedX}
                  placeholder={sharedX === "Mixed" ? "Mixed" : ""}
                  onChange={(e) => updateProp("x", Number(e.target.value))}
                  className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                />
              </div>

              {/* Y position */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-muted/80 w-3 font-mono">Y</span>
                <input
                  type="number"
                  aria-label="Y position"
                  value={sharedY === "Mixed" ? "" : sharedY}
                  placeholder={sharedY === "Mixed" ? "Mixed" : ""}
                  onChange={(e) => updateProp("y", Number(e.target.value))}
                  className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                />
              </div>

              {/* Width */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-muted/80 w-3 font-mono">W</span>
                <input
                  type="number"
                  aria-label="Width"
                  disabled={(sharedResizeMode as any) === "auto-width"}
                  value={sharedW === "Mixed" ? "" : sharedW}
                  placeholder={(sharedResizeMode as any) === "auto-width" ? "Auto" : sharedW === "Mixed" ? "Mixed" : ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateProp("w", val);
                    updateMetaProp("fixedWidth", val);
                  }}
                  className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none disabled:opacity-40"
                />
              </div>

              {/* Height */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-muted/80 w-3 font-mono">H</span>
                <input
                  type="number"
                  aria-label="Height"
                  disabled={(sharedResizeMode as any) === "auto-width" || (sharedResizeMode as any) === "auto-height" || sharedResizeMode === "Mixed"}
                  value={sharedH === "Mixed" ? "" : sharedH}
                  placeholder={(sharedResizeMode as any) !== "fixed" ? "Auto" : sharedH === "Mixed" ? "Mixed" : ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateProp("h", val);
                    updateMetaProp("fixedHeight", val);
                  }}
                  className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none disabled:opacity-40"
                />
              </div>
            </div>

            {/* Rotation and Depth actions */}
            <div className="flex items-center justify-between gap-4 pt-1.5">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[10px] text-muted font-mono">Rot</span>
                <div className="relative w-full">
                  <input
                    type="number"
                    aria-label="Rotation angle"
                    value={sharedRotation === "Mixed" ? "" : sharedRotation}
                    placeholder={sharedRotation === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => {
                      const deg = Number(e.target.value);
                      updateProp("rotation", (deg * Math.PI) / 180);
                    }}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] pl-2 pr-5 py-[5px] focus:border-accent outline-none"
                  />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">°</span>
                </div>
              </div>

              {/* Depth order controls */}
              <div className="flex items-center gap-1 bg-surface-elevated border border-border rounded p-0.5">
                <button
                  onClick={() => editor.bringForward(selectedShapes.map((s) => s.id))}
                  title="Bring Forward"
                  className="p-1 rounded text-muted hover:text-foreground hover:bg-border/40 transition-colors"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => editor.sendBackward(selectedShapes.map((s) => s.id))}
                  title="Send Backward"
                  className="p-1 rounded text-muted hover:text-foreground hover:bg-border/40 transition-colors"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => editor.bringToFront(selectedShapes.map((s) => s.id))}
                  title="Bring to Front"
                  className="px-1.5 py-0.5 text-[9px] font-bold text-muted hover:text-foreground hover:bg-border/40 rounded transition-colors"
                >
                  Front
                </button>
                <button
                  onClick={() => editor.sendToBack(selectedShapes.map((s) => s.id))}
                  title="Send to Back"
                  className="px-1.5 py-0.5 text-[9px] font-bold text-muted hover:text-foreground hover:bg-border/40 rounded transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AUTO LAYOUT SECTION */}
      {(() => {
        // Show auto layout controls if a group is selected
        const groupShapes = selectedShapes.filter((s) => s.type === "group");
        const hasGroup = groupShapes.length > 0;
        const firstGroup = groupShapes[0];
        const isAutoLayout = firstGroup ? isAutoLayoutContainer(firstGroup) : false;
        const autoConfig = firstGroup ? getAutoLayoutConfig(firstGroup) : null;

        if (!hasGroup) return null;

        return (
          <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
            <button
              onClick={() => toggleCollapse("autoLayout")}
              className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
              aria-label="Toggle Auto Layout Section"
            >
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 text-blue-400" />
                <span>Auto Layout</span>
              </span>
              {collapsed.autoLayout ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {!collapsed.autoLayout && (
              <div className="space-y-3">
                {/* Toggle Auto Layout */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted font-semibold">Enable Auto Layout</span>
                  <input
                    type="checkbox"
                    checked={isAutoLayout}
                    onChange={(e) => {
                      if (!editor || !firstGroup) return;
                      if (e.target.checked) {
                        applyAutoLayout(editor, firstGroup.id);
                      } else {
                        removeAutoLayout(editor, firstGroup.id);
                      }
                    }}
                    className="rounded border-border bg-surface-elevated text-accent focus:ring-accent accent-accent"
                  />
                </div>

                {isAutoLayout && autoConfig && (
                  <>
                    {/* Direction */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-semibold">Direction</span>
                      <div className="flex items-center gap-1 bg-surface-elevated p-0.5 border border-border rounded">
                        <button
                          onClick={() => updateAutoLayoutConfig(editor, firstGroup.id, { direction: "horizontal" })}
                          className={`flex-1 py-1.5 rounded flex justify-center items-center gap-1 text-[10px] font-medium hover:bg-border/40 transition-colors ${
                            autoConfig.direction === "horizontal" ? "bg-accent text-white" : "text-muted"
                          }`}
                        >
                          <ArrowRight className="h-3 w-3" />
                          Horizontal
                        </button>
                        <button
                          onClick={() => updateAutoLayoutConfig(editor, firstGroup.id, { direction: "vertical" })}
                          className={`flex-1 py-1.5 rounded flex justify-center items-center gap-1 text-[10px] font-medium hover:bg-border/40 transition-colors ${
                            autoConfig.direction === "vertical" ? "bg-accent text-white" : "text-muted"
                          }`}
                        >
                          <ArrowDown className="h-3 w-3" />
                          Vertical
                        </button>
                      </div>
                    </div>

                    {/* Gap */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-semibold">Gap</span>
                      <input
                        type="number"
                        min={0}
                        value={autoConfig.gap}
                        onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { gap: Math.max(0, Number(e.target.value)) })}
                        className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                      />
                    </div>

                    {/* Padding */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-semibold">Padding</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted w-4">Top</span>
                          <input
                            type="number"
                            min={0}
                            value={autoConfig.paddingTop}
                            onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { paddingTop: Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted w-4">Rt</span>
                          <input
                            type="number"
                            min={0}
                            value={autoConfig.paddingRight}
                            onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { paddingRight: Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted w-4">Bot</span>
                          <input
                            type="number"
                            min={0}
                            value={autoConfig.paddingBottom}
                            onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { paddingBottom: Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted w-4">Lt</span>
                          <input
                            type="number"
                            min={0}
                            value={autoConfig.paddingLeft}
                            onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { paddingLeft: Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2 py-[5px] focus:border-accent outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-semibold">Alignment</span>
                      <div className="flex items-center gap-0.5 bg-surface-elevated p-0.5 border border-border rounded">
                        {(["start", "center", "end", "stretch"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateAutoLayoutConfig(editor, firstGroup.id, { alignment: align })}
                            className={`flex-1 py-1 text-[9px] font-bold rounded hover:bg-border/40 transition-colors capitalize ${
                              autoConfig.alignment === align ? "bg-accent text-white" : "text-muted"
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Distribution */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-semibold">Distribution</span>
                      <div className="flex items-center gap-1 bg-surface-elevated p-0.5 border border-border rounded">
                        <button
                          onClick={() => updateAutoLayoutConfig(editor, firstGroup.id, { distribution: "packed" })}
                          className={`flex-1 py-1.5 text-[10px] font-medium rounded hover:bg-border/40 transition-colors ${
                            autoConfig.distribution === "packed" ? "bg-accent text-white" : "text-muted"
                          }`}
                        >
                          Packed
                        </button>
                        <button
                          onClick={() => updateAutoLayoutConfig(editor, firstGroup.id, { distribution: "space-between" })}
                          className={`flex-1 py-1.5 text-[10px] font-medium rounded hover:bg-border/40 transition-colors ${
                            autoConfig.distribution === "space-between" ? "bg-accent text-white" : "text-muted"
                          }`}
                        >
                          Space Between
                        </button>
                      </div>
                    </div>

                    {/* Wrap */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted font-semibold">Wrap</span>
                      <input
                        type="checkbox"
                        checked={autoConfig.wrap}
                        onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { wrap: e.target.checked })}
                        className="rounded border-border bg-surface-elevated text-accent focus:ring-accent accent-accent"
                      />
                    </div>

                    {/* Sizing Modes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-semibold">Width</span>
                        <select
                          value={autoConfig.widthMode}
                          onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { widthMode: e.target.value as SizingMode })}
                          className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                        >
                          <option value="hug">Hug Contents</option>
                          <option value="fixed">Fixed</option>
                          <option value="fill">Fill Container</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-semibold">Height</span>
                        <select
                          value={autoConfig.heightMode}
                          onChange={(e) => updateAutoLayoutConfig(editor, firstGroup.id, { heightMode: e.target.value as SizingMode })}
                          className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                        >
                          <option value="hug">Hug Contents</option>
                          <option value="fixed">Fixed</option>
                          <option value="fill">Fill Container</option>
                        </select>
                      </div>
                    </div>

                    {/* Remove Auto Layout */}
                    <button
                      onClick={() => {
                        if (!editor || !firstGroup) return;
                        removeAutoLayout(editor, firstGroup.id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded hover:bg-red-500/10 text-red-400 transition-colors border border-border/40"
                    >
                      <X className="h-3 w-3" />
                      Remove Auto Layout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. CONTENT SECTION */}
      <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
        <button
          onClick={() => toggleCollapse("content")}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
          aria-label="Toggle Content Section"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Content</span>
          </span>
          {collapsed.content ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {!collapsed.content && (
          <textarea
            aria-label="Edit text content"
            value={sharedText === "Mixed" ? "" : sharedText}
            placeholder={sharedText === "Mixed" ? "Mixed Values" : "Type text content..."}
            onChange={(e) => {
              const text = e.target.value;
              editor.markHistoryStoppingPoint("change-text-content");
              editor.updateShapes(
                selectedShapes.map((s) => {
                  if (s.type === "text") {
                    return {
                      id: s.id,
                      type: s.type,
                      props: {
                        ...s.props,
                        richText: textToRichText(editor, text),
                      },
                    };
                  } else if ("text" in s.props) {
                    return {
                      id: s.id,
                      type: s.type,
                      props: {
                        ...s.props,
                        text,
                      },
                    };
                  }
                  return s;
                }) as any
              );
            }}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            rows={2}
            className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] p-2 focus:border-accent outline-none resize-none"
          />
        )}
      </div>

      {/* 3. TYPOGRAPHY SECTION */}
      {hasTextInSelection && (
        <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
          <button
            onClick={() => toggleCollapse("typography")}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
            aria-label="Toggle Typography Section"
          >
            <span className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              <span>Typography</span>
            </span>
            {collapsed.typography ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {!collapsed.typography && (
            <div className="space-y-3">
              {/* Searchable Font Family Selector */}
              <div className="space-y-1 relative" ref={fontDropdownRef}>
                <span className="text-[10px] text-muted font-semibold">Font Family</span>
                <div
                  onClick={() => setShowFontDropdown(!showFontDropdown)}
                  className="flex items-center justify-between bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2.5 py-[5px] cursor-pointer hover:border-accent/60 transition-colors"
                >
                  <span className="text-foreground font-medium">{sharedFontFamily === "Mixed" ? "Mixed" : sharedFontFamily}</span>
                  <ChevronDown className="h-3 w-3 text-muted" />
                </div>

                {showFontDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface-elevated border border-border rounded-md shadow-xl z-50 overflow-hidden w-64">
                    <input
                      type="text"
                      aria-label="Search fonts"
                      placeholder="Search font..."
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface border-b border-border text-xs px-2.5 py-2 outline-none text-foreground"
                    />

                    {/* Import Controls Section */}
                    <div className="p-2 border-b border-border bg-surface/50 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Import Fonts</div>

                      {/* Google Font Inline Import */}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          aria-label="Google Font Name"
                          placeholder="Google Font Name (e.g. Lobster)"
                          value={googleFontInput}
                          onChange={(e) => setGoogleFontInput(e.target.value)}
                          className="flex-1 bg-surface border border-border text-[10px] px-1.5 py-1 rounded text-foreground outline-none focus:border-accent"
                        />
                        <button
                          onClick={handleImportGoogleFont}
                          className="bg-accent hover:bg-accent-hover text-white p-1 rounded transition-colors"
                          title="Import from Google Fonts"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* ZIP/File Upload */}
                      <label className="flex items-center justify-center gap-1.5 bg-surface border border-dashed border-border hover:border-accent/60 px-2 py-1 rounded cursor-pointer transition-colors text-[10px] text-muted hover:text-foreground">
                        <Upload className="h-3 w-3 text-muted" />
                        <span>Upload font (.zip)</span>
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleZipUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="max-h-40 overflow-y-auto">
                      {filteredFonts.map((f, idx) => {
                        const isCustom = customFonts.includes(f);
                        const customCountInResults = customFonts.filter(cf => cf.toLowerCase().includes(fontSearch.toLowerCase())).length;
                        const showDivider = idx === customCountInResults && customCountInResults > 0;

                        return (
                          <React.Fragment key={f}>
                            {showDivider && <div className="border-t border-border/40 my-1" />}
                            <div
                              onClick={() => {
                                updateMetaProp("fontFamily", f);
                                setShowFontDropdown(false);
                                setFontSearch("");
                              }}
                              className={`px-3 py-2 text-xs hover:bg-accent hover:text-white cursor-pointer transition-colors flex items-center justify-between ${sharedFontFamily === f ? "text-accent font-semibold" : "text-foreground"
                                }`}
                              style={{ fontFamily: f }}
                            >
                              <span>{f}</span>
                              {isCustom && (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[8px] px-1 py-0.5 bg-accent/20 text-accent rounded font-sans uppercase font-bold">Imported</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveCustomFont(f);
                                    }}
                                    className="p-1 hover:bg-red-500/20 text-muted hover:text-red-500 rounded transition-colors"
                                    title={`Delete ${f}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                      {filteredFonts.length === 0 && (
                        <div className="p-2 text-xs text-muted text-center">No fonts found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Font Style & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Weight</span>
                  <select
                    aria-label="Font weight"
                    value={sharedFontWeight === "Mixed" ? "" : sharedFontWeight}
                    onChange={(e) => updateMetaProp("fontWeight", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                  >
                    {sharedFontWeight === "Mixed" && <option value="">Mixed</option>}
                    {/* Render weights based on selected font family */}
                    {(FONT_WEIGHT_MAP[sharedFontFamily === "Mixed" ? "Inter" : sharedFontFamily] || FONT_WEIGHT_MAP["Inter"]).map((wVal) => {
                      const wObj = WEIGHTS.find((wt) => wt.value === wVal) || { value: wVal, label: wVal };
                      return (
                        <option key={wVal} value={wVal}>
                          {wObj.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Style</span>
                  <select
                    aria-label="Font style"
                    value={sharedFontStyle === "Mixed" ? "" : sharedFontStyle}
                    onChange={(e) => updateMetaProp("fontStyle", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                  >
                    {sharedFontStyle === "Mixed" && <option value="">Mixed</option>}
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                  </select>
                </div>
              </div>

              {/* Font Size & Alignments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Size</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const current = typeof sharedFontSize === "number" ? sharedFontSize : 16;
                        updateMetaProp("fontSize", Math.max(1, current - 1));
                      }}
                      title="Decrease font size"
                      className="p-1 bg-surface-elevated hover:bg-border/40 border border-border rounded-[4px] text-muted hover:text-foreground transition-colors text-[11px] font-semibold leading-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      aria-label="Font size"
                      value={sharedFontSize === "Mixed" ? "" : sharedFontSize}
                      placeholder={sharedFontSize === "Mixed" ? "Mixed" : ""}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        updateMetaProp("fontSize", val);
                      }}
                      className="w-full text-center bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] py-[5px] focus:border-accent outline-none"
                    />
                    <button
                      onClick={() => {
                        const current = typeof sharedFontSize === "number" ? sharedFontSize : 16;
                        updateMetaProp("fontSize", current + 1);
                      }}
                      title="Increase font size"
                      className="p-1 bg-surface-elevated hover:bg-border/40 border border-border rounded-[4px] text-muted hover:text-foreground transition-colors text-[11px] font-semibold leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold block mb-1">Align</span>
                  <div className="flex items-center gap-0.5 bg-surface-elevated p-0.5 border border-border rounded-[4px]">
                    <button
                      onClick={() => updateAlign("start")}
                      className={`flex-1 py-1 rounded-[3px] flex justify-center hover:bg-border/40 transition-colors ${sharedAlign === "start" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Align Left"
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => updateAlign("middle")}
                      className={`flex-1 py-1 rounded-[3px] flex justify-center hover:bg-border/40 transition-colors ${sharedAlign === "middle" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Align Center"
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => updateAlign("end")}
                      className={`flex-1 py-1 rounded-[3px] flex justify-center hover:bg-border/40 transition-colors ${sharedAlign === "end" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Align Right"
                    >
                      <AlignRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => updateAlign("justify")}
                      className={`flex-1 py-1 rounded-[3px] flex justify-center hover:bg-border/40 transition-colors ${sharedAlign === "justify" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Justify"
                    >
                      <AlignJustify className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Height & Letter Spacing */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Line Height</span>
                  <input
                    type="text"
                    aria-label="Line height"
                    value={sharedLineHeight === "Mixed" ? "" : sharedLineHeight}
                    placeholder={sharedLineHeight === "Mixed" ? "Mixed" : "e.g. 130% or 1.3"}
                    onChange={(e) => updateMetaProp("lineHeight", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Letter Spacing</span>
                  <input
                    type="text"
                    aria-label="Letter spacing"
                    value={sharedLetterSpacing === "Mixed" ? "" : sharedLetterSpacing}
                    placeholder={sharedLetterSpacing === "Mixed" ? "Mixed" : "e.g. 10% or 2px"}
                    onChange={(e) => updateMetaProp("letterSpacing", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
              </div>

              {/* Paragraph Spacing & Indentation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Paragraph Spacing</span>
                  <input
                    type="number"
                    aria-label="Paragraph spacing"
                    value={sharedParagraphSpacing === "Mixed" ? "" : sharedParagraphSpacing}
                    placeholder={sharedParagraphSpacing === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => updateMetaProp("paragraphSpacing", Number(e.target.value))}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Paragraph Indent</span>
                  <input
                    type="number"
                    aria-label="Paragraph indentation"
                    value={sharedParagraphIndentation === "Mixed" ? "" : sharedParagraphIndentation}
                    placeholder={sharedParagraphIndentation === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => updateMetaProp("paragraphIndentation", Number(e.target.value))}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
              </div>

              {/* Vertical Alignment & Text Decorations */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Vertical Align</span>
                  <select
                    aria-label="Vertical alignment"
                    value={sharedVerticalAlign === "Mixed" ? "" : sharedVerticalAlign}
                    onChange={(e) => updateMetaProp("verticalAlign", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                  >
                    {sharedVerticalAlign === "Mixed" && <option value="">Mixed</option>}
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold block mb-1">Decoration</span>
                  <div className="flex items-center gap-1 p-0.5 bg-surface-elevated border border-border rounded-[4px]">
                    <button
                      onClick={() => updateMetaProp("textDecoration", "none")}
                      className={`flex-1 py-1 text-[9px] font-bold rounded hover:bg-border/40 transition-colors ${(sharedTextDecoration as any) === "none" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="None"
                    >
                      None
                    </button>
                    <button
                      onClick={() => updateMetaProp("textDecoration", "underline")}
                      className={`flex-1 py-1 text-[9px] font-bold rounded hover:bg-border/40 transition-colors ${(sharedTextDecoration as any) === "underline" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Underline"
                    >
                      <u>U</u>
                    </button>
                    <button
                      onClick={() => updateMetaProp("textDecoration", "line-through")}
                      className={`flex-1 py-1 text-[9px] font-bold rounded hover:bg-border/40 transition-colors ${(sharedTextDecoration as any) === "line-through" ? "bg-accent text-white" : "text-muted"
                        }`}
                      title="Strikethrough"
                    >
                      <s>S</s>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. FILL (COLOR) SECTION */}
      <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
        <button
          onClick={() => toggleCollapse("fill")}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
          aria-label="Toggle Fill Color Section"
        >
          <span className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            <span>Fill</span>
          </span>
          {collapsed.fill ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {!collapsed.fill && (
          <div className="space-y-3">
            {/* Color Swatch / Quick Select */}
            <div className="grid grid-cols-7 gap-1">
              {Object.keys(COLOR_MAP).map((c) => {
                const isSelected = sharedColor === COLOR_MAP[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      saveRecentColor(COLOR_MAP[c]);
                      updateMetaProp("color", COLOR_MAP[c]);
                      // Sync with default tldraw color if applicable
                      const tldrawCol = Object.keys(COLOR_MAP).find(k => COLOR_MAP[k] === COLOR_MAP[c]);
                      if (tldrawCol) {
                        updateProp("color", tldrawCol);
                      }
                    }}
                    title={c}
                    className={`h-[18px] w-[18px] rounded-full border shadow-sm transition-transform hover:scale-110 ${isSelected ? "border-accent ring-2 ring-accent/30 scale-105" : "border-border/60"
                      }`}
                    style={{ backgroundColor: COLOR_MAP[c] }}
                  />
                );
              })}
            </div>

            {/* Custom Color Input, Opacity & Eyedropper */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    aria-label="Custom Hex Color"
                    value={sharedColor === "Mixed" ? "" : sharedColor}
                    placeholder={sharedColor === "Mixed" ? "Mixed" : "#FFFFFF"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("#") && (val.length === 4 || val.length === 7)) {
                        updateMetaProp("color", val);
                      }
                    }}
                    className="w-full bg-surface-elevated text-[11px] text-foreground font-mono border border-border rounded-[4px] pl-8 pr-2.5 py-[5px] focus:border-accent outline-none"
                  />
                  <button
                    ref={colorPickerBtnRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColorPicker(activeColorPicker === "color" ? null : "color");
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: sharedColor === "Mixed" ? "transparent" : sharedColor }}
                    title="Open Color Picker"
                  />
                  {activeColorPicker === "color" && (
                    <ColorPicker
                      color={sharedColor === "Mixed" ? "#FFFFFF" : sharedColor}
                      onChange={(c) => updateMetaProp("color", c)}
                      onClose={() => setActiveColorPicker(null)}
                      triggerRef={colorPickerBtnRef}
                    />
                  )}
                </div>

                {/* Browser Eyedropper */}
                {typeof window !== "undefined" && "EyeDropper" in window && (
                  <button
                    onClick={() => handleEyedropper("color")}
                    title="Pick Color"
                    className="p-1.5 bg-surface-elevated hover:bg-border/40 border border-border rounded text-muted hover:text-foreground transition-colors"
                  >
                    <Pipette className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Opacity slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px] font-semibold text-muted">
                  <span>Opacity</span>
                  <span className="font-mono text-accent font-semibold">
                    {sharedOpacity === "Mixed" ? "Mixed" : `${Math.round(sharedOpacity * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Layer Opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sharedOpacity === "Mixed" ? 1 : sharedOpacity}
                  onChange={(e) => updateProp("opacity", Number(e.target.value))}
                  className="w-full h-1 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>

            {/* Saved Recent Colors */}
            {recentColors.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                <span className="text-[10px] text-muted font-semibold block">Recent Colors</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentColors.map((col, idx) => (
                    <button
                      key={`${col}-${idx}`}
                      onClick={() => updateMetaProp("color", col)}
                      className="h-4 w-4 rounded border border-border/60 hover:scale-110 transition-transform"
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setRecentColors([]);
                      localStorage.setItem("figma-recent-colors", JSON.stringify([]));
                    }}
                    title="Clear Recent"
                    className="p-0.5 rounded text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. BACKGROUND (TEXT HIGHLIGHT) SECTION */}
      {hasTextInSelection && (
        <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
          <button
            onClick={() => toggleCollapse("background")}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
            aria-label="Toggle Text Background Highlight Section"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-orange-400" />
              <span>Background</span>
            </span>
            {collapsed.background ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {!collapsed.background && (
            <div className="space-y-3.5">
              {/* Bg Color selector */}
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    aria-label="Background Color"
                    value={sharedBgColor === "Mixed" ? "" : sharedBgColor}
                    placeholder={sharedBgColor === "Mixed" ? "Mixed" : "transparent / #HEX"}
                    onChange={(e) => updateMetaProp("backgroundColor", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] text-foreground font-mono border border-border rounded-[4px] pl-8 pr-2 py-[5px] focus:border-accent outline-none"
                  />
                  <button
                    ref={bgColorPickerBtnRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColorPicker(activeColorPicker === "backgroundColor" ? null : "backgroundColor");
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: sharedBgColor === "Mixed" ? "transparent" : sharedBgColor }}
                    title="Open Color Picker"
                  />
                  {activeColorPicker === "backgroundColor" && (
                    <ColorPicker
                      color={sharedBgColor === "Mixed" || sharedBgColor === "transparent" ? "#FFFFFF" : sharedBgColor}
                      onChange={(c) => updateMetaProp("backgroundColor", c)}
                      onClose={() => setActiveColorPicker(null)}
                      triggerRef={bgColorPickerBtnRef}
                    />
                  )}
                </div>

                <button
                  onClick={() => handleEyedropper("bg")}
                  title="Pick Color"
                  className="p-1.5 bg-surface-elevated hover:bg-border/40 border border-border rounded text-muted hover:text-foreground transition-colors"
                >
                  <Pipette className="h-4 w-4" />
                </button>

                <button
                  onClick={() => updateMetaProp("backgroundColor", "transparent")}
                  title="Remove Background Color"
                  className="p-1.5 bg-surface-elevated hover:bg-red-950 border border-border rounded text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Background padding & corner radius */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold block">Pad X</span>
                  <input
                    type="number"
                    aria-label="Horizontal background padding"
                    min={0}
                    value={sharedBgPaddingX === "Mixed" ? "" : sharedBgPaddingX}
                    placeholder={sharedBgPaddingX === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => updateMetaProp("bgPaddingX", Math.max(0, Number(e.target.value)))}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold block">Pad Y</span>
                  <input
                    type="number"
                    aria-label="Vertical background padding"
                    min={0}
                    value={sharedBgPaddingY === "Mixed" ? "" : sharedBgPaddingY}
                    placeholder={sharedBgPaddingY === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => updateMetaProp("bgPaddingY", Math.max(0, Number(e.target.value)))}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold block">Radius</span>
                  <input
                    type="number"
                    aria-label="Corner radius"
                    min={0}
                    value={sharedBgRadius === "Mixed" ? "" : sharedBgRadius}
                    placeholder={sharedBgRadius === "Mixed" ? "Mixed" : ""}
                    onChange={(e) => updateMetaProp("bgRadius", Math.max(0, Number(e.target.value)))}
                    className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. STROKE / OUTLINE SECTION */}
      {hasTextInSelection && (
        <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
          <button
            onClick={() => toggleCollapse("stroke")}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
            aria-label="Toggle Stroke Outline Section"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Stroke</span>
            </span>
            {collapsed.stroke ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {!collapsed.stroke && (
            <div className="space-y-3">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted font-semibold">Enable Text Stroke</span>
                <input
                  type="checkbox"
                  aria-label="Enable text stroke"
                  checked={sharedStrokeEnabled === "Mixed" ? false : !!sharedStrokeEnabled}
                  onChange={(e) => updateMetaProp("strokeEnabled", e.target.checked)}
                  className="rounded border-border bg-surface-elevated text-accent focus:ring-accent accent-accent"
                />
              </div>

              {sharedStrokeEnabled && sharedStrokeEnabled !== "Mixed" && (
                <div className="space-y-3 pt-1 border-t border-border/30">
                  {/* Stroke color */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        aria-label="Stroke Color"
                        value={sharedStrokeColor === "Mixed" ? "" : sharedStrokeColor}
                        onChange={(e) => updateMetaProp("strokeColor", e.target.value)}
                        className="w-full bg-surface-elevated text-[11px] text-foreground font-mono border border-border rounded-[4px] pl-8 pr-2 py-[5px] focus:border-accent outline-none"
                      />
                      <button
                        ref={strokeColorPickerBtnRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColorPicker(activeColorPicker === "strokeColor" ? null : "strokeColor");
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: sharedStrokeColor === "Mixed" ? "transparent" : sharedStrokeColor }}
                        title="Open Color Picker"
                      />
                      {activeColorPicker === "strokeColor" && (
                        <ColorPicker
                          color={sharedStrokeColor === "Mixed" ? "#FFFFFF" : sharedStrokeColor}
                          onChange={(c) => updateMetaProp("strokeColor", c)}
                          onClose={() => setActiveColorPicker(null)}
                          triggerRef={strokeColorPickerBtnRef}
                        />
                      )}
                    </div>

                    <button
                      onClick={() => handleEyedropper("stroke")}
                      title="Pick Color"
                      className="p-1.5 bg-surface-elevated hover:bg-border/40 border border-border rounded text-muted hover:text-foreground transition-colors"
                    >
                      <Pipette className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stroke width */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-muted font-semibold w-16">Width</span>
                    <input
                      type="number"
                      aria-label="Stroke width"
                      min={1}
                      max={20}
                      value={sharedStrokeWidth === "Mixed" ? "" : sharedStrokeWidth}
                      onChange={(e) => updateMetaProp("strokeWidth", Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. EFFECTS SECTION */}
      <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
        <button
          onClick={() => toggleCollapse("effects")}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
          aria-label="Toggle Effects Section"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>Effects</span>
          </span>
          {collapsed.effects ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {!collapsed.effects && (
          <div className="space-y-3.5">
            {/* Enable/Disable Toggle (Drop Shadow) */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted font-semibold">Drop Shadow</span>
              <input
                type="checkbox"
                aria-label="Enable drop shadow"
                checked={sharedShadowEnabled === "Mixed" ? false : !!sharedShadowEnabled}
                onChange={(e) => updateMetaProp("shadowEnabled", e.target.checked)}
                className="rounded border-border bg-surface-elevated text-accent focus:ring-accent accent-accent"
              />
            </div>

            {sharedShadowEnabled && sharedShadowEnabled !== "Mixed" && (
              <div className="space-y-3 pt-1 border-t border-border/30">
                {/* Shadow Color */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      aria-label="Shadow Color"
                      value={sharedShadowColor === "Mixed" ? "" : sharedShadowColor}
                      onChange={(e) => updateMetaProp("shadowColor", e.target.value)}
                      className="w-full bg-surface-elevated text-[11px] text-foreground font-mono border border-border rounded-[4px] pl-8 pr-2 py-[5px] focus:border-accent outline-none"
                    />
                    <button
                      ref={shadowColorPickerBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColorPicker(activeColorPicker === "shadowColor" ? null : "shadowColor");
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: sharedShadowColor === "Mixed" ? "transparent" : sharedShadowColor }}
                      title="Open Color Picker"
                    />
                    {activeColorPicker === "shadowColor" && (
                      <ColorPicker
                        color={sharedShadowColor === "Mixed" ? "#FFFFFF" : sharedShadowColor}
                        onChange={(c) => updateMetaProp("shadowColor", c)}
                        onClose={() => setActiveColorPicker(null)}
                        triggerRef={shadowColorPickerBtnRef}
                      />
                    )}
                  </div>
                </div>

                {/* X and Y offsets */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-muted w-3 font-mono">X</span>
                    <input
                      type="number"
                      aria-label="Shadow X offset"
                      value={sharedShadowX === "Mixed" ? "" : sharedShadowX}
                      onChange={(e) => updateMetaProp("shadowX", Number(e.target.value))}
                      className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-muted w-3 font-mono">Y</span>
                    <input
                      type="number"
                      aria-label="Shadow Y offset"
                      value={sharedShadowY === "Mixed" ? "" : sharedShadowY}
                      onChange={(e) => updateMetaProp("shadowY", Number(e.target.value))}
                      className="w-full bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                    />
                  </div>
                </div>

                {/* Blur */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-muted font-semibold w-16">Blur</span>
                  <input
                    type="number"
                    aria-label="Shadow blur radius"
                    min={0}
                    value={sharedShadowBlur === "Mixed" ? "" : sharedShadowBlur}
                    onChange={(e) => updateMetaProp("shadowBlur", Math.max(0, Number(e.target.value)))}
                    className="w-20 bg-surface-elevated text-[11px] text-foreground border border-border rounded-[4px] px-2.5 py-[5px] focus:border-accent outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. ADVANCED TEXT SECTION */}
      {hasTextInSelection && (
        <div className="px-3 py-2.5 space-y-2.5 border-b border-border/50">
          <button
            onClick={() => toggleCollapse("advanced")}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-foreground transition-colors"
            aria-label="Toggle Advanced Text Section"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-purple-400" />
              <span>Advanced Text</span>
            </span>
            {collapsed.advanced ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {!collapsed.advanced && (
            <div className="space-y-3.5">
              {/* Resize Modes */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted font-semibold">Resize Mode</span>
                <select
                  aria-label="Resize mode"
                  value={sharedResizeMode === "Mixed" ? "" : sharedResizeMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    const w = sharedW === "Mixed" ? 200 : sharedW;
                    const h = sharedH === "Mixed" ? 50 : sharedH;

                    editor.markHistoryStoppingPoint("change-resize-mode");
                    editor.updateShapes(
                      textShapes.map((s) => {
                        const nextMeta: Record<string, unknown> = {
                          ...s.meta,
                          resizeMode: mode,
                        };
                        const nextProps: Record<string, unknown> = {
                          ...s.props,
                        };

                        if (mode === "auto-width") {
                          nextProps.autoSize = true;
                        } else if (mode === "auto-height") {
                          nextProps.autoSize = false;
                          nextProps.w = s.props.w || w;
                          nextMeta.fixedWidth = s.props.w || w;
                        } else if (mode === "fixed") {
                          nextProps.autoSize = false;
                          nextProps.w = s.props.w || w;
                          nextMeta.fixedWidth = s.props.w || w;
                          nextMeta.fixedHeight = (s as any).h || h;
                        }

                        return {
                          id: s.id,
                          type: s.type,
                          props: nextProps,
                          meta: nextMeta,
                        };
                      }) as any
                    );
                  }}
                  className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                >
                  {sharedResizeMode === "Mixed" && <option value="">Mixed</option>}
                  <option value="auto-width">Auto Width</option>
                  <option value="auto-height">Auto Height</option>
                  <option value="fixed">Fixed Size</option>
                </select>
              </div>

              {/* Text Case options */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted font-semibold">Text Case</span>
                <select
                  aria-label="Text case"
                  value={sharedTextCase === "Mixed" ? "" : sharedTextCase}
                  onChange={(e) => {
                    const c = e.target.value;
                    if (c === "small-caps") {
                      updateMetaProps({
                        textCase: "none",
                        fontVariant: "small-caps",
                      });
                    } else {
                      updateMetaProps({
                        textCase: c,
                        fontVariant: "normal",
                      });
                    }
                  }}
                  className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                >
                  {sharedTextCase === "Mixed" && <option value="">Mixed</option>}
                  <option value="none">Original Case</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Title Case</option>
                  <option value="small-caps">Small Caps</option>
                </select>
              </div>

              {/* Bullet / Numbered Lists */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted font-semibold block mb-1">List Formatting</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      editor.markHistoryStoppingPoint("change-list-bullet");
                      editor.updateShapes(
                        textShapes.map((s) => {
                          const currentTxt = richTextToText(editor, s.props.richText);
                          const formatted = applyListFormat(currentTxt, "bullet");
                          return {
                            id: s.id,
                            type: s.type,
                            props: {
                              ...s.props,
                              richText: textToRichText(editor, formatted),
                            },
                          };
                        })
                      );
                    }}
                    className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-surface-elevated hover:bg-border/40 border border-border rounded text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Bulleted</span>
                  </button>

                  <button
                    onClick={() => {
                      editor.markHistoryStoppingPoint("change-list-number");
                      editor.updateShapes(
                        textShapes.map((s) => {
                          const currentTxt = richTextToText(editor, s.props.richText);
                          const formatted = applyListFormat(currentTxt, "number");
                          return {
                            id: s.id,
                            type: s.type,
                            props: {
                              ...s.props,
                              richText: textToRichText(editor, formatted),
                            },
                          };
                        })
                      );
                    }}
                    className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-surface-elevated hover:bg-border/40 border border-border rounded text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>Numbered</span>
                  </button>

                  <button
                    onClick={() => {
                      editor.markHistoryStoppingPoint("change-list-remove");
                      editor.updateShapes(
                        textShapes.map((s) => {
                          const currentTxt = richTextToText(editor, s.props.richText);
                          const formatted = applyListFormat(currentTxt, "none");
                          return {
                            id: s.id,
                            type: s.type,
                            props: {
                              ...s.props,
                              richText: textToRichText(editor, formatted),
                            },
                          };
                        })
                      );
                    }}
                    title="Remove List"
                    className="p-1.5 bg-surface-elevated hover:bg-red-950 border border-border rounded text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Direction LTR/RTL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Direction</span>
                  <select
                    aria-label="Text direction"
                    value={sharedTextDirection === "Mixed" ? "" : sharedTextDirection}
                    onChange={(e) => updateMetaProp("direction", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                  >
                    {sharedTextDirection === "Mixed" && <option value="">Mixed</option>}
                    <option value="ltr">LTR (English/Latin)</option>
                    <option value="rtl">RTL (Urdu/Arabic)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-semibold">Overflow</span>
                  <select
                    aria-label="Text overflow mode"
                    value={sharedTextOverflow === "Mixed" ? "" : sharedTextOverflow}
                    onChange={(e) => updateMetaProp("overflow", e.target.value)}
                    className="w-full bg-surface-elevated text-[11px] border border-border rounded-[4px] px-2 py-[5px] outline-none text-foreground focus:border-accent cursor-pointer"
                  >
                    {sharedTextOverflow === "Mixed" && <option value="">Mixed</option>}
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                    <option value="clip">Clip</option>
                    <option value="ellipsis">Ellipsis</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
