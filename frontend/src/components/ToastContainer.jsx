import React, { useState, useEffect, useCallback } from 'react';
import { _setHandlers } from '../utils/toast';
import { CheckCircle, XCircle, Info, AlertTriangle, X, AlertCircle } from 'lucide-react';

/**
 * ToastContainer — deve ser montado uma vez dentro do Layout.
 * Ele registra os handlers do toast.js e renderiza todos os toasts/confirms ativos.
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, t.duration || 4000);
  }, []);

  const addConfirm = useCallback((c) => {
    setConfirm(c);
  }, []);

  useEffect(() => {
    _setHandlers(addToast, addConfirm);
  }, [addToast, addConfirm]);

  const removeToast = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: '#10b981', text: '#6ee7b7' },
    error:   { bg: 'rgba(229, 62, 62, 0.12)',  border: 'rgba(229, 62, 62, 0.3)',  icon: '#e53e3e', text: '#fc8181' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', icon: '#f59e0b', text: '#fcd34d' },
    info:    { bg: 'rgba(212, 175, 55, 0.10)', border: 'rgba(212, 175, 55, 0.25)', icon: '#D4AF37', text: '#F2D06B' },
  };

  return (
    <>
      {/* Toast stack */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div
              key={t.id}
              style={{
                background: 'var(--bg-panel)',
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.icon}`,
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'all',
              }}
            >
              <span style={{ color: c.icon, marginTop: '1px', flexShrink: 0 }}>
                {icons[t.type] || icons.info}
              </span>
              <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)',
                  cursor: 'pointer', padding: '0', flexShrink: 0, display: 'flex',
                  alignItems: 'center', marginTop: '1px'
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99998,
          animation: 'toast-in 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '420px',
            width: 'calc(100vw - 40px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
              <span style={{
                background: 'rgba(229,62,62,0.1)',
                border: '1px solid rgba(229,62,62,0.2)',
                borderRadius: '12px',
                padding: '10px',
                display: 'flex',
              }}>
                <AlertCircle size={22} color="#e53e3e" />
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Confirmação
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
              {confirm.message}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { confirm.onCancel?.(); setConfirm(null); }}
                style={{
                  flex: 1, padding: '0.85rem',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { confirm.onConfirm?.(); setConfirm(null); }}
                style={{
                  flex: 1, padding: '0.85rem',
                  background: '#e53e3e',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  );
}
