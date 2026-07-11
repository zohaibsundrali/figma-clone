"use client";

import {
  AssetRecordType,
  type TLAssetId,
  type TLPageId,
  type TLShape,
} from "tldraw";
import { ImagePlus, Layers, Search, Shapes } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PagesPanel } from "./PagesPanel";
import { useEditorContext } from "./EditorContext";

type EditorAsset = {
  id: TLAssetId;
  typeName: "asset";
  type: string;
  props: {
    src?: string;
    name?: string;
    w?: number;
    h?: number;
    mimeType?: string | null;
  };
};

type LeftTab = "layers" | "assets";

export function AssetsPanel() {
  const { editor } = useEditorContext();
  const [tab, setTab] = useState<LeftTab>("layers");
  const [shapes, setShapes] = useState<TLShape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<EditorAsset[]>([]);
  const [search, setSearch] = useState("");
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setShapes([...editor.getCurrentPageShapes()].reverse());
      setSelectedIds(editor.getSelectedShapeIds());

      const nextAssets = editor.store
        .allRecords()
        .filter((record) => record.typeName === "asset")
        .map((record) => record as unknown as EditorAsset)
        .filter((asset) => asset.type === "image" && Boolean(asset.props?.src));

      setAssets(nextAssets);
    };

    update();
    const cleanup = editor.store.listen(update, { scope: "document" });
    return cleanup;
  }, [editor]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      (asset.props.name ?? "Untitled").toLowerCase().includes(q)
    );
  }, [assets, search]);

  function insertImageAsset(assetId: TLAssetId, w?: number, h?: number) {
    if (!editor) return;

    const width = w && w > 0 ? w : 320;
    const height = h && h > 0 ? h : 240;
    const center = editor.getViewportPageBounds().center;

    editor.createShape({
      type: "image",
      x: center.x - width / 2,
      y: center.y - height / 2,
      props: {
        assetId,
        w: width,
        h: height,
      },
      parentId: editor.getCurrentPageId() as TLPageId,
    });

    editor.setCurrentTool("select");
  }

  async function handleUpload(file: File) {
    if (!editor) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image is too large. Please upload an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const src = reader.result as string;
      const assetId = AssetRecordType.createId();

      const image = new Image();
      image.src = src;

      const size = await new Promise<{ w: number; h: number }>((resolve) => {
        image.onload = () => resolve({ w: image.naturalWidth || 400, h: image.naturalHeight || 300 });
        image.onerror = () => resolve({ w: 400, h: 300 });
      });

      editor.createAssets([
        {
          id: assetId,
          typeName: "asset",
          type: "image",
          props: {
            name: file.name,
            src,
            w: size.w,
            h: size.h,
            mimeType: file.type,
            isAnimated: false,
          },
          meta: {},
        } as import("tldraw").TLAsset,
      ]);

      insertImageAsset(assetId, size.w, size.h);
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
    };
  }

  if (!editor) {
    return (
      <aside className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="flex border-b border-border px-1">
          <button className="flex-1 border-b-2 border-accent py-2 text-xs font-semibold text-accent">
            Layers
          </button>
          <button className="flex-1 py-2 text-xs text-muted">Assets</button>
        </div>
        <div className="p-3 text-xs text-muted">Loading sidebar...</div>
      </aside>
    );
  }

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-surface">
      <div className="flex border-b border-border px-1">
        <button
          onClick={() => setTab("layers")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${
            tab === "layers"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => setTab("assets")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${
            tab === "assets"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Assets
        </button>
      </div>

      {tab === "layers" ? (
        <>
          <PagesPanel />
          <div className="flex h-10 items-center gap-2 border-b border-border px-3">
            <Layers className="h-4 w-4 text-muted" />
            <span className="text-sm font-medium">Layers</span>
            <span className="ml-auto text-xs text-muted">{shapes.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {shapes.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted">No layers yet</p>
            ) : (
              shapes.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => editor.select(shape.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    selectedIds.includes(shape.id)
                      ? "bg-accent/20 text-foreground"
                      : "text-muted hover:bg-surface-elevated hover:text-foreground"
                  }`}
                >
                  <span className="truncate capitalize">{shape.type}</span>
                  <span className="ml-auto truncate text-[10px] opacity-60">
                    {shape.id.slice(-6)}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Local assets</span>
            <button
              onClick={() => uploadRef.current?.click()}
              className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-elevated hover:text-foreground"
              title="Upload asset"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
                if (!validTypes.includes(file.type)) {
                  alert("Unsupported file type. Please upload a png, jpg, jpeg, webp, or gif.");
                  e.currentTarget.value = "";
                  return;
                }

                void handleUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <div className="px-3 pb-3">
            <div className="flex h-8 items-center rounded border border-border bg-surface-elevated px-2">
              <Search className="h-3.5 w-3.5 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets"
                className="ml-2 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {filteredAssets.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-border p-4 text-center">
                <Shapes className="mx-auto h-4 w-4 text-muted" />
                <p className="mt-2 text-xs text-muted">No assets yet</p>
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  Upload Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => insertImageAsset(asset.id, asset.props.w, asset.props.h)}
                    className="group rounded-md border border-border bg-surface-elevated p-1.5 text-left transition-colors hover:border-accent/60"
                    title={`Insert ${asset.props.name ?? "asset"}`}
                  >
                    <div className="aspect-square overflow-hidden rounded bg-[#20242b]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.props.src}
                        alt={asset.props.name ?? "Asset"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-foreground/85">
                      {asset.props.name ?? "Untitled"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
