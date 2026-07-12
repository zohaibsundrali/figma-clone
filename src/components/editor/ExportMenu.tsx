"use client";

import { getSnapshot } from "tldraw";
import { useEditorContext } from "./EditorContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useState } from "react";

interface ExportMenuProps {
  open: boolean;
  onClose: () => void;
}

export function ExportMenu({ open, onClose }: ExportMenuProps) {
  const { editor } = useEditorContext();
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportPng() {
    if (!editor) return;
    setExporting("png");
    try {
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
    } finally {
      setExporting(null);
    }
  }

  async function exportSvg() {
    if (!editor) return;
    setExporting("svg");
    try {
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0) return;

      const { blob } = await editor.toImage([...shapeIds], {
        format: "svg",
        background: true,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "design.svg";
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    if (!editor) return;
    setExporting("pdf");
    try {
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0) return;

      // Export as PNG blob
      const { blob: pngBlob } = await editor.toImage([...shapeIds], {
        format: "png",
        background: true,
      });

      // Convert blob to data URL
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;

          // Dynamic import of jsPDF
          const jsPdfModule = await import("jspdf");
          const jsPDF = jsPdfModule.jsPDF;

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4",
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = img.width / img.height;

            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / ratio;

            if (imgHeight > pdfHeight - 20) {
              imgHeight = pdfHeight - 20;
              imgWidth = imgHeight * ratio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);
            pdf.save("design.pdf");
            onClose();
          };
          img.src = dataUrl;
        } catch (error) {
          console.error("PDF export failed:", error);
        } finally {
          setExporting(null);
        }
      };
      reader.readAsDataURL(pngBlob);
    } catch (error) {
      console.error("PDF export error:", error);
      setExporting(null);
    }
  }

  function exportJson() {
    if (!editor) return;
    setExporting("json");
    try {
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
    } finally {
      setExporting(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Export Design">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={exportPng}
          disabled={exporting === "png"}
        >
          {exporting === "png" ? "Exporting..." : "Export as PNG"}
        </Button>
        <Button
          variant="secondary"
          onClick={exportSvg}
          disabled={exporting === "svg"}
        >
          {exporting === "svg" ? "Exporting..." : "Export as SVG"}
        </Button>
        <Button
          variant="secondary"
          onClick={exportPdf}
          disabled={exporting === "pdf"}
        >
          {exporting === "pdf" ? "Exporting..." : "Export as PDF"}
        </Button>
        <Button
          variant="secondary"
          onClick={exportJson}
          disabled={exporting === "json"}
        >
          {exporting === "json" ? "Exporting..." : "Export as JSON"}
        </Button>
      </div>
    </Dialog>
  );
}
