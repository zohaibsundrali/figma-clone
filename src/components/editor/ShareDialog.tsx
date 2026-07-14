"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type {
  DesignFile,
  ShareSettings,
  ShareRole,
  FileMemberSummary,
} from "@/types";
import {
  Mail,
  UserPlus,
  Trash2,
  Globe,
  Lock,
  Loader2,
  RefreshCw,
  KeyRound,
  Clock,
} from "lucide-react";
import { useOthers, useSelf } from "@/lib/liveblocks";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  file: DesignFile;
  onFileChange: (updates: Partial<Pick<DesignFile, "isPublic">>) => void;
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

const STATUS_STYLE: Record<FileMemberSummary["status"], string> = {
  accepted: "text-emerald-400 bg-emerald-400/10",
  pending: "text-amber-400 bg-amber-400/10",
  expired: "text-muted bg-white/5",
  revoked: "text-red-400 bg-red-400/10",
};

// Convert an ISO string to the value a <input type="datetime-local"> expects.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function ShareDialog({ open, onClose, file, onFileChange }: ShareDialogProps) {
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [members, setMembers] = useState<FileMemberSummary[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<FileMemberSummary["role"]>("editor");
  const [passwordInput, setPasswordInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");

  const self = useSelf();
  const others = useOthers();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`/api/files/${file.id}/share`),
        fetch(`/api/files/${file.id}/invitations`),
      ]);
      if (sRes.status === 403 || mRes.status === 403) {
        setCanManage(false);
        return;
      }
      if (sRes.ok) {
        const s = (await sRes.json()) as ShareSettings;
        setSettings(s);
        setExpiryInput(toLocalInput(s.expiresAt));
      }
      if (mRes.ok) setMembers((await mRes.json()) as FileMemberSummary[]);
      setCanManage(true);
    } catch {
      setError("Failed to load sharing settings.");
    } finally {
      setIsLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  // Patch share settings and refresh local state.
  const patchShare = useCallback(
    async (body: Record<string, unknown>, successMsg?: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/files/${file.id}/share`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `HTTP ${res.status}`);
        }
        const s = (await res.json()) as ShareSettings;
        setSettings(s);
        setExpiryInput(toLocalInput(s.expiresAt));
        if (body.enabled !== undefined) onFileChange({ isPublic: s.isPublic });
        if (successMsg) {
          setError(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusy(false);
      }
    },
    [file.id, onFileChange]
  );

  async function copyLink() {
    if (!settings?.shareUrl) return;
    await navigator.clipboard.writeText(settings.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = emailInput
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return;
    for (const em of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setError(`Invalid email: ${em}`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/${file.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, role: roleInput }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setEmailInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setBusy(false);
    }
  }

  async function changeMemberRole(id: string, role: FileMemberSummary["role"]) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    try {
      const res = await fetch(`/api/files/${file.id}/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Failed to change role");
      await load();
    }
  }

  async function revokeMember(id: string) {
    const prev = members;
    setMembers((p) => p.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/files/${file.id}/members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setMembers(prev);
      setError("Failed to revoke access");
    }
  }

  const isPublic = settings?.isPublic ?? file.isPublic;
  const selfName = self?.info?.name || "You";
  const selfColor = self?.info?.color || "#0d99ff";
  const selfAvatar = self?.info?.avatar || "";

  return (
    <Dialog open={open} onClose={onClose} title="Share Design File">
      <div className="space-y-5 text-foreground max-h-[560px] overflow-y-auto pr-1">
        {!canManage && (
          <div className="rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            Only the file owner or an admin can manage sharing settings.
          </div>
        )}

        {/* Link Sharing Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              {isPublic ? (
                <Globe className="h-4.5 w-4.5 text-accent" />
              ) : (
                <Lock className="h-4.5 w-4.5 text-muted" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold">Link Sharing</p>
              <p className="text-[11px] text-muted">
                {isPublic
                  ? "Anyone with the link can access this file."
                  : "Private. Only invited members can access."}
              </p>
            </div>
          </div>
          <button
            disabled={!canManage || busy}
            onClick={() => void patchShare({ enabled: !isPublic })}
            className={`relative h-5.5 w-10 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
              isPublic ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform ${
                isPublic ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Public link controls */}
        {isPublic && settings && (
          <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-3">
            {/* Copy + regenerate */}
            <div className="flex gap-2">
              <input
                readOnly
                value={settings.shareUrl ?? ""}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted outline-none"
              />
              <Button variant="primary" size="sm" onClick={copyLink} disabled={busy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <button
                title="Regenerate link (invalidates the old URL)"
                disabled={!canManage || busy}
                onClick={() => void patchShare({ regenerate: true })}
                className="flex items-center justify-center rounded-lg border border-border px-2 text-muted hover:bg-surface-elevated hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Link permission */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted">Link permission</span>
              <select
                disabled={!canManage || busy}
                value={settings.shareRole}
                onChange={(e) =>
                  void patchShare({ role: e.target.value as ShareRole })
                }
                className="bg-surface-elevated text-[11px] border border-border rounded px-2 py-1 text-muted outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="viewer">Can view</option>
                <option value="commenter">Can comment</option>
                <option value="editor">Can edit</option>
              </select>
            </div>

            {/* Password */}
            <div className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-muted flex-shrink-0" />
              {settings.hasPassword ? (
                <>
                  <span className="flex-1 text-[11px] text-emerald-400">
                    Password protected
                  </span>
                  <button
                    disabled={!canManage || busy}
                    onClick={() => void patchShare({ password: null })}
                    className="text-[11px] text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Add password (min 4 chars)"
                    className="flex-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
                  />
                  <button
                    disabled={!canManage || busy || passwordInput.length < 4}
                    onClick={async () => {
                      await patchShare({ password: passwordInput });
                      setPasswordInput("");
                    }}
                    className="text-[11px] text-accent hover:underline disabled:opacity-40"
                  >
                    Set
                  </button>
                </>
              )}
            </div>

            {/* Expiration */}
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted flex-shrink-0" />
              <input
                type="datetime-local"
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
                className="flex-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
              />
              <button
                disabled={!canManage || busy || !expiryInput}
                onClick={() =>
                  void patchShare({
                    expiresAt: new Date(expiryInput).toISOString(),
                  })
                }
                className="text-[11px] text-accent hover:underline disabled:opacity-40"
              >
                {settings.expiresAt ? "Update" : "Set"}
              </button>
              {settings.expiresAt && (
                <button
                  disabled={!canManage || busy}
                  onClick={() => void patchShare({ expiresAt: null })}
                  className="text-[11px] text-red-400 hover:underline disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
            {settings.expired && (
              <p className="text-[11px] text-red-400">This link has expired.</p>
            )}
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Invite collaborators
          </label>
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1 focus-within:border-accent transition-colors">
            <Mail className="h-4 w-4 text-muted ml-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Emails (comma separated)…"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground placeholder-muted outline-none border-none p-1 focus:ring-0"
            />
            <select
              value={roleInput}
              onChange={(e) =>
                setRoleInput(e.target.value as FileMemberSummary["role"])
              }
              className="bg-surface-elevated text-[11px] border border-border rounded px-2 py-1 outline-none text-muted focus:border-primary cursor-pointer"
            >
              <option value="editor">Can edit</option>
              <option value="commenter">Can comment</option>
              <option value="viewer">Can view</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="bg-primary hover:brightness-110 text-on-primary text-xs font-semibold px-3 py-1.5 rounded transition-all flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Members */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold text-muted">
            <span>Members with access</span>
            <span>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                members.length + 1
              )}{" "}
              people
            </span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-border/40 pr-0.5">
            {/* Owner (self) */}
            <div className="flex items-center justify-between py-2 first:pt-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 text-[11px] font-semibold text-white shadow-sm flex-shrink-0"
                  style={{ borderColor: selfColor }}
                >
                  {selfAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selfAvatar} alt={selfName} className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center"
                      style={{ backgroundColor: `${selfColor}22`, color: selfColor }}
                    >
                      {getInitials(selfName)}
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {selfName} (You)
                  </p>
                  <p className="text-[10px] text-muted truncate">Owner</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                Owner
              </span>
            </div>

            {/* Invited file members */}
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/5 border border-border text-[11px] font-semibold text-muted flex-shrink-0">
                    <span>{getInitials(member.email)}</span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {member.email}
                    </p>
                    <span
                      className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLE[member.status]}`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <select
                    disabled={!canManage}
                    value={member.role}
                    onChange={(e) =>
                      void changeMemberRole(
                        member.id,
                        e.target.value as FileMemberSummary["role"]
                      )
                    }
                    className="bg-surface-elevated text-[10px] border border-border rounded px-1.5 py-0.5 text-muted outline-none focus:border-primary disabled:opacity-50 cursor-pointer"
                  >
                    <option value="editor">Can edit</option>
                    <option value="commenter">Can comment</option>
                    <option value="viewer">Can view</option>
                    <option value="admin">Admin</option>
                  </select>
                  {canManage && (
                    <button
                      onClick={() => void revokeMember(member.id)}
                      className="p-1 hover:text-red-400 text-muted rounded hover:bg-white/5 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Online (presence) collaborators */}
            {others.map((other) => (
              <div key={other.connectionId} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 text-[11px] font-semibold text-white shadow-sm flex-shrink-0"
                    style={{ borderColor: other.info?.color || "#0d99ff" }}
                  >
                    {other.info?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.info.avatar} alt={other.info?.name || ""} className="h-full w-full object-cover" />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          backgroundColor: `${other.info?.color || "#0d99ff"}22`,
                          color: other.info?.color || "#0d99ff",
                        }}
                      >
                        {getInitials(other.info?.name)}
                      </span>
                    )}
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border border-surface" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {other.info?.name || "Collaborator"}
                    </p>
                    <p className="text-[10px] text-muted truncate">Active now</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
