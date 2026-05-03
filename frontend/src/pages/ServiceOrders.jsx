import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, FileText, Settings, User } from 'lucide-react';

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedOs, setSelectedOs] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [meters, setMeters] = useState({ mono: '', color: '', scan: '' });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await axios.get('/api/os', { withCredentials: true });
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { id: 'PENDENTE', title: 'Pendentes', color: '#ff4d4f' },
    { id: 'EM_ATENDIMENTO', title: 'Em Atendimento', color: '#faad14' },
    { id: 'AGUARDANDO_RETORNO', title: 'Aguardando Peça/Retorno', color: '#ff9c6e' },
    { id: 'FINALIZADA', title: 'Finalizadas', color: '#52c41a' }
  ];

  function openOsModal(os) {
    setSelectedOs(os);
    setStatus(os.status);
    setNotes(os.technicalNotes || '');
    const m = os.meters ? JSON.parse(os.meters) : { mono: '', color: '', scan: '' };
    setMeters(m);
    setShowModal(true);
  }

  async function handleUpdate() {
    try {
      await axios.patch(`/api/os/${selectedOs.id}`, { status, technicalNotes: notes, meters }, { withCredentials: true });
      setShowModal(false);
      loadOrders();
    } catch (e) {
      alert('Erro ao atualizar O.S.');
    }
  }

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.contact?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.equipment?.model || '').toLowerCase().includes(search.toLowerCase())
  );

  const s = {
    container: { padding: '24px', color: 'var(--text-main)', height: '100%', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' },
    kanban: { display: 'flex', gap: '16px', flex: 1, overflowX: 'auto', minHeight: '500px' },
    column: { flex: '0 0 300px', background: 'var(--bg-panel)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' },
    colHeader: (color) => ({ fontSize: '1.1rem', fontWeight: 800, color: color, marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }),
    card: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '12px', cursor: 'pointer', transition: 'transform 0.1s' },
    cardTitle: { fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' },
    cardText: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' },
    cardDefect: { fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '8px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '4px' },
    
    // modal
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-panel)', width: '600px', maxWidth: '95%', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' },
    input: { width: '100%', padding: '10px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', marginBottom: '12px' },
    textarea: { width: '100%', padding: '10px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', marginBottom: '12px', minHeight: '100px', resize: 'vertical' },
    btnGroup: { display: 'flex', gap: '12px', marginTop: '16px' },
    saveBtn: { flex: 1, background: 'var(--accent)', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' },
    pdfBtn: { flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}><FileText size={32} /> Ordens de Serviço</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            style={{...s.input, width: '250px', marginBottom: 0}} 
            placeholder="Pesquisar O.S..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={s.kanban}>
        {columns.map(col => (
          <div key={col.id} style={s.column}>
            <div style={s.colHeader(col.color)}>
              {col.title}
              <span style={{background: 'var(--bg-base)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-main)'}}>
                {filteredOrders.filter(o => o.status === col.id).length}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {filteredOrders.filter(o => o.status === col.id).map(os => (
                <div key={os.id} style={s.card} onClick={() => openOsModal(os)}>
                  <div style={s.cardTitle}>O.S. #{os.id.substring(os.id.length - 6).toUpperCase()}</div>
                  <div style={s.cardText}><User size={12}/> {os.contact?.name}</div>
                  <div style={s.cardText}><Settings size={12}/> {os.equipment?.model}</div>
                  <div style={s.cardDefect}>{os.defect}</div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right'}}>
                    {new Date(os.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedOs && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <h2 style={{color: 'var(--text-main)', margin: 0}}>O.S. #{selectedOs.id.substring(selectedOs.id.length - 6).toUpperCase()}</h2>
              <button onClick={() => setShowModal(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem'}}>✕</button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
              <div>
                <div style={s.cardText}>Cliente: {selectedOs.contact?.name}</div>
                <div style={s.cardText}>Equipamento: {selectedOs.equipment?.model} (Série: {selectedOs.equipment?.serialNumber})</div>
                <div style={s.cardText}>Endereço: {selectedOs.equipment?.address || selectedOs.contact?.address}</div>
              </div>
              <div>
                <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Status</label>
                <select style={s.input} value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_ATENDIMENTO">Em Atendimento</option>
                  <option value="AGUARDANDO_RETORNO">Aguardando Retorno / Peça</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
              </div>
            </div>

            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Medidores (Opcional)</label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px'}}>
              <input style={s.input} placeholder="PB" value={meters.mono} onChange={e=>setMeters({...meters, mono: e.target.value})} />
              <input style={s.input} placeholder="Cor" value={meters.color} onChange={e=>setMeters({...meters, color: e.target.value})} />
              <input style={s.input} placeholder="Scan" value={meters.scan} onChange={e=>setMeters({...meters, scan: e.target.value})} />
            </div>

            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Notas do Técnico (Peças trocadas, etc)</label>
            <textarea 
              style={s.textarea} 
              placeholder="Descreva o que foi feito..." 
              value={notes} 
              onChange={e=>setNotes(e.target.value)}
            />

            <div style={s.btnGroup}>
              <a href={`/api/os/${selectedOs.id}/pdf`} target="_blank" rel="noreferrer" style={s.pdfBtn}>Gerar / Imprimir PDF</a>
              <button style={s.saveBtn} onClick={handleUpdate}>Salvar Atualizações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
