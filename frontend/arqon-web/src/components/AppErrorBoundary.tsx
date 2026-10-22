import { Component, type ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("UI error", error); }
  render() {
    if (this.state.failed) {
      return (
        <div className="p-8">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <button className="btn btn-primary mt-4" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
