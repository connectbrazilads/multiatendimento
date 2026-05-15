import React from 'react';

export default function ActionButton({
  children,
  type = 'button',
  variant = 'primary',
  style,
  ...props
}) {
  const variantStyle = variants[variant] || variants.primary;
  return (
    <button type={type} style={{ ...base, ...variantStyle, ...style }} {...props}>
      {children}
    </button>
  );
}

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.55rem',
  padding: '0.85rem 1.2rem',
  borderRadius: '14px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '0.92rem',
  transition: 'all 0.2s ease',
};

const variants = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
  },
  subtle: {
    background: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
  },
  danger: {
    background: 'color-mix(in srgb, #d85f5f 10%, var(--bg-panel))',
    color: '#d85f5f',
    border: '1px solid color-mix(in srgb, #d85f5f 28%, transparent)',
  },
};
