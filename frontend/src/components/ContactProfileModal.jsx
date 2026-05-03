import React, { useState, useEffect } from 'react';
import { updateContact } from '../services/api';
import axios from 'axios';
import { X, Printer, FileText, User } from 'lucide-react';

export default function ContactProfileModal({ contact, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('dados');
  const [formData, setFormData] = useState({ 
    name: contact.name || '', 
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

  useEffect(() => {
    if (activeTab === 'equipamentos') loadEquipments();
    if (activeTab === 'os') loadOsHistory();
  }, [activeTab]);

  async function loadEquipments() {
    try {
      const res = await axios.get(`/api/os/contacts/${contact.id}/equipments`, { withCredentials: true });
      setEquipments(res.data);
    } catch (e) {}
  }

  async function loadOsHistory() {
    try {
      // Re-using the main OS endpoint but filtering in frontend (ideally backend)
      const res = await axios.get('/api/os', { withCredentials: true });
      setOsHistory(res.data.filter(os => os.contactId === contact.id));
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

  async function handleAddEquip() {
    if (!newEquip.model) return alert('Modelo é obrigatório');
    try {
      await axios.post(`/api/os/contacts/${contact.id}/equipments`, newEquip, { withCredentials: true });
      setNewEquip({ model: '', serialNumber: '', sector: '', address: '' });
      loadEquipments();
    } catch (e) {
      alert('Erro ao adicionar equipamento');
    }
  }

  const s = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-panel)', width: '800px', maxWidth: '95%', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
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
    equipCard: { background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px' },
    equipTitle: { fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' },
    equipText: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' },
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
                <div><label style={s.label}>TELEFONE</label><input style={s.input} value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div style={s.inputGroup}>
                <div><label style={s.label}>CNPJ / CPF</label><input style={s.input} value={formData.cpfCnpj} onChange={e=>setFormData({...formData, cpfCnpj: e.target.value})} /></div>
                <div><label style={s.label}>EMAIL</label><input style={s.input} value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></div>
              </div>
              <div><label style={s.label}>ENDEREÇO PRINCIPAL</label><input style={s.input} value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} /></div>
              <button style={s.btn} onClick={handleUpdateData}>Salvar Dados</button>
            </div>
          )}

          {activeTab === 'equipamentos' && (
            <div>
              <div style={{...s.equipCard, borderStyle: 'dashed'}}>
                <div style={{color: 'var(--accent)', fontWeight: 800, marginBottom: '12px'}}>+ Novo Equipamento</div>
                <div style={s.inputGroup}>
                  <input style={s.input} placeholder="Modelo (ex: Xerox 7845)" value={newEquip.model} onChange={e=>setNewEquip({...newEquip, model: e.target.value})}/>
                  <input style={s.input} placeholder="Número de Série" value={newEquip.serialNumber} onChange={e=>setNewEquip({...newEquip, serialNumber: e.target.value})}/>
                </div>
                <div style={s.inputGroup}>
                  <input style={s.input} placeholder="Setor (ex: Recepção)" value={newEquip.sector} onChange={e=>setNewEquip({...newEquip, sector: e.target.value})}/>
                  <input style={s.input} placeholder="Endereço Específico (opcional)" value={newEquip.address} onChange={e=>setNewEquip({...newEquip, address: e.target.value})}/>
                </div>
                <button style={{...s.btn, marginTop: 0}} onClick={handleAddEquip}>Adicionar Equipamento</button>
              </div>

              {equipments.map(e => (
                <div key={e.id} style={s.equipCard}>
                  <div style={s.equipTitle}>{e.model}</div>
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
                    <a href={`/api/os/${os.id}/pdf`} target="_blank" rel="noreferrer" style={{fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none'}}>Ver PDF</a>
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
