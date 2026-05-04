import React, { useState, useEffect } from 'react';
import api, { updateContact, deleteContact, getEquipments, updateEquipment, deleteEquipment } from '../services/api';
import { X, Printer, FileText, User, Trash2, Edit3, AlertTriangle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export default function ContactProfileModal({ contact, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('dados');
  const [formData, setFormData] = useState({ 
    name: contact.name || '', 
    fantasyName: contact.fantasyName || '',
    phone: contact.phone || '',
    cpfCnpj: contact.cpfCnpj || '',
    email: contact.email || '',
    address: contact.address || '',
    city: contact.city || '',
    state: contact.state || '',
    zipCode: contact.zipCode || ''
  });

  const [equipments, setEquipments] = useState([]);
  const [osHistory, setOsHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newEquip, setNewEquip] = useState({ model: '', serialNumber: '', sector: '', address: '' });
  const [editingEquipId, setEditingEquipId] = useState(null);

  useEffect(() => {
    if (activeTab === 'equipamentos') loadEquipments();
    if (activeTab === 'os') loadOsHistory();
  }, [activeTab]);

  async function loadEquipments() {
    try {
      const res = await getEquipments(contact.id);
      setEquipments(res.data);
    } catch (e) {}
  }

  async function loadOsHistory() {
    try {
      // Busca todas as O.S. (o backend já filtra por tenant)
      const res = await api.get('/os');
      // Filtra O.S. onde o cliente é o solicitante OU o dono do equipamento
      setOsHistory(res.data.filter(os => 
        os.contactId === contact.id || 
        os.equipment?.contactId === contact.id
      ));
    } catch (e) {}
  }

  async function handleUpdateData() {
    try {
      await updateContact(contact.id, formData);
      onUpdated();
      alert('Dados salvos!');
    } catch (err) {
      alert('Erro ao salvar');
    }
  }

  async function handleDeleteContact() {
    if (!window.confirm('TEM CERTEZA? Isso excluirá permanentemente este cliente e todo o seu histórico!')) return;
    try {
      await deleteContact(contact.id);
      onUpdated();
      onClose();
    } catch (e) {
      alert('Erro ao excluir cliente');
    }
  }

  async function handleAddOrUpdateEquip() {
    if (!newEquip.model) return alert('Modelo é obrigatório');
    try {
      if (editingEquipId) {
        await updateEquipment(editingEquipId, newEquip);
        setEditingEquipId(null);
      } else {
        await api.post(`/os/contacts/${contact.id}/equipments`, newEquip);
      }
      setNewEquip({ model: '', serialNumber: '', sector: '', address: '' });
      loadEquipments();
    } catch (e) {
      alert('Erro ao salvar equipamento');
    }
  }

  function startEditEquip(e) {
    setEditingEquipId(e.id);
    setNewEquip({ 
      model: e.model || '', 
      serialNumber: e.serialNumber || '', 
      sector: e.sector || '', 
      address: e.address || '' 
    });
  }

  async function handleDeleteEquip(id) {
    if (!window.confirm('Excluir este equipamento?')) return;
    try {
      await deleteEquipment(id);
      loadEquipments();
    } catch (e) {
      alert('Erro ao excluir');
    }
  }

  const s = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-panel)', width: '800px', maxWidth: '95%', height: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' },
    closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
    tabs: { display: 'flex', borderBottom: '1px solid var(--border-color)' },
    tab: (active) => ({ padding: '15px 20px', cursor: 'pointer', fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : 'none', flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }),
    content: { padding: '24px', overflowY: 'auto', flex: 1 },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    label: { fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px', display: 'block' },
    input: { width: '100%', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none' },
    btn: { background: 'var(--accent)', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop: '16px' },
    deleteBtn: { background: 'transparent', color: '#ff4d4f', border: '1px solid #ff4d4f', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    equipCard: { background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px', position: 'relative' },
    equipTitle: { fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem', paddingRight: '60px' },
    equipText: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' },
    equipActions: { position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' },
    actionBtn: (color) => ({ background: 'none', border: 'none', color: color, cursor: 'pointer', padding: '4px' }),
    osCard: { background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' },
    statusBadge: (status) => {
      const colors = { PENDENTE: '#ff4d4f', EM_ATENDIMENTO: '#faad14', AGUARDANDO_RETORNO: '#ff9c6e', FINALIZADA: '#52c41a' };
      return { background: colors[status] || '#999', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 };
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.title}><User size={20} /> Perfil do Cliente</div>
          <button style={s.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div style={s.tabs}>
          <div style={s.tab(activeTab === 'dados')} onClick={() => setActiveTab('dados')}><User size={18}/> Dados</div>
          <div style={s.tab(activeTab === 'equipamentos')} onClick={() => setActiveTab('equipamentos')}><Printer size={18}/> Equipamentos</div>
          <div style={s.tab(activeTab === 'os')} onClick={() => setActiveTab('os')}><FileText size={18}/> Histórico O.S.</div>
        </div>

        <div style={s.content}>
          {activeTab === 'dados' && (
            <div>
              <div style={s.inputGroup}>
                <div><label style={s.label}>NOME</label><input style={s.input} value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></div>
                <div><label style={s.label}>NOME FANTASIA / DEPARTAMENTO</label><input style={s.input} value={formData.fantasyName} onChange={e=>setFormData({...formData, fantasyName: e.target.value})} /></div>
              </div>
              <div style={s.inputGroup}>
                <div><label style={s.label}>TELEFONE</label><input style={s.input} value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /></div>
                <div><label style={s.label}>EMAIL</label><input style={s.input} value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></div>
              </div>
              <div style={s.inputGroup}>
                <div><label style={s.label}>CNPJ / CPF</label><input style={s.input} value={formData.cpfCnpj} onChange={e=>setFormData({...formData, cpfCnpj: e.target.value})} /></div>
              </div>
              <div><label style={s.label}>ENDEREÇO (RUA, NÚMERO, BAIRRO)</label><input style={s.input} value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} /></div>
              <div style={{ ...s.inputGroup, marginTop: 16 }}>
                <div><label style={s.label}>CIDADE</label><input style={s.input} value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} /></div>
                <div><label style={s.label}>ESTADO (UF)</label><input style={s.input} value={formData.state} onChange={e=>setFormData({...formData, state: e.target.value})} /></div>
              </div>
              <button style={s.btn} onClick={handleUpdateData}>Salvar Dados</button>
              
              <button style={s.deleteBtn} onClick={handleDeleteContact}>
                <Trash2 size={18} /> Excluir Perfil do Cliente
              </button>
            </div>
          )}

          {activeTab === 'equipamentos' && (
            <div>
              <div style={{...s.equipCard, borderStyle: 'dashed', borderColor: editingEquipId ? 'var(--accent)' : 'var(--border-color)'}}>
                <div style={{color: 'var(--accent)', fontWeight: 800, marginBottom: '12px'}}>
                  {editingEquipId ? '✏️ Editando Equipamento' : '+ Novo Equipamento'}
                </div>
                <div style={s.inputGroup}>
                  <input style={s.input} placeholder="Modelo (ex: Xerox 7845)" value={newEquip.model} onChange={e=>setNewEquip({...newEquip, model: e.target.value})}/>
                  <input style={s.input} placeholder="Número de Série" value={newEquip.serialNumber} onChange={e=>setNewEquip({...newEquip, serialNumber: e.target.value})}/>
                </div>
                <div style={s.inputGroup}>
                  <input style={s.input} placeholder="Setor (ex: Recepção)" value={newEquip.sector} onChange={e=>setNewEquip({...newEquip, sector: e.target.value})}/>
                  <input style={s.input} placeholder="Endereço Específico (opcional)" value={newEquip.address} onChange={e=>setNewEquip({...newEquip, address: e.target.value})}/>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button style={{...s.btn, marginTop: 0}} onClick={handleAddOrUpdateEquip}>
                    {editingEquipId ? 'Salvar Alterações' : 'Adicionar Equipamento'}
                  </button>
                  {editingEquipId && (
                    <button style={{...s.btn, marginTop: 0, background: '#333', color: '#fff'}} onClick={() => { setEditingEquipId(null); setNewEquip({ model: '', serialNumber: '', sector: '', address: '' }); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {equipments.map(e => (
                <div key={e.id} style={s.equipCard}>
                  <div style={s.equipActions}>
                    <button style={s.actionBtn('var(--accent)')} onClick={() => startEditEquip(e)} title="Editar"><Edit3 size={18} /></button>
                    <button style={s.actionBtn('#ff4d4f')} onClick={() => handleDeleteEquip(e.id)} title="Excluir"><Trash2 size={18} /></button>
                  </div>
                  <div style={s.equipTitle}>{e.manufacturer ? `${e.manufacturer} ` : ''}{e.model}</div>
                  <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{e.type}</div>
                  <div style={s.equipText}>Série: {e.serialNumber || 'N/A'} | Setor: {e.sector || 'Geral'}</div>
                  {e.address && <div style={s.equipText}>📍 {e.address}</div>}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'os' && (
            <div>
              {osHistory.length === 0 ? <div style={{color: 'var(--text-muted)'}}>Nenhuma O.S. registrada.</div> : null}
              {osHistory.map(os => (
                <div key={os.id} style={s.osCard}>
                  <div>
                    <div style={{fontWeight: 800, color: 'var(--text-main)'}}>O.S. #{os.id.substring(os.id.length - 6).toUpperCase()}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Data: {new Date(os.createdAt).toLocaleDateString()}</div>
                    <div style={{marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-main)'}}>Defeito: {os.defect}</div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'}}>
                    <span style={s.statusBadge(os.status)}>{os.status}</span>
                    <a 
  href={`${BACKEND_URL}/api/os/${os.id}/pdf?token=${localStorage.getItem('token')}`} 
  target="_blank" 
  rel="noreferrer" 
  style={{fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none'}}
>
  Ver PDF
</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
