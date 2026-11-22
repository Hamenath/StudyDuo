import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
  detail?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string' && parsed.operationType) {
        return {
          hasError: true,
          message: 'A database permission or connectivity error occurred.',
          detail: `${parsed.operationType.toUpperCase()} on ${parsed.path || 'Firestore'}: ${parsed.error}`,
        };
      }
    } catch {
      // Not a JSON Firestore error
    }
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred in StudyDuo.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('StudyDuo ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-5">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E9EAF0] p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEECEE] text-[#E66F77]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-[#242337]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#66687A]">{this.state.message}</p>
            {this.state.detail && (
              <p className="mt-3 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-3 text-left font-mono text-xs text-[#66687A] break-words">
                {this.state.detail}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '', detail: undefined });
                window.location.reload();
              }}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload StudyDuo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
