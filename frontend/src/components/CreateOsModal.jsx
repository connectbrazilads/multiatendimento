import React, { useState, useEffect } from 'react';
import api, { getEquipments } from '../services/api';
import { FileText, Wand2 } from 'lucide-react';

export default function CreateOsModal({ ticket, onClose, onCreated }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [formData, setFormData] = useState({ equipmentId: '', defect: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const contactId = ticket.contact?.id;
      if (!contactId) {
        alert('Contato não vinculado ao ticket.');
        onClose();
        return;
      }
      const resEquips = await getEquipments(contactId);
      setEquipments(resEquips.data);
      
      // Auto-draft with AI
      setDrafting(true);
      const resDraft = await api.post('/os/draft', { contactId, ticketId: ticket.id });
      
      const { defect, equipmentId } = resDraft.data;
      setFormData({
        defect: defect || '',
        equipmentId: equipmentId || (resEquips.data.length === 1 ? resEquips.data[0].id : '')
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setDrafting(false);
    }
  }

  async function handleSave() {
    if (!formData.equipmentId) return alert('Selecione um equipamento');
    if (!formData.defect) return alert('Informe o defeito reportado');
    try {
      const res = await api.post('/os', {
        contactId: ticket.contact?.id,
        equipmentId: formData.equipmentId,
        ticketId: ticket.id,
        defect: formData.defect,
        status: 'PENDENTE'
      });
      
      onCreated(res.data);
    } catch (e) {
      alert('Erro ao criar O.S.');
    }
  }

  const s = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-panel)', width: '500px', maxWidth: '95%', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    input: { width: '100%', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', marginBottom: '16px' },
    label: { fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px', display: 'block' },
    btnGroup: { display: 'flex', gap: '12px', marginTop: '8px' },
    saveBtn: { flex: 1, background: 'var(--accent)', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' },
    cancelBtn: { flex: 1, background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2 style={s.title}><FileText size={20}/> Nova Ordem de Serviço</h2>
        
        {loading || drafting ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Wand2 size={32} style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }} />
            <div>A IA está lendo a conversa e rascunhando a O.S...</div>
          </div>
        ) : (
          <div>
            <label style={s.label}>EQUIPAMENTO</label>
            <select 
              style={s.input} 
              value={formData.equipmentId} 
              onChange={e => setFormData({...formData, equipmentId: e.target.value})}
            >
              <option value="">Selecione um equipamento...</option>
              {equipments.map(e => (
                <option key={e.id} value={e.id}>{e.model} (Série: {e.serialNumber || 'S/N'})</option>
              ))}
            </select>

            <label style={s.label}>DEFEITO REPORTADO (Extraído pela IA)</label>
            <textarea 
              style={{...s.input, minHeight: '100px', resize: 'vertical'}} 
              value={formData.defect} 
              onChange={e => setFormData({...formData, defect: e.target.value})}
            />

            <div style={s.btnGroup}>
              <button style={s.cancelBtn} onClick={onClose}>Cancelar</button>
              <button style={s.saveBtn} onClick={handleSave}>Salvar e Gerar PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
