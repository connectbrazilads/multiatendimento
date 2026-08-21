import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../auth/PermissionContext';

export default function Forbidden() {
  const { homePage } = usePermissions();
  return (
    <main style={{ minHeight: 'calc(100vh - 68px)', display: 'grid', placeItems: 'center', padding: '2rem', background: 'var(--bg-base)' }}>
      <section style={{ width: 'min(100%, 460px)', padding: '2rem', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: 18, background: 'var(--bg-panel)', color: 'var(--text-main)' }}>
        <LockKeyhole size={34} color="var(--accent)" />
        <h1 style={{ fontSize: '1.35rem' }}>Acesso não autorizado</h1>
        <p style={{ color: 'var(--text-muted)' }}>Seu perfil não possui permissão para abrir esta área. Se precisar, solicite o acesso a um administrador.</p>
        <Link to={homePage} style={{ display: 'inline-flex', padding: '.7rem 1rem', borderRadius: 10, background: 'var(--accent)', color: 'var(--text-inverse)', textDecoration: 'none', fontWeight: 800 }}>Voltar para minha página inicial</Link>
      </section>
    </main>
  );
}
