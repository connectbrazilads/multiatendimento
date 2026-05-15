import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus, Users, X } from 'lucide-react';
import { toast } from '../utils/toast';
import { getTeams, createTeam, updateTeam, deleteTeam, getUsers, addTeamMember, removeTeamMember } from '../services/api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [name, setName] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [teamsResponse, usersResponse] = await Promise.all([getTeams(), getUsers()]);
      setTeams(teamsResponse.data);
      setUsers(usersResponse.data);
    } catch (err) {
      toast.info('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTeam(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedTeam) {
        await updateTeam(selectedTeam.id, { name });
      } else {
        await createTeam({ name });
      }
      setModal(null);
      load();
    } catch (err) {
      toast.info('Erro ao salvar equipe');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam(id) {
    toast.confirm('Excluir esta equipe permanentemente?', async () => {
      try {
        await deleteTeam(id);
        load();
      } catch (err) {
        toast.info('Erro ao excluir');
      }
    });
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    try {
      await addTeamMember(selectedTeam.id, selectedUser);
      setModal(null);
      load();
    } catch (err) {
      toast.info('Agente ja faz parte desta equipe');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(teamId, userId) {
    toast.confirm('Remover este agente da equipe?', async () => {
      try {
        await removeTeamMember(teamId, userId);
        load();
      } catch (err) {
        toast.info('Erro ao remover');
      }
    });
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <p style={s.kicker}>Estrutura operacional</p>
          <h1 style={s.title}>Equipes e departamentos</h1>
          <p style={s.subtitle}>Organize os agentes por setor e distribua a operacao com mais clareza.</p>
        </div>
        <button
          style={s.addBtn}
          onClick={() => {
            setSelectedTeam(null);
            setName('');
            setModal('team');
          }}
        >
          <Plus size={18} />
          Criar equipe
        </button>
      </header>

      {loading ? (
        <div style={s.empty}>Carregando estrutura organizacional...</div>
      ) : (
        <div style={s.grid}>
          {teams.map((team) => (
            <section key={team.id} style={s.teamCard}>
              <div style={s.teamHeader}>
                <div>
                  <h3 style={s.teamName}>{team.name}</h3>
                  <span style={s.memberCount}>{team.members.length} agente(s) vinculado(s)</span>
                </div>

                <div style={s.teamActions}>
                  <button
                    style={s.iconBtn}
                    onClick={() => {
                      setSelectedTeam(team);
                      setName(team.name);
                      setModal('team');
                    }}
                    title="Editar equipe"
                  >
                    <Pencil size={16} />
                  </button>
                  <button style={{ ...s.iconBtn, ...s.iconBtnDanger }} onClick={() => handleDeleteTeam(team.id)} title="Excluir equipe">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={s.memberList}>
                <div style={s.memberTitle}>Membros da equipe</div>

                {team.members.length === 0 ? (
                  <div style={s.emptyInline}>Nenhum membro vinculado ainda.</div>
                ) : (
                  team.members.map((member) => (
                    <div key={member.userId} style={s.memberRow}>
                      <div style={s.avatarSmall}>{member.user.name[0]}</div>
                      <span style={s.memberName}>{member.user.name}</span>
                      <button style={s.removeBtn} onClick={() => handleRemoveMember(team.id, member.userId)} title="Remover membro">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}

                <button
                  style={s.addMemberBtn}
                  onClick={() => {
                    setSelectedTeam(team);
                    setSelectedUser('');
                    setModal('member');
                  }}
                >
                  <UserPlus size={16} />
                  Adicionar agente
                </button>
              </div>
            </section>
          ))}

          {teams.length === 0 && (
            <div style={s.emptyCard}>
              <Users size={22} />
              <div style={s.emptyTitle}>Nenhuma equipe criada</div>
              <div style={s.emptyText}>Comece criando setores como Suporte, Comercial ou Financeiro.</div>
            </div>
          )}
        </div>
      )}

      {modal === 'team' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalKicker}>{selectedTeam ? 'Editar equipe' : 'Nova equipe'}</p>
                <h3 style={s.modalTitle}>{selectedTeam ? 'Atualizar departamento' : 'Criar departamento'}</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(null)}>
                x
              </button>
            </div>

            <form onSubmit={handleSaveTeam} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome do departamento</label>
                <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Financeiro, Comercial..." required />
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'member' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalKicker}>Vincular agente</p>
                <h3 style={s.modalTitle}>Adicionar em {selectedTeam?.name}</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(null)}>
                x
              </button>
            </div>

            <form onSubmit={handleAddMember} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Selecionar agente</label>
                <select style={s.input} value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required>
                  <option value="">Selecione um colaborador...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Vinculando...' : 'Confirmar vinculo'}
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
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2.5rem',
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
    fontSize: '1.85rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    margin: '0 0 0.45rem',
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-display)',
  },
  subtitle: { fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 },
  addBtn: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
    padding: '0.85rem 1.2rem',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.92rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
  teamCard: {
    background: 'var(--bg-surface)',
    borderRadius: '20px',
    padding: '1.5rem',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  teamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-color)',
  },
  teamName: { margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--accent)' },
  memberCount: {
    display: 'inline-block',
    marginTop: '0.4rem',
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  teamActions: { display: 'flex', gap: '0.5rem' },
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
  iconBtnDanger: {
    color: '#d85f5f',
  },
  memberList: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  memberTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 800,
    marginBottom: '0.1rem',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'var(--bg-panel)',
    padding: '0.75rem 0.9rem',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  avatarSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  memberName: { flex: 1, fontSize: '0.9rem', color: 'var(--text-main)' },
  removeBtn: {
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    borderRadius: '10px',
  },
  addMemberBtn: {
    marginTop: '0.5rem',
    background: 'transparent',
    border: '1px dashed var(--accent-border)',
    color: 'var(--accent)',
    padding: '0.85rem',
    borderRadius: '14px',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' },
  emptyInline: {
    background: 'var(--bg-panel)',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '1rem',
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
  },
  emptyCard: {
    gridColumn: '1 / -1',
    background: 'var(--bg-panel)',
    border: '1px dashed var(--border-color)',
    borderRadius: '22px',
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyTitle: { marginTop: '0.9rem', marginBottom: '0.45rem', color: 'var(--text-main)', fontWeight: 800, fontSize: '1.05rem' },
  emptyText: { fontSize: '0.9rem', lineHeight: 1.6 },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
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
    maxWidth: '28rem',
    border: '1px solid var(--border-color)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
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
  modalTitle: { margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  form: { padding: '1.8rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
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
    outline: 'none',
    fontSize: '0.95rem',
    width: '100%',
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1.6rem' },
  cancelBtn: {
    padding: '0.85rem 1.2rem',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveBtn: {
    padding: '0.85rem 1.2rem',
    borderRadius: '14px',
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    cursor: 'pointer',
    fontWeight: 800,
  },
};
