import React, { useEffect, useState } from 'react';
import { getTenants, createTenant, updateTenant, uploadFile } from '../services/api';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'new' | tenant object
  const [form, setForm] = useState({ name: '', slug: '', plan: 'trial', primaryColor: '#D4AF37', logoUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getTenants();
      setTenants(data);
    } catch (e) {
      alert('Erro ao carregar empresas. Verifique se você tem permissão de SuperAdmin.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(t = null) {
    if (t) {
      setModal(t);
      setForm({ name: t.name, slug: t.slug, plan: t.plan, primaryColor: t.primaryColor || '#D4AF37', logoUrl: t.logoUrl || '' });
    } else {
      setModal('new');
      setForm({ name: '', slug: '', plan: 'trial', primaryColor: '#D4AF37', logoUrl: '' });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'new') {
        await createTenant(form);
      } else {
        await updateTenant(modal.id, form);
      }
      setModal(null);
      load();
    } catch (e) {
      alert('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t) {
    try {
      await updateTenant(t.id, { active: !t.active });
      load();
    } catch (e) { alert('Erro ao mudar status'); }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const { data } = await uploadFile(file);
      const apiBase = 'http://localhost:3002'; // Idealmente viria de um .env
      setForm({ ...form, logoUrl: `${apiBase}${data.url}` });
    } catch (e) {
      alert('Erro ao fazer upload da logo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>👑 Gestão SaaS (SuperAdmin)</h1>
          <p style={s.subtitle}>Gerenciamento global de empresas e planos da plataforma</p>
        </div>
        <button style={s.addBtn} onClick={() => openModal()}>+ Nova Empresa</button>
      </header>

      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statVal}>{tenants.length}</div>
          <div style={s.statLabel}>Empresas Totais</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statVal}>{tenants.filter(t => t.active).length}</div>
          <div style={s.statLabel}>Empresas Ativas</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#D4AF37' }}>{tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0)}</div>
          <div style={s.statLabel}>Usuários Totais</div>
        </div>
      </div>

      <div style={s.tableCard}>
        {loading ? (
          <div style={s.empty}>Carregando ecossistema...</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Empresa</th>
                <th style={s.th}>Link de Acesso (Login)</th>
                <th style={s.th}>Plano</th>
                <th style={s.th}>Usuários</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#555' }}>ID: {t.id}</div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <code style={s.code}>{`/${t.slug}/login`}</code>
                       <button 
                         onClick={() => {
                           const url = `${window.location.origin}/${t.slug}/login`;
                           navigator.clipboard.writeText(url);
                           alert(`Link da empresa ${t.name} copiado!`);
                         }}
                         style={{ ...s.actionBtn, fontSize: '0.9rem', color: '#D4AF37' }}
                         title="Copiar URL Completa"
                       >
                         📋
                       </button>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: t.plan === 'enterprise' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)', color: t.plan === 'enterprise' ? '#D4AF37' : '#aaa' }}>
                      {t.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={s.td}>{t._count?.users || 0}</td>
                  <td style={s.td}>
                    <div style={s.statusCell}>
                      <span style={{ ...s.statusDot, background: t.active ? '#48bb78' : '#717171' }} />
                      {t.active ? 'Ativa' : 'Bloqueada'}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.actionBtn} onClick={() => openModal(t)}>✏️</button>
                    <button style={{ ...s.actionBtn, color: t.active ? '#e53e3e' : '#48bb78' }} onClick={() => toggleActive(t)}>
                      {t.active ? '🚫' : '✅'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{modal === 'new' ? '✨ Nova Empresa' : '✏️ Editar Empresa'}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome da Empresa</label>
                <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Brasil Ads" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Slug (Subdomínio/Identificador)</label>
                <input style={s.input} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required placeholder="ex-brasil-ads" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={s.field}>
                  <label style={s.label}>Plano SaaS</label>
                  <select style={s.input} value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                    <option value="trial">Trial (Grátis)</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise (Elite)</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cor Principal</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" style={{ ...s.input, width: '48px', height: '42px', padding: '4px' }} value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
                    <input style={{ ...s.input, flex: 1 }} value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} placeholder="#HEX" />
                  </div>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Logotipo (URL ou Upload)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={{ ...s.input, flex: 1 }} value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
                  <label style={s.uploadBtn}>
                    {saving ? '...' : '📁 Importar'}
                    <input type="file" style={{ display: 'none' }} onChange={handleLogoUpload} accept="image/*" />
                  </label>
                </div>
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Processando...' : 'Salvar Alterações'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: '#0F0F0F', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.95rem', color: '#717171' },
  addBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' },
  
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  statCard: { background: '#1A1A1B', padding: '1.5rem', borderRadius: '16px', border: '1px solid #2A2A2A', textAlign: 'center' },
  statVal: { fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.2rem' },
  statLabel: { fontSize: '0.8rem', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.05em' },

  tableCard: { background: '#131314', borderRadius: '16px', border: '1px solid #2A2A2A', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thead: { background: '#1A1A1B', borderBottom: '1px solid #2A2A2A' },
  th: { padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.1em' },
  tr: { borderBottom: '1px solid #222', transition: 'background 0.2s' },
  td: { padding: '1.25rem 1.5rem', fontSize: '0.9rem' },
  code: { background: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', color: '#D4AF37' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 },
  statusCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 8px' },

  empty: { padding: '5rem', textAlign: 'center', color: '#717171' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1A1A1B', borderRadius: '24px', width: '100%', maxWidth: '450px', border: '1px solid #333' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#717171', fontSize: '1.2rem', cursor: 'pointer' },
  form: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.75rem', fontWeight: 800, color: '#717171', textTransform: 'uppercase' },
  input: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '0.85rem 1rem', color: '#fff', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#717171', cursor: 'pointer' },
  saveBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#D4AF37', color: '#000', cursor: 'pointer', fontWeight: 800 },
  uploadBtn: { background: '#131314', border: '1px solid #333', borderRadius: '12px', padding: '0.75rem 1rem', color: '#D4AF37', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', transition: 'background 0.2s', ':hover': { background: '#1A1A1B' } }
};
