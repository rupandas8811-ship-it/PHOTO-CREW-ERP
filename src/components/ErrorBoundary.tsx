import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-zinc-950 border border-red-900/50 rounded-2xl text-center space-y-4 my-4 max-w-xl mx-auto shadow-2xl text-zinc-100">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans">
              {this.props.fallbackTitle || 'Unable to display card details'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 font-mono break-words">
              {this.state.error?.message || 'A temporary issue occurred while rendering this view.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors border border-zinc-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Close & Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
