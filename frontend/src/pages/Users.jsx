import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { getUsers, createUser, updateUser, deleteUser, getTeams } from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null); // user object | 'new'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent', active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: uData }, { data: tData }] = await Promise.all([
        getUsers(),
        getTeams()
      ]);
      setUsers(uData);
      setTeams(tData);
    } catch (err) {
      toast.info('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function openModal(user = null) {
    if (user) {
      setModal(user);
      setForm({ name: user.name, email: user.email, password: '', role: user.role, active: user.active });
    } else {
      setModal('new');
      setForm({ name: '', email: '', password: '', role: 'agent', active: true });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'new') {
        await createUser(form);
      } else {
        await updateUser(modal.id, form);
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user) {
    try {
      await updateUser(user.id, { active: !user.active });
      load();
    } catch { toast.info('Erro ao mudar status'); }
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>👤 Gestão de Usuários</h1>
          <p style={s.subtitle}>Controle os acessos e permissões da sua equipe</p>
        </div>
        <button style={s.addBtn} onClick={() => openModal()}>+ Adicionar Agente</button>
      </header>

      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input 
            style={s.searchInput} 
            placeholder="Pesquisar por nome ou e-mail..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos os Status</option>
          <option value="active">Apenas Ativos</option>
          <option value="inactive">Arquivados</option>
        </select>
      </div>

      <div style={s.tableCard}>
        {loading ? (
          <div style={s.empty}>Carregando agentes...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>Nenhum usuário encontrado.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Nome</th>
                <th style={s.th}>E-mail</th>
                <th style={s.th}>Cargo</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.nameCell}>
                      <div style={s.avatar}>{u.name[0].toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>
                    <span style={{ 
                      ...s.roleBadge, 
                      background: u.role === 'admin' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)',
                      color: u.role === 'admin' ? '#D4AF37' : '#A0A0A0',
                      border: `1px solid ${u.role === 'admin' ? 'rgba(212, 175, 55, 0.3)' : '#333'}`
                    }}>
                      {u.role === 'admin' ? '👑 Administrador' : '🎧 Operador'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.statusCell}>
                      <span style={{ ...s.statusDot, background: u.active ? '#48bb78' : '#717171' }} />
                      <span style={{ color: u.active ? '#fff' : '#717171' }}>{u.active ? 'Ativo' : 'Arquivado'}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={s.actionGroup}>
                      <button style={s.actionBtn} onClick={() => openModal(u)} title="Editar">✏️</button>
                      <button 
                        style={{ ...s.actionBtn, color: u.active ? '#e53e3e' : '#48bb78', background: u.active ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)' }} 
                        onClick={() => handleToggleStatus(u)}
                        title={u.active ? 'Arquivar' : 'Reativar'}
                      >
                        {u.active ? '🚫' : '✅'}
                      </button>
                    </div>
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
              <h3 style={s.modalTitle}>{modal === 'new' ? '✨ Novo Agente' : '✏️ Editar Agente'}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={s.form}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Nome Completo</label>
                  <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: João Silva" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>E-mail de Acesso</label>
                  <input style={s.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="email@empresa.com" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Senha {modal !== 'new' && '(deixe em branco para manter)'}</label>
                  <input style={s.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={modal === 'new'} placeholder="••••••••" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cargo (Permissões)</label>
                  <select style={s.input} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="agent">Operador (Acesso aos Chats)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Processando...' : 'Salvar Alterações'}
                </button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.95rem', color: '#717171' },
  addBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', transition: 'transform 0.2s' },
  
  filterBar: { display: 'flex', gap: '1rem', marginBottom: '1.5rem' },
  searchWrap: { position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#717171' },
  searchInput: { width: '100%', background: '#1A1A1B', border: '1px solid #333', borderRadius: '12px', padding: '0.75rem 1rem 0.75rem 2.8rem', color: '#fff', outline: 'none', transition: 'border-color 0.2s' },
  select: { background: '#1A1A1B', border: '1px solid #333', borderRadius: '12px', padding: '0.75rem 1rem', color: '#fff', outline: 'none', cursor: 'pointer' },

  tableCard: { background: '#131314', borderRadius: '16px', border: '1px solid #2A2A2A', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thead: { background: '#1A1A1B', borderBottom: '1px solid #2A2A2A' },
  th: { padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #2A2A2A', transition: 'background 0.2s' },
  td: { padding: '1.25rem 1.5rem', fontSize: '0.95rem', color: '#fff' },
  
  nameCell: { display: 'flex', alignItems: 'center', gap: '1rem' },
  avatar: { width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' },
  roleBadge: { padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 },
  statusCell: { display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 8px currentColor' },
  actionGroup: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  actionBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.6rem', borderRadius: '10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  empty: { padding: '4rem', textAlign: 'center', color: '#717171' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1A1A1B', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '1px solid #333', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#717171', fontSize: '1.2rem', cursor: 'pointer' },
  form: { padding: '2rem' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.85rem', fontWeight: 700, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.02em' },
  input: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '0.85rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' },
  cancelBtn: { padding: '0.85rem 1.5rem', borderRadius: '12px', border: '1px solid #333', background: 'transparent', color: '#717171', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '0.85rem 1.5rem', borderRadius: '12px', border: 'none', background: '#D4AF37', color: '#000', cursor: 'pointer', fontWeight: 800 },
};
