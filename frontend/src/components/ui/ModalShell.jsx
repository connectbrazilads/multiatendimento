import React from 'react';

export default function ModalShell({ kicker, title, children, onClose, maxWidth = '34rem' }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth }}>
        <div style={s.header}>
          <div>
            {kicker ? <p style={s.kicker}>{kicker}</p> : null}
            <h3 style={s.title}>{title}</h3>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
    padding: '1.5rem',
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: '24px',
    width: '100%',
    border: '1px solid var(--border-color)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.5rem 1.8rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  kicker: {
    margin: '0 0 0.35rem',
    color: 'var(--accent)',
    fontSize: '0.74rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: '1.18rem',
    fontWeight: 800,
    color: 'var(--text-main)',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    cursor: 'pointer',
  },
};
