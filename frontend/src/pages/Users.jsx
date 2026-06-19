import React, { useEffect, useState } from 'react';
import { BadgeCheck, Pencil, Plus, Search, Shield, Trash2, UserRound, UserX } from 'lucide-react';
import { toast } from '../utils/toast';
import api, { getUsers, createUser, updateUser, deleteUser, getTeams } from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [, setTeams] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent', active: true, firebirdSupportName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: uData }, { data: tData }, { data: techsData }] = await Promise.all([
        getUsers(), 
        getTeams(),
        api.get('/os/technicians').catch(() => ({ data: [] }))
      ]);
      setUsers(uData);
      setTeams(tData);
      setTechnicians(techsData);
    } catch (err) {
      toast.info('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function openModal(user = null) {
    if (user) {
      setModal(user);
      setForm({ name: user.name, email: user.email, password: '', role: user.role, active: user.active, firebirdSupportName: user.firebirdSupportName || '' });
      return;
    }

    setModal('new');
    setForm({ name: '', email: '', password: '', role: 'agent', active: true, firebirdSupportName: '' });
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
    } catch {
      toast.info('Erro ao mudar status');
    }
  }

  async function handleDelete(user) {
    toast.confirm(
      `Excluir o atendente ${user.name}? Essa acao remove o acesso dele e desvincula atendimentos anteriores.`,
      async () => {
        try {
          await deleteUser(user.id);
          toast.success('Atendente excluido com sucesso');
          load();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Erro ao excluir atendente');
        }
      }
    );
  }

  const filtered = users.filter((user) => {
    const term = search.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.active : !user.active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <p style={s.kicker}>Administracao</p>
          <h1 style={s.title}>Gestao de usuarios</h1>
          <p style={s.subtitle}>Controle acessos, cargos e status da equipe em um fluxo mais claro.</p>
        </div>
        <button style={s.addBtn} onClick={() => openModal()}>
          <Plus size={16} />
          Adicionar agente
        </button>
      </header>

      <section style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={16} style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Pesquisar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos os status</option>
          <option value="active">Apenas ativos</option>
          <option value="inactive">Arquivados</option>
        </select>
      </section>

      <div style={s.tableCard}>
        {loading ? (
          <div style={s.empty}>Carregando agentes...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>Nenhum usuario encontrado.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Nome</th>
                <th style={s.th}>E-mail</th>
                <th style={s.th}>Cargo</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isAdmin = user.role === 'admin';
                return (
                  <tr key={user.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.nameCell}>
                        <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
                        <div>
                          <div style={s.nameText}>{user.name}</div>
                          <div style={s.metaText}>{user.active ? 'Disponivel' : 'Arquivado'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>{user.email}</td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.roleBadge,
                          ...(isAdmin ? s.roleBadgeAdmin : s.roleBadgeAgent),
                        }}
                      >
                        {isAdmin ? <Shield size={14} /> : <UserRound size={14} />}
                        {isAdmin ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.statusCell}>
                        <span style={{ ...s.statusDot, ...(user.active ? s.statusActive : s.statusInactive) }} />
                        <span style={user.active ? s.statusTextActive : s.statusTextInactive}>
                          {user.active ? 'Ativo' : 'Arquivado'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={s.actionGroup}>
                        <button style={s.actionBtn} onClick={() => openModal(user)} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          style={{ ...s.actionBtn, ...(user.active ? s.actionWarn : s.actionSuccess) }}
                          onClick={() => handleToggleStatus(user)}
                          title={user.active ? 'Arquivar' : 'Reativar'}
                        >
                          {user.active ? <UserX size={16} /> : <BadgeCheck size={16} />}
                        </button>
                        <button
                          style={{ ...s.actionBtn, ...s.actionDanger }}
                          onClick={() => handleDelete(user)}
                          title="Excluir atendente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalKicker}>{modal === 'new' ? 'Novo cadastro' : 'Editar acesso'}</p>
                <h3 style={s.modalTitle}>{modal === 'new' ? 'Adicionar agente' : 'Atualizar agente'}</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(null)}>
                x
              </button>
            </div>

            <form onSubmit={handleSave} style={s.form}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Nome completo</label>
                  <input
                    style={s.input}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ex: Joao Silva"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>E-mail de acesso</label>
                  <input
                    style={s.input}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="email@empresa.com"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Senha {modal !== 'new' && '(deixe em branco para manter)'}</label>
                  <input
                    style={s.input}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={modal === 'new'}
                    placeholder="********"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Cargo</label>
                  <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="agent">Operador (acesso aos chats)</option>
                    <option value="admin">Administrador (acesso total)</option>
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Atendente ILUX (Nome Exato)</label>
                  <select style={s.input} value={form.firebirdSupportName} onChange={(e) => setForm({ ...form, firebirdSupportName: e.target.value })}>
                    <option value="">Nenhum / Mesmo do sistema</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Processando...' : 'Salvar alteracoes'}
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
  container: {
    padding: '2.5rem',
    flex: 1,
    overflowY: 'auto',
    background: 'var(--bg-base)',
    color: 'var(--text-main)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: '0 0 0.4rem',
    color: 'var(--accent)',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: '1.9rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    margin: '0 0 0.55rem',
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    maxWidth: '40rem',
    lineHeight: 1.6,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
    padding: '0.85rem 1.2rem',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.92rem',
  },
  filterBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 18rem',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)',
  },
  searchInput: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.85rem 1rem 0.85rem 2.7rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
  },
  select: {
    minWidth: '13rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  tableCard: {
    background: 'var(--bg-surface)',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thead: {
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '1.15rem 1.4rem',
    fontSize: '0.78rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  td: {
    padding: '1.2rem 1.4rem',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.95rem',
    flexShrink: 0,
  },
  nameText: {
    fontWeight: 700,
    color: 'var(--text-main)',
    marginBottom: '0.2rem',
  },
  metaText: {
    fontSize: '0.8rem',
    color: 'var(--text-dim)',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.42rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 700,
    border: '1px solid transparent',
  },
  roleBadgeAdmin: {
    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    color: 'var(--accent)',
    borderColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
  },
  roleBadgeAgent: {
    background: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-color)',
  },
  statusCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    fontSize: '0.86rem',
    fontWeight: 700,
  },
  statusDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
  },
  statusActive: {
    background: '#2fb171',
    boxShadow: '0 0 10px rgba(47, 177, 113, 0.45)',
  },
  statusInactive: {
    background: 'var(--text-dim)',
  },
  statusTextActive: {
    color: 'var(--text-main)',
  },
  statusTextInactive: {
    color: 'var(--text-muted)',
  },
  actionGroup: {
    display: 'flex',
    gap: '0.55rem',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: '38px',
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    borderRadius: '12px',
  },
  actionWarn: {
    color: '#d16f55',
  },
  actionSuccess: {
    color: '#2fb171',
  },
  actionDanger: {
    color: '#d85f5f',
    background: 'color-mix(in srgb, #d85f5f 10%, var(--bg-panel))',
  },
  empty: {
    padding: '4rem 1.5rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1.5rem',
    backdropFilter: 'blur(6px)',
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '34rem',
    border: '1px solid var(--border-color)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
  },
  modalHeader: {
    padding: '1.5rem 1.8rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  modalKicker: {
    margin: '0 0 0.35rem',
    color: 'var(--accent)',
    fontSize: '0.74rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.2rem',
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
  form: {
    padding: '1.8rem',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '0.9rem 1rem',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.85rem',
    marginTop: '1.8rem',
  },
  cancelBtn: {
    padding: '0.9rem 1.3rem',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveBtn: {
    padding: '0.9rem 1.3rem',
    borderRadius: '14px',
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    cursor: 'pointer',
    fontWeight: 800,
  },
};
