"use client";

import { useState, useEffect } from "react";
import { useEditorContext } from "./EditorContext";
import { Download, Copy, Trash2, Plus } from "lucide-react";

interface DesignToken {
  id: string;
  name: string;
  category: "color" | "spacing" | "typography" | "shadow" | "radius";
  value: string;
  description?: string;
  createdAt: string;
}

export function TokensPanel() {
  const { fileId } = useEditorContext();
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenValue, setNewTokenValue] = useState("");
  const [newTokenCategory, setNewTokenCategory] = useState<DesignToken["category"]>("color");
  const [newTokenDesc, setNewTokenDesc] = useState("");
  const [exportFormat, setExportFormat] = useState<"css" | "json" | "tailwind">("css");

  const addToken = () => {
    if (!newTokenName.trim() || !newTokenValue.trim()) return;

    const newToken: DesignToken = {
      id: `token_${Date.now()}`,
      name: newTokenName,
      category: newTokenCategory,
      value: newTokenValue,
      description: newTokenDesc,
      createdAt: new Date().toISOString(),
    };

    setTokens([...tokens, newToken]);

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "token_added",
          details: `Added design token "${newTokenName}"`,
        }),
      }).catch(() => {});
    }

    setNewTokenName("");
    setNewTokenValue("");
    setNewTokenDesc("");
  };

  const deleteToken = (tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    setTokens(tokens.filter((t) => t.id !== tokenId));

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "token_deleted",
          details: `Deleted design token "${token.name}"`,
        }),
      }).catch(() => {});
    }
  };

  const generateCSS = (): string => {
    let css = ":root {\n";
    tokens.forEach((token) => {
      const cssVarName = `--${token.category}-${token.name.toLowerCase().replace(/\s+/g, "-")}`;
      css += `  ${cssVarName}: ${token.value};\n`;
    });
    css += "}\n";
    return css;
  };

  const generateJSON = (): string => {
    const grouped: Record<string, Record<string, unknown>> = {};
    tokens.forEach((token) => {
      if (!grouped[token.category]) {
        grouped[token.category] = {};
      }
      grouped[token.category][token.name] = token.value;
    });
    return JSON.stringify(grouped, null, 2);
  };

  const generateTailwind = (): string => {
    const config: Record<string, Record<string, unknown>> = {
      theme: {
        extend: {},
      },
    };

    const colors: Record<string, string> = {};
    const spacing: Record<string, string> = {};
    const fontSize: Record<string, string> = {};

    tokens.forEach((token) => {
      if (token.category === "color") {
        colors[token.name] = token.value;
      } else if (token.category === "spacing") {
        spacing[token.name] = token.value;
      } else if (token.category === "typography") {
        fontSize[token.name] = token.value;
      }
    });

    if (Object.keys(colors).length > 0) {
      (config.theme.extend as any) = { ...(config.theme.extend as any), colors };
    }
    if (Object.keys(spacing).length > 0) {
      (config.theme.extend as any) = { ...(config.theme.extend as any), spacing };
    }
    if (Object.keys(fontSize).length > 0) {
      (config.theme.extend as any) = { ...(config.theme.extend as any), fontSize };
    }

    return `module.exports = ${JSON.stringify(config, null, 2)}`;
  };

  const getExportContent = (): string => {
    switch (exportFormat) {
      case "css":
        return generateCSS();
      case "json":
        return generateJSON();
      case "tailwind":
        return generateTailwind();
    }
  };

  const copyToClipboard = async () => {
    const content = getExportContent();
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const downloadExport = () => {
    const content = getExportContent();
    const filename = `design-tokens.${exportFormat === "tailwind" ? "js" : exportFormat}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedTokens = tokens.reduce(
    (acc, token) => {
      if (!acc[token.category]) {
        acc[token.category] = [];
      }
      acc[token.category].push(token);
      return acc;
    },
    {} as Record<string, DesignToken[]>
  );

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border overflow-y-auto">
      {/* Add Token Section */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Design Tokens</h3>
        <p className="text-xs text-muted">{tokens.length} token{tokens.length !== 1 ? "s" : ""}</p>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Token name (e.g., Primary Blue)"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
          />
          <input
            type="text"
            placeholder="Value (e.g., #3B82F6)"
            value={newTokenValue}
            onChange={(e) => setNewTokenValue(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
          />
          <select
            value={newTokenCategory}
            onChange={(e) => setNewTokenCategory(e.target.value as any)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
          >
            <option value="color">Color</option>
            <option value="spacing">Spacing</option>
            <option value="typography">Typography</option>
            <option value="shadow">Shadow</option>
            <option value="radius">Radius</option>
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newTokenDesc}
            onChange={(e) => setNewTokenDesc(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
          />
          <button
            onClick={addToken}
            disabled={!newTokenName.trim() || !newTokenValue.trim()}
            className="w-full px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Token
          </button>
        </div>
      </div>

      {/* Export Section */}
      {tokens.length > 0 && (
        <div className="border-b border-border p-4 space-y-2">
          <h4 className="text-xs font-semibold">Export</h4>
          <div className="flex gap-1">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="flex-1 px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
            >
              <option value="css">CSS Variables</option>
              <option value="json">JSON</option>
              <option value="tailwind">Tailwind Config</option>
            </select>
          </div>
          <div className="flex gap-1">
            <button
              onClick={copyToClipboard}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-surface-elevated hover:bg-border transition-colors flex items-center justify-center gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              onClick={downloadExport}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 transition-colors flex items-center justify-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="flex-1 p-4 space-y-4">
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted">No design tokens yet</p>
            <p className="text-xs text-muted/60 mt-1">Add tokens to build your design system</p>
          </div>
        ) : (
          Object.entries(groupedTokens).map(([category, categoryTokens]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted uppercase">{category}</h4>
              <div className="space-y-1">
                {categoryTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center gap-2 p-2 rounded bg-surface-elevated hover:bg-border/50 transition-colors"
                  >
                    {token.category === "color" && (
                      <div
                        className="h-4 w-4 rounded border border-border"
                        style={{ backgroundColor: token.value }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{token.name}</p>
                      <p className="text-xs text-muted truncate font-mono">{token.value}</p>
                      {token.description && (
                        <p className="text-xs text-muted/60 truncate">{token.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 text-xs text-muted space-y-1">
        <p>💡 Design tokens as code</p>
        <p>• CSS, JSON, Tailwind formats</p>
        <p>• Share with your team</p>
      </div>
    </div>
  );
}
