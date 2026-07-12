"use client";

import { useState } from "react";
import { Menu, X, Home, Settings, BarChart3, LogOut } from "lucide-react";
import Link from "next/link";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: Home, href: "/dashboard" },
    { label: "Analytics", icon: BarChart3, href: "/dashboard?tab=analytics" },
    { label: "Workspace", icon: Settings, href: "/dashboard?tab=workspace" },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-surface border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
        <h1 className="font-bold text-lg">Figma Clone</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-border rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <nav className="fixed inset-0 top-14 z-40 bg-surface border-b border-border md:hidden">
          <div className="flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-border transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}

            <div className="h-px bg-border my-2" />

            <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors w-full text-left">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
