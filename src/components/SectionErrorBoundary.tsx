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
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>This section couldn&apos;t load.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-primary underline text-xs mt-1"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
