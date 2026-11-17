import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error) {
    console.error('Application boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#131316] border border-white/10 p-6 text-center space-y-4">
            <h1 className="text-lg font-bold text-white">Something went wrong</h1>
            <p className="text-xs text-zinc-400 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
            >
              Reload Domain Hunter
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
