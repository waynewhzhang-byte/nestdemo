import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-secondary/20">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                出错了
              </h1>
              <p className="text-muted-foreground">
                抱歉，发生了一些意外。请稍后再试。
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 rounded-lg bg-muted text-left text-sm font-mono overflow-auto max-h-40">
                <p className="text-destructive">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={this.handleReset}>
                重试
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新加载页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
