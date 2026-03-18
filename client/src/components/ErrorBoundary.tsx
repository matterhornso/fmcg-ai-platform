import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-100 p-6">
          <div className="card max-w-md w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-danger-500" />
            </div>
            <h1 className="text-xl font-bold text-surface-800">Something went wrong</h1>
            <p className="text-sm text-surface-500">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            {this.state.error && (
              <div className="bg-surface-50 rounded-lg p-3 border border-surface-200 text-left">
                <p className="text-xs font-mono text-surface-500 break-all">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
