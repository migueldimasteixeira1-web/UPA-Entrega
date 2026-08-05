import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { buttonClassName } from './Button';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-base font-semibold text-slate-800 mb-1">Algo deu errado</h1>
          <p className="text-sm text-slate-500 mb-6">
            Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClassName('primary', 'md')}
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
