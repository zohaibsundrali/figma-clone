"use client";

import { useState, useEffect } from "react";
import { Users, Settings, Trash2, Copy, Shield, Mail, Plus, X } from "lucide-react";

interface WorkspaceMember {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
}

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkspaceSettings({ workspaceId }: { workspaceId: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWorkspaceData();
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      // In a real app, these would be API calls
      const mockWorkspace: Workspace = {
        id: workspaceId,
        name: "My Design Team",
        ownerId: "owner_123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMembers: WorkspaceMember[] = [
        {
          id: "mem_1",
          userId: "owner_123",
          userEmail: "you@example.com",
          userName: "You",
          role: "owner",
          createdAt: new Date().toISOString(),
        },
        {
          id: "mem_2",
          userId: "user_456",
          userEmail: "designer@example.com",
          userName: "Sarah",
          role: "editor",
          createdAt: new Date().toISOString(),
        },
        {
          id: "mem_3",
          userId: "user_789",
          userEmail: "stakeholder@example.com",
          userName: "John",
          role: "viewer",
          createdAt: new Date().toISOString(),
        },
      ];

      setWorkspace(mockWorkspace);
      setMembers(mockMembers);
      setWorkspaceName(mockWorkspace.name);
    } catch (error) {
      console.error("Failed to load workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspaceName = async () => {
    if (!workspace || !workspaceName.trim()) return;

    try {
      // API call would go here
      setWorkspace({ ...workspace, name: workspaceName });
    } catch (error) {
      console.error("Failed to update workspace:", error);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !workspace) return;

    setInviting(true);
    try {
      // API call would go here
      const newMember: WorkspaceMember = {
        id: `mem_${Date.now()}`,
        userId: `user_${Date.now()}`,
        userEmail: inviteEmail,
        userName: inviteEmail.split("@")[0],
        role: inviteRole,
        createdAt: new Date().toISOString(),
      };

      setMembers([...members, newMember]);
      setInviteEmail("");
      setInviteRole("editor");
    } catch (error) {
      console.error("Failed to invite member:", error);
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      // API call would go here
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: "editor" | "viewer") => {
    try {
      // API call would go here
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (error) {
      console.error("Failed to update member role:", error);
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${workspace?.id}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-accent/10 text-accent";
      case "editor":
        return "bg-blue-500/10 text-blue-400";
      case "viewer":
        return "bg-green-500/10 text-green-400";
      default:
        return "bg-muted/10 text-muted";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Workspace Settings */}
      <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Workspace Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="flex-1 px-3 py-2 rounded border border-border bg-surface focus:border-accent outline-none text-sm"
              />
              <button
                onClick={updateWorkspaceName}
                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workspace.id}
                disabled
                className="flex-1 px-3 py-2 rounded border border-border bg-surface-elevated text-muted text-sm"
              />
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 bg-surface-elevated border border-border text-sm font-medium rounded hover:bg-border transition-colors flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted">
            Created {new Date(workspace.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Members Management */}
      <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Team Members</h2>
          <span className="ml-auto text-sm text-muted">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Invite Form */}
        <div className="bg-surface rounded-lg p-4 space-y-3 border border-border/50">
          <h3 className="text-sm font-semibold">Invite Team Member</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded border border-border bg-background focus:border-accent outline-none text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-3 py-2 rounded border border-border bg-background focus:border-accent outline-none text-sm"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={inviteMember}
              disabled={!inviteEmail.trim() || inviting}
              className="w-full px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {inviting ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded bg-surface border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{member.userName || member.userEmail}</p>
                <p className="text-xs text-muted">{member.userEmail}</p>
              </div>

              <div className="flex items-center gap-2">
                {member.role === "owner" ? (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                    Owner
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      updateMemberRole(member.id, e.target.value as any)
                    }
                    className="px-2 py-1 rounded text-xs border border-border bg-background focus:border-accent outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                )}

                {member.role !== "owner" && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Permissions */}
      <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Role Permissions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              role: "Owner",
              permissions: [
                "Create files",
                "Edit files",
                "Delete files",
                "Manage members",
                "Change workspace name",
                "Delete workspace",
              ],
            },
            {
              role: "Editor",
              permissions: [
                "Create files",
                "Edit files",
                "Delete files",
                "View members",
                "Comment on files",
              ],
            },
            {
              role: "Viewer",
              permissions: [
                "View files",
                "Comment on files",
                "Export files",
              ],
            },
          ].map((group) => (
            <div key={group.role} className="bg-surface rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">{group.role}</h3>
              <ul className="text-xs text-muted space-y-1.5">
                {group.permissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>

        <button className="w-full px-4 py-2 border border-destructive text-destructive text-sm font-medium rounded hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Workspace
        </button>

        <p className="text-xs text-muted">
          Deleting this workspace will permanently remove all files, comments, and activity. This action cannot be undone.
        </p>
      </div>
    </div>
  );
}
