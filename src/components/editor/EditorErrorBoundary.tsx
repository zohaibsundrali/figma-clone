"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error("[EditorErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background text-center">
          <div className="rounded-xl border border-red-600/30 bg-red-600/10 px-8 py-6">
            <h2 className="mb-2 text-base font-semibold text-red-400">
              The canvas ran into a problem
            </h2>
            <p className="mb-4 max-w-sm text-xs text-muted">
              {this.state.message}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-xs font-medium transition-colors hover:bg-border"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
