import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', margin: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255, 39, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <AlertTriangle size={30} color="#FF2744" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Oops! Terjadi Kesalahan</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20, maxWidth: 250, lineHeight: 1.5 }}>
            Gagal memuat komponen ini. Pastikan koneksi internet Anda stabil.
          </p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#FF2744', color: '#fff', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
