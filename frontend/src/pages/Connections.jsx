import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getInstances, createInstance, deleteInstance, getInstanceQrCode } from '../services/api';

export default function Connections() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'new' | 'qrcode'
  const [selectedInst, setSelectedInst] = useState(null);
  const [name, setName] = useState('');
  const [qrcode, setQrcode] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    load();
    const token = localStorage.getItem('token');
    const s = io({ auth: { token } });

    s.on('connection_update', () => {
      load();
    });

    return () => s.disconnect();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getInstances();
      setInstances(data);
    } catch (err) {
      alert('Erro ao carregar conexões');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await createInstance(name);
      setModal('qrcode');
      setSelectedInst(data);
      loadQr(data.id);
    } catch (err) {
      alert('Erro ao criar conexão');
    } finally {
      setSaving(false);
    }
  }

  async function loadQr(id) {
    setQrcode(null);
    try {
      const { data } = await getInstanceQrCode(id);
      setQrcode(data.qrcode);
    } catch { alert('Erro ao gerar QR Code'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta conexão? O número será desconectado.')) return;
    try {
      await deleteInstance(id);
      load();
    } catch { alert('Erro ao excluir'); }
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>🔌 Conexões de WhatsApp</h1>
          <p style={s.subtitle}>Gerencie múltiplos números e departamentos</p>
        </div>
        <button style={s.addBtn} onClick={() => { setName(''); setModal('new'); }}>+ Nova Conexão</button>
      </header>

      {loading ? (
        <div style={s.empty}>Sincronizando instâncias...</div>
      ) : (
        <div style={s.grid}>
          {instances.map(inst => (
            <div key={inst.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={{ ...s.statusIcon, background: inst.status === 'connected' ? '#48bb78' : '#e53e3e' }}>
                  {inst.status === 'connected' ? '✅' : '❌'}
                </div>
                <div style={s.cardInfo}>
                  <h3 style={s.cardTitle}>{inst.instanceName.split('_').pop().toUpperCase()}</h3>
                  <span style={s.cardStatus}>{inst.status === 'connected' ? 'Conectado' : 'Desconectado'}</span>
                </div>
                <button style={s.deleteBtn} onClick={() => handleDelete(inst.id)}>🗑️</button>
              </div>
              
              <div style={s.cardBody}>
                {inst.status !== 'connected' && (
                  <button style={s.qrBtn} onClick={() => { setSelectedInst(inst); setModal('qrcode'); loadQr(inst.id); }}>
                    Gerar QR Code
                  </button>
                )}
                {inst.status === 'connected' && (
                  <div style={s.connectedMsg}>🚀 Pronto para uso</div>
                )}
              </div>
            </div>
          ))}
          {instances.length === 0 && (
            <div style={s.empty}>Nenhuma conexão ativa. Adicione seu primeiro número para começar.</div>
          )}
        </div>
      )}

      {modal === 'new' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>✨ Nova Conexão</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome da Conexão (ex: Financeiro)</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} required placeholder="Identifique o setor..." />
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Criando...' : 'Criar Conexão'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'qrcode' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📱 Escanear QR Code</h3>
              <button style={s.closeBtn} onClick={() => { setModal(null); load(); }}>✕</button>
            </div>
            <div style={s.qrContent}>
              <p style={s.qrText}>Abra o WhatsApp no seu celular e escaneie o código abaixo para conectar a instância <strong>{selectedInst?.instanceName.split('_').pop()}</strong>.</p>
              <div style={s.qrBox}>
                {qrcode ? (
                  <img src={qrcode} alt="QR Code" style={s.qrImg} />
                ) : (
                  <div style={s.qrLoading}>Gerando código...</div>
                )}
              </div>
              <button style={s.doneBtn} onClick={() => { setModal(null); load(); }}>Já escaneei</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: '#0F0F0F', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' },
  subtitle: { fontSize: '0.95rem', color: '#717171' },
  addBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  card: { background: '#1A1A1B', borderRadius: '20px', padding: '1.5rem', border: '1px solid #2A2A2A', transition: 'all 0.2s' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  statusIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' },
  cardInfo: { flex: 1 },
  cardTitle: { margin: 0, fontSize: '1rem', fontWeight: 800, color: '#D4AF37' },
  cardStatus: { fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 700 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 },
  
  cardBody: { borderTop: '1px solid #333', paddingTop: '1rem' },
  qrBtn: { width: '100%', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' },
  connectedMsg: { textAlign: 'center', color: '#48bb78', fontSize: '0.9rem', fontWeight: 700 },

  empty: { padding: '4rem', textAlign: 'center', color: '#717171', gridColumn: '1 / -1' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1A1A1B', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid #333' },
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

  qrContent: { padding: '2rem', textAlign: 'center' },
  qrText: { fontSize: '0.9rem', color: '#A0A0A0', marginBottom: '1.5rem', lineHeight: '1.4' },
  qrBox: { background: '#fff', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem' },
  qrImg: { width: '200px', height: '200px' },
  qrLoading: { width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700 },
  doneBtn: { width: '100%', background: '#D4AF37', color: '#000', border: 'none', padding: '0.85rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' },
};
