"use client";

import { getSnapshot } from "tldraw";
import { useEditorContext } from "./EditorContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface ExportMenuProps {
  open: boolean;
  onClose: () => void;
}

export function ExportMenu({ open, onClose }: ExportMenuProps) {
  const { editor } = useEditorContext();

  async function exportPng() {
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) return;

    const { blob } = await editor.toImage([...shapeIds], {
      format: "png",
      background: true,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.png";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  function exportJson() {
    if (!editor) return;
    const snapshot = getSnapshot(editor.store);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.json";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Export Design">
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={exportPng}>
          Export as PNG
        </Button>
        <Button variant="secondary" onClick={exportJson}>
          Export as JSON
        </Button>
      </div>
    </Dialog>
  );
}
