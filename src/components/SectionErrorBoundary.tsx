import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual page sections.
 * If a section crashes, it is hidden gracefully instead of bringing down the entire page.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary${this.props.name ? ` / ${this.props.name}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — the section is simply skipped.
      // For critical sections we could render a fallback UI here.
      return null;
    }
    return this.props.children;
  }
}
