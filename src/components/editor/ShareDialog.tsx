"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { DesignFile } from "@/types";
import { Mail, UserPlus, Trash2, Globe, Lock } from "lucide-react";
import { useOthers, useSelf } from "@/lib/liveblocks";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  file: DesignFile;
  onFileChange: (updates: Partial<Pick<DesignFile, "isPublic">>) => void;
}

interface InvitedMember {
  id: string;
  email: string;
  role: "Can edit" | "Can view";
  name?: string;
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function ShareDialog({ open, onClose, file, onFileChange }: ShareDialogProps) {
  const [isPublic, setIsPublic] = useState(file.isPublic);
  const [prevFileIsPublic, setPrevFileIsPublic] = useState(file.isPublic);
  const [copied, setCopied] = useState(false);

  // Invite states
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"Can edit" | "Can view">("Can edit");
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([
    {
      id: "demo-1",
      email: "designer.colleague@gmail.com",
      role: "Can edit",
      name: "Alex Rivera",
    },
    {
      id: "demo-2",
      email: "client.reviewer@gmail.com",
      role: "Can view",
      name: "Sarah Chen",
    },
  ]);

  // Liveblocks presence info for online users
  const self = useSelf();
  const others = useOthers();

  if (file.isPublic !== prevFileIsPublic) {
    setPrevFileIsPublic(file.isPublic);
    setIsPublic(file.isPublic);
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${file.shareToken}`
      : `/share/${file.shareToken}`;

  async function togglePublic() {
    const newValue = !isPublic;
    setIsPublic(newValue);
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: newValue }),
    });

    if (res.ok) {
      onFileChange({ isPublic: newValue });
      return;
    }

    setIsPublic(!newValue);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) return;

    // Simple email regex validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Check duplicate
    if (invitedMembers.some((m) => m.email.toLowerCase() === cleanEmail.toLowerCase())) {
      alert("This member has already been invited.");
      return;
    }

    // Derive name from email local-part for visual purposes
    const derivedName = cleanEmail.split("@")[0]
      ?.split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || cleanEmail;

    const newMember: InvitedMember = {
      id: `invited-${Date.now()}`,
      email: cleanEmail,
      role: roleInput,
      name: derivedName,
    };

    setInvitedMembers((prev) => [...prev, newMember]);
    setEmailInput("");
  }

  function handleRemoveMember(id: string) {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== id));
  }

  // Self (current user) details
  const selfName = self?.info?.name || "You";
  const selfColor = self?.info?.color || "#0d99ff";
  const selfAvatar = self?.info?.avatar || "";

  return (
    <Dialog open={open} onClose={onClose} title="Share Design File">
      <div className="space-y-5 text-foreground max-h-[550px] overflow-y-auto pr-1">
        {/* Link Sharing Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              {isPublic ? (
                <Globe className="h-4.5 w-4.5 text-accent animate-pulse" />
              ) : (
                <Lock className="h-4.5 w-4.5 text-muted" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold">Link Sharing</p>
              <p className="text-[11px] text-muted">
                {isPublic
                  ? "Anyone with the link can view this file in read-only mode."
                  : "Private. Only invited members can access."}
              </p>
            </div>
          </div>
          <button
            onClick={togglePublic}
            className={`relative h-5.5 w-10 rounded-full transition-colors flex-shrink-0 ${
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

        {/* Copy Share Link Container */}
        {isPublic ? (
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted outline-none focus:outline-none"
            />
            <Button variant="primary" size="sm" onClick={copyLink}>
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted">
            Enable public access to generate a quick view link.
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="space-y-2">
          <label className="block text-xs font-semibold text-foreground">Invite collaborators</label>
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1 focus-within:border-accent transition-colors">
            <Mail className="h-4 w-4 text-muted ml-2 flex-shrink-0" />
            <input
              type="email"
              placeholder="Enter email address..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground placeholder-muted outline-none border-none p-1 focus:ring-0"
            />
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value as "Can edit" | "Can view")}
              className="bg-surface-elevated text-[11px] border border-border rounded px-2 py-1 outline-none text-muted focus:border-primary cursor-pointer"
            >
              <option value="Can edit">Can edit</option>
              <option value="Can view">Can view</option>
            </select>
            <button
              type="submit"
              className="bg-primary hover:brightness-110 text-on-primary text-xs font-semibold px-3 py-1.5 rounded transition-all flex items-center gap-1 flex-shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </form>

        {/* Collaborators List */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold text-muted">
            <span>Members with access</span>
            <span>{1 + others.length + invitedMembers.length} people</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-border/40 pr-0.5">
            {/* 1. Self (Owner) */}
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
                    <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${selfColor}22`, color: selfColor }}>
                      {getInitials(selfName)}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border border-surface" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{selfName} (You)</p>
                  <p className="text-[10px] text-muted truncate">Owner</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                Owner
              </span>
            </div>

            {/* 2. Others (Liveblocks Active Online Users) */}
            {others.map((other) => {
              const name = other.info?.name || "Collaborator";
              const color = other.info?.color || "#0d99ff";
              const avatar = other.info?.avatar || "";
              return (
                <div key={other.connectionId} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 text-[11px] font-semibold text-white shadow-sm flex-shrink-0"
                      style={{ borderColor: color }}
                    >
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${color}22`, color }}>
                          {getInitials(name)}
                        </span>
                      )}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border border-surface" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground">{name}</p>
                      <p className="text-[10px] text-muted truncate">Active now</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Can edit
                  </span>
                </div>
              );
            })}

            {/* 3. Invited / Demo Users */}
            {invitedMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/5 border border-border text-[11px] font-semibold text-muted flex-shrink-0">
                    <span>{getInitials(member.name || member.email)}</span>
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-muted border border-surface" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {member.name || member.email}
                    </p>
                    <p className="text-[10px] text-muted truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      member.role === "Can edit"
                        ? "text-primary bg-primary/10"
                        : "text-muted bg-white/5"
                    }`}
                  >
                    {member.role}
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 hover:text-red-400 text-muted rounded hover:bg-white/5 transition-colors"
                    title="Remove access"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
