import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { getTeams, createTeam, updateTeam, deleteTeam, getUsers, addTeamMember, removeTeamMember } from '../services/api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'team' | 'member'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [name, setName] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([getTeams(), getUsers()]);
      setTeams(tRes.data);
      setUsers(uRes.data);
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
      if (selectedTeam) await updateTeam(selectedTeam.id, { name });
      else await createTeam({ name });
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
      toast.info('Agente já faz parte desta equipe');
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
          <h1 style={s.title}>🛡️ Equipes e Departamentos</h1>
          <p style={s.subtitle}>Organize seus agentes por setores de atendimento</p>
        </div>
        <button style={s.addBtn} onClick={() => { setSelectedTeam(null); setName(''); setModal('team'); }}>+ Criar Equipe</button>
      </header>

      {loading ? (
        <div style={s.empty}>Carregando estrutura organizacional...</div>
      ) : (
        <div style={s.grid}>
          {teams.map(t => (
            <div key={t.id} style={s.teamCard}>
              <div style={s.teamHeader}>
                <div>
                  <h3 style={s.teamName}>{t.name}</h3>
                  <span style={s.memberCount}>{t.members.length} Agente(s) vinculado(s)</span>
                </div>
                <div style={s.teamActions}>
                  <button style={s.iconBtn} onClick={() => { setSelectedTeam(t); setName(t.name); setModal('team'); }} title="Editar Nome">✏️</button>
                  <button style={{ ...s.iconBtn, color: '#e53e3e' }} onClick={() => handleDeleteTeam(t.id)} title="Excluir Equipe">🗑️</button>
                </div>
              </div>
              
              <div style={s.memberList}>
                <div style={s.memberTitle}>Membros da Equipe</div>
                {t.members.length === 0 ? (
                  <p style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic', margin: '0.5rem 0' }}>Nenhum membro ainda.</p>
                ) : (
                  t.members.map(m => (
                    <div key={m.userId} style={s.memberRow}>
                      <div style={s.avatarSmall}>{m.user.name[0]}</div>
                      <span style={s.memberName}>{m.user.name}</span>
                      <button style={s.removeBtn} onClick={() => handleRemoveMember(t.id, m.userId)}>✕</button>
                    </div>
                  ))
                )}
                <button style={s.addMemberBtn} onClick={() => { setSelectedTeam(t); setSelectedUser(''); setModal('member'); }}>
                  + Adicionar Agente
                </button>
              </div>
            </div>
          ))}
          {teams.length === 0 && <div style={s.empty}>Nenhuma equipe criada. Comece criando setores como "Suporte" ou "Vendas".</div>}
        </div>
      )}

      {/* Modal Equipe */}
      {modal === 'team' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{selectedTeam ? '✏️ Editar Equipe' : '✨ Nova Equipe'}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveTeam} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome do Departamento</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Financeiro, Comercial..." required />
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Equipe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Membro */}
      {modal === 'member' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>👤 Vincular Agente à {selectedTeam?.name}</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAddMember} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Selecionar Agente</label>
                <select style={s.input} value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
                  <option value="">Selecione um colaborador...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Vinculando...' : 'Confirmar Vínculo'}</button>
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
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
  teamCard: { background: '#1A1A1B', borderRadius: '20px', padding: '1.75rem', border: '1px solid #2A2A2A', transition: 'transform 0.2s' },
  teamHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' },
  teamName: { margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#D4AF37' },
  memberCount: { fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 700 },
  teamActions: { display: 'flex', gap: '0.5rem' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' },
  
  memberList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  memberTitle: { fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.25rem' },
  memberRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0F0F0F', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #222' },
  avatarSmall: { width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem' },
  memberName: { flex: 1, fontSize: '0.85rem', color: '#fff' },
  removeBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem', padding: '0 5px' },
  addMemberBtn: { marginTop: '0.75rem', background: 'transparent', border: '1px dashed #333', color: '#D4AF37', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s' },
  
  empty: { padding: '4rem', textAlign: 'center', color: '#717171', gridColumn: '1 / -1' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1A1A1B', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#717171', fontSize: '1.2rem', cursor: 'pointer' },
  form: { padding: '2rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.85rem', fontWeight: 700, color: '#717171', textTransform: 'uppercase' },
  input: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '0.85rem 1rem', color: '#fff', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#717171', cursor: 'pointer' },
  saveBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#D4AF37', color: '#000', cursor: 'pointer', fontWeight: 800 },
};
