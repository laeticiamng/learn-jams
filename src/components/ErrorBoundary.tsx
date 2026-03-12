import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="text-center space-y-4 max-w-md">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">An unexpected error occurred. Please reload the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
