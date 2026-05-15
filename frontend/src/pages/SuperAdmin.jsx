import React, { useEffect, useState } from 'react';
import { Building2, Copy, Pencil, Plus, Power, Upload, Users, Wifi } from 'lucide-react';
import { toast } from '../utils/toast';
import { getTenants, createTenant, updateTenant, uploadFile, getMediaUrl } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';
import SurfaceCard from '../components/ui/SurfaceCard';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'trial',
    primaryColor: '#D4AF37',
    logoUrl: '',
    maxConnections: 1,
    maxUsers: 5,
  });
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
      toast.info('Erro ao carregar empresas. Verifique se voce tem permissao de superadmin.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(tenant = null) {
    if (tenant) {
      setModal(tenant);
      setForm({
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        primaryColor: tenant.primaryColor || '#D4AF37',
        logoUrl: tenant.logoUrl || '',
        maxConnections: tenant.maxConnections || 1,
        maxUsers: tenant.maxUsers || 5,
      });
      return;
    }

    setModal('new');
    setForm({
      name: '',
      slug: '',
      plan: 'trial',
      primaryColor: '#D4AF37',
      logoUrl: '',
      maxConnections: 1,
      maxUsers: 5,
    });
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
      toast.info('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(tenant) {
    try {
      await updateTenant(tenant.id, { active: !tenant.active });
      load();
    } catch (e) {
      toast.info('Erro ao mudar status');
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const { data } = await uploadFile(file);
      setForm({ ...form, logoUrl: data.url });
    } catch (e) {
      toast.info('Erro ao fazer upload da logo');
    } finally {
      setSaving(false);
    }
  }

  const totalUsers = tenants.reduce((acc, tenant) => acc + (tenant._count?.users || 0), 0);

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Operacao global"
        title="Gestao SaaS"
        subtitle="Gerencie empresas, planos e limites da plataforma a partir de uma camada administrativa unica."
        actions={
          <ActionButton onClick={() => openModal()}>
            <Plus size={18} />
            Nova empresa
          </ActionButton>
        }
      />

      <div style={s.statsRow}>
        <SurfaceCard style={s.statCard}>
          <Building2 size={18} style={s.statIcon} />
          <div style={s.statVal}>{tenants.length}</div>
          <div style={s.statLabel}>Empresas totais</div>
        </SurfaceCard>
        <SurfaceCard style={s.statCard}>
          <Power size={18} style={s.statIcon} />
          <div style={s.statVal}>{tenants.filter((tenant) => tenant.active).length}</div>
          <div style={s.statLabel}>Empresas ativas</div>
        </SurfaceCard>
        <SurfaceCard style={s.statCard}>
          <Users size={18} style={s.statIcon} />
          <div style={{ ...s.statVal, color: 'var(--accent)' }}>{totalUsers}</div>
          <div style={s.statLabel}>Usuarios totais</div>
        </SurfaceCard>
      </div>

      <SurfaceCard style={s.tableCard}>
        {loading ? (
          <div style={s.empty}>Carregando ecossistema...</div>
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={<Building2 size={22} />}
            title="Nenhuma empresa cadastrada"
            description="Crie a primeira empresa para iniciar a operacao multi-tenant da plataforma."
          />
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Empresa</th>
                <th style={s.th}>Acesso</th>
                <th style={s.th}>Plano</th>
                <th style={s.th}>Limites</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.companyCell}>
                      <div style={s.logoThumb}>
                        {tenant.logoUrl ? (
                          <img src={getMediaUrl(tenant.logoUrl)} alt={tenant.name} style={s.logoImg} />
                        ) : (
                          <Building2 size={16} />
                        )}
                      </div>
                      <div>
                        <div style={s.companyName}>{tenant.name}</div>
                        <div style={s.companyMeta}>ID: {tenant.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={s.linkCell}>
                      <code style={s.code}>{`/${tenant.slug}/login`}</code>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/${tenant.slug}/login`;
                          navigator.clipboard.writeText(url);
                          toast.success(`Link da empresa ${tenant.name} copiado`);
                        }}
                        style={s.inlineIconBtn}
                        title="Copiar URL completa"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span
                      style={{
                        ...s.badge,
                        ...(tenant.plan === 'enterprise' ? s.badgeAccent : s.badgeMuted),
                      }}
                    >
                      {tenant.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.limitRow}>
                      <Users size={14} />
                      {tenant._count?.users || 0} / <strong>{tenant.maxUsers}</strong>
                    </div>
                    <div style={s.limitRow}>
                      <Wifi size={14} />
                      {tenant._count?.instances || 0} / <strong>{tenant.maxConnections}</strong>
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={s.statusCell}>
                      <span style={{ ...s.statusDot, background: tenant.active ? '#48bb78' : 'var(--text-dim)' }} />
                      {tenant.active ? 'Ativa' : 'Bloqueada'}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={s.actions}>
                      <button style={s.iconBtn} onClick={() => openModal(tenant)} title="Editar empresa">
                        <Pencil size={16} />
                      </button>
                      <button
                        style={{ ...s.iconBtn, color: tenant.active ? '#d85f5f' : '#2fb171' }}
                        onClick={() => toggleActive(tenant)}
                        title={tenant.active ? 'Bloquear empresa' : 'Reativar empresa'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SurfaceCard>

      {modal ? (
        <ModalShell
          kicker={modal === 'new' ? 'Nova empresa' : 'Editar empresa'}
          title={modal === 'new' ? 'Criar tenant da plataforma' : 'Atualizar tenant da plataforma'}
          onClose={() => setModal(null)}
          maxWidth="34rem"
        >
          <form onSubmit={handleSave} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Nome da empresa</label>
              <input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Brasil Ads" />
            </div>

            <div style={s.field}>
              <label style={s.label}>Slug</label>
              <input style={s.input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="ex-brasil-ads" />
            </div>

            <div style={s.twoCols}>
              <div style={s.field}>
                <label style={s.label}>Plano SaaS</label>
                <select style={s.input} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Cor principal</label>
                <div style={s.colorRow}>
                  <input
                    type="color"
                    style={{ ...s.input, width: '48px', height: '42px', padding: '4px' }}
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  />
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    placeholder="#HEX"
                  />
                </div>
              </div>
            </div>

            <div style={s.twoCols}>
              <div style={s.field}>
                <label style={s.label}>Max conexoes</label>
                <input type="number" style={s.input} value={form.maxConnections} onChange={(e) => setForm({ ...form, maxConnections: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Max usuarios</label>
                <input type="number" style={s.input} value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Logotipo (URL ou upload)</label>
              <div style={s.logoRow}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
                <label style={s.uploadBtn}>
                  <Upload size={14} />
                  {saving ? 'Enviando' : 'Importar'}
                  <input type="file" style={{ display: 'none' }} onChange={handleLogoUpload} accept="image/*" />
                </label>
              </div>
            </div>

            <div style={s.modalFooter}>
              <ActionButton variant="secondary" onClick={() => setModal(null)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" disabled={saving}>
                {saving ? 'Processando...' : 'Salvar alteracoes'}
              </ActionButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

const s = {
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  statCard: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  statIcon: { color: 'var(--accent)' },
  statVal: { fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-main)' },
  statLabel: { fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 },
  tableCard: { padding: 0, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thead: { background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' },
  th: { padding: '1.1rem 1.35rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '1.15rem 1.35rem', fontSize: '0.92rem', color: 'var(--text-main)', verticalAlign: 'middle' },
  companyCell: { display: 'flex', alignItems: 'center', gap: '0.9rem' },
  logoThumb: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  companyName: { fontWeight: 800, color: 'var(--text-main)' },
  companyMeta: { fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' },
  linkCell: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  code: {
    background: 'var(--bg-panel)',
    padding: '0.35rem 0.55rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: 'var(--accent)',
    border: '1px solid var(--border-color)',
  },
  inlineIconBtn: {
    width: '34px',
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent)',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  badge: { padding: '0.38rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid transparent' },
  badgeAccent: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    borderColor: 'var(--accent-border)',
  },
  badgeMuted: {
    background: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-color)',
  },
  limitRow: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.85rem' },
  statusCell: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' },
  iconBtn: {
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    borderRadius: '12px',
  },
  empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' },
  form: { padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.9rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  },
  twoCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  colorRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  logoRow: { display: 'flex', gap: '8px', alignItems: 'stretch' },
  uploadBtn: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.75rem 1rem',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.5rem' },
};
