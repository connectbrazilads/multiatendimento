import React, { useState, useEffect, useCallback } from 'react';
import { _setHandlers } from '../utils/toast';
import { CheckCircle, XCircle, Info, AlertTriangle, X, AlertCircle } from 'lucide-react';
import ActionButton from './ui/ActionButton';
import ModalShell from './ui/ModalShell';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, toast.duration || 4000);
  }, []);

  const addConfirm = useCallback((payload) => {
    setConfirm(payload);
  }, []);

  useEffect(() => {
    _setHandlers(addToast, addConfirm);
  }, [addToast, addConfirm]);

  function removeToast(id) {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const colors = {
    success: { border: 'rgba(16, 185, 129, 0.28)', icon: '#10b981' },
    error: { border: 'rgba(229, 62, 62, 0.28)', icon: '#e53e3e' },
    warning: { border: 'rgba(245, 158, 11, 0.28)', icon: '#f59e0b' },
    info: { border: 'rgba(212, 175, 55, 0.25)', icon: 'var(--accent)' },
  };

  return (
    <>
      <div style={s.stack}>
        {toasts.map((toast) => {
          const color = colors[toast.type] || colors.info;
          return (
            <div key={toast.id} style={{ ...s.toast, borderColor: color.border, borderLeft: `4px solid ${color.icon}` }}>
              <span style={{ ...s.iconWrap, color: color.icon }}>{icons[toast.type] || icons.info}</span>
              <div style={s.message}>{toast.message}</div>
              <button onClick={() => removeToast(toast.id)} style={s.closeBtn}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {confirm ? (
        <ModalShell kicker="Confirmacao" title="Confirmar acao" onClose={() => setConfirm(null)} maxWidth="28rem">
          <div style={s.confirmBody}>
            <div style={s.confirmIconBox}>
              <AlertCircle size={22} color="#e53e3e" />
            </div>
            <p style={s.confirmText}>{confirm.message}</p>
            <div style={s.confirmActions}>
              <ActionButton
                variant="secondary"
                onClick={() => {
                  confirm.onCancel?.();
                  setConfirm(null);
                }}
              >
                Cancelar
              </ActionButton>
              <ActionButton
                variant="danger"
                onClick={() => {
                  confirm.onConfirm?.();
                  setConfirm(null);
                }}
              >
                Confirmar
              </ActionButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  );
}

const s = {
  stack: {
    position: 'fixed',
    top: '84px',
    right: '20px',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '380px',
    width: 'calc(100vw - 40px)',
    pointerEvents: 'none',
  },
  toast: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '0.95rem 1rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.8rem',
    boxShadow: '0 18px 36px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(12px)',
    animation: 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'all',
  },
  iconWrap: {
    marginTop: '1px',
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '12px',
    background: 'var(--bg-panel)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    lineHeight: 1.5,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    marginTop: '2px',
  },
  confirmBody: {
    padding: '1.8rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  confirmIconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: 'rgba(229,62,62,0.1)',
    border: '1px solid rgba(229,62,62,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  confirmActions: {
    display: 'flex',
    gap: '0.85rem',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: '0.25rem',
  },
};
