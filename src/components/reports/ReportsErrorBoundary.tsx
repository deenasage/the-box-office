// SPEC: reports.md
"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface State {
  error: string | null;
}

interface Props {
  children: ReactNode;
}

export class ReportsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(e: Error): State {
    return { error: e.message };
  }

  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error("[Reports]", e, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-lg bg-destructive/10 text-destructive text-sm font-mono">
          <p className="font-bold mb-2">Reports page crashed:</p>
          <pre className="whitespace-pre-wrap break-words">{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
