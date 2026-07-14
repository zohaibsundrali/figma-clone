"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, Filter, Calendar } from "lucide-react";
import type { DesignFileSummary } from "@/types";

interface SearchAndFiltersProps {
  files: DesignFileSummary[];
  onFilterChange: (filtered: DesignFileSummary[]) => void;
}

export function SearchAndFilters({ files, onFilterChange }: SearchAndFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "week" | "month" | "year">("all");
  const [filterStarred, setFilterStarred] = useState<"all" | "starred" | "unstarred">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "name-asc" | "name-desc">("recent");
  // Debounce ref — avoids re-filtering on every keypress
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyFilters = useCallback(() => {
    let filtered = [...files];

    // Search by name
    if (searchQuery.trim()) {
      filtered = filtered.filter((f) =>
        f.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    if (filterDateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filterDateRange) {
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter((f) => {
        const fileDate = new Date(f.createdAt);
        return fileDate >= cutoffDate;
      });
    }

    // Filter by starred
    if (filterStarred === "starred") {
      filtered = filtered.filter((f) => f.isStarred);
    } else if (filterStarred === "unstarred") {
      filtered = filtered.filter((f) => !f.isStarred);
    }

    // Sort
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case "name-asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    onFilterChange(filtered);
  }, [files, searchQuery, filterDateRange, filterStarred, sortBy, onFilterChange]);

  // Re-apply whenever the filter params or file list changes.
  // A 50ms debounce on searchQuery avoids firing on every keypress.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters(), searchQuery ? 50 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [applyFilters]);

  return (
    <>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full bg-surface-elevated border border-border rounded-lg pl-9 pr-3 py-2 text-sm placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggle & Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-sm font-medium transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
          }}
          className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-sm focus:border-accent outline-none transition-colors"
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-3 rounded-lg bg-surface-elevated border border-border space-y-3">
          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Created
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["all", "week", "month", "year"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setFilterDateRange(range);
                  }}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterDateRange === range
                      ? "bg-accent text-white"
                      : "bg-surface hover:bg-border text-foreground"
                  }`}
                >
                  {range === "all" ? "All Time" : range === "week" ? "Last Week" : range === "month" ? "Last Month" : "Last Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Starred Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "starred", "unstarred"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStarred(status);
                  }}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterStarred === status
                      ? "bg-accent text-white"
                      : "bg-surface hover:bg-border text-foreground"
                  }`}
                >
                  {status === "all" ? "All" : status === "starred" ? "⭐ Starred" : "Unstarred"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
