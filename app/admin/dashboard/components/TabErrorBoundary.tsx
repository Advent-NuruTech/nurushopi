"use client";

import React from "react";

interface TabErrorBoundaryProps {
  tabLabel: string;
  children: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
}

export default class TabErrorBoundary extends React.Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  state: TabErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): TabErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: TabErrorBoundaryProps): void {
    if (prevProps.tabLabel !== this.props.tabLabel && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-900/20">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Tab failed to render</h2>
          <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">
            Reload this tab or switch to another section.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
