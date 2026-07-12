"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronDown, LogOut, Settings } from "lucide-react";

// Sole profile control for the dashboard — lives in the left sidebar and owns
// the entire account surface (avatar, name/email, manage account, sign out).
// The top-right header intentionally does not render a second profile control.
export function SidebarUserMenu() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  // Drives the enter transition: panel mounts in its "closed" pose, then flips
  // to "open" a frame later so the CSS transition actually has something to animate.
  const [isEntered, setIsEntered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Closes both the mount flag and the entered (animation) flag together, so a
  // rapid close-then-reopen never skips the enter transition on the next open.
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsEntered(false);
  }, []);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Mounts the panel in its "closed" pose first, then flips to "open" a frame
  // later so the CSS transition below actually has something to animate from.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => setIsEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const displayName = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = (user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? "?").toUpperCase();

  const handleManageAccount = () => {
    closeMenu();
    openUserProfile();
  };

  const handleSignOut = async () => {
    closeMenu();
    await signOut({ redirectUrl: "/" });
    router.push("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
        disabled={!isLoaded}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-border/30 disabled:opacity-60"
      >
        {user?.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Clerk CDN avatar; app-wide convention is plain <img>, no next/image remote pattern configured
          <img
            src={user.imageUrl}
            alt={displayName}
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-inner">
            {initials}
          </div>
        )}
        <span className="truncate text-xs font-bold text-foreground">{displayName}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute left-0 top-full z-50 mt-2 w-64 origin-top-left rounded-xl border border-border bg-surface-elevated shadow-xl transition-all duration-150 ease-out ${
            isEntered ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1"
          }`}
        >
          {/* Identity header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            {user?.hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Clerk CDN avatar; app-wide convention is plain <img>, no next/image remote pattern configured
              <img
                src={user.imageUrl}
                alt={displayName}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-inner">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
              {email && <p className="truncate text-xs text-muted">{email}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              role="menuitem"
              onClick={handleManageAccount}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-border/30"
            >
              <Settings className="h-4 w-4 text-muted" />
              Manage Account
            </button>
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
