import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, FileText, Settings, User, Calendar, X, Archive, History, MapPin, Hash, Clock } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { toast } from '../utils/toast';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export default function ServiceOrders() {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedOs, setSelectedOs] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [meters, setMeters] = useState({ mono: '', color: '', scan: '' });

  useEffect(() => {
    loadOrders();
  }, [startDate, endDate, search]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.search = search;

      const res = await api.get('/os', { params });
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

  const [dragOverCol, setDragOverCol] = useState(null);

  // Adiciona coluna de arquivadas se estiver em busca/histórico
  const activeColumns = [...columns];
  if (isSearchMode || (search && search.trim() !== '')) {
    activeColumns.push({ id: 'ARQUIVADA', title: 'Arquivadas', color: '#717171' });
  }

  // Drag and Drop Logic
  function onDragStart(e, osId) {
    e.dataTransfer.setData('osId', osId);
  }

  async function onDrop(e, newStatus) {
    e.preventDefault();
    setDragOverCol(null);
    const osId = e.dataTransfer.getData('osId');
    const os = orders.find(o => o.id === osId);
    
    // Se for arquivar/finalizar por drag, exige que já tenha nota
    if ((newStatus === 'FINALIZADA' || newStatus === 'ARQUIVADA') && (!os.technicalNotes || os.technicalNotes.length < 5)) {
      toast.error('Esta O.S. não pode ser fechada sem um Relatório Técnico. Abra a O.S. para preencher.');
      return;
    }

    try {
      await api.patch(`/os/${osId}`, { status: newStatus, technicalNotes: os.technicalNotes });
      loadOrders();
      toast.success('Status atualizado com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao mover O.S.');
    }
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  function openOsModal(os) {
    setSelectedOs(os);
    setStatus(os.status);
    setNotes(os.technicalNotes || '');
    const m = os.meters ? JSON.parse(os.meters) : { mono: '', color: '', scan: '' };
    setMeters(m);
    setShowModal(true);
  }

  async function handleUpdate(newStatus = null) {
    const finalStatus = newStatus || status;
    
    if ((finalStatus === 'FINALIZADA' || finalStatus === 'ARQUIVADA') && (!notes || notes.trim().length < 5)) {
      toast.error('Relatório Técnico é obrigatório para finalizar ou arquivar a O.S.');
      return;
    }

    try {
      await api.patch(`/os/${selectedOs.id}`, { 
        status: finalStatus, 
        technicalNotes: notes, 
        meters 
      });
      setShowModal(false);
      loadOrders();
      toast.success('O.S. atualizada com sucesso!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar O.S.');
    }
  }

  const filteredOrders = orders.filter(o => {
    if (isSearchMode || (search && search.trim() !== '')) return true;
    return o.status !== 'ARQUIVADA';
  });

  // Calcula há quantos dias a OS foi criada
  function daysSince(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const s = {
    container: { padding: '24px', color: 'var(--text-main)', height: '100%', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-display)' },
    filterBar: { display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-panel)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
    input: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem' },
    dateInput: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem', colorScheme: 'dark' },
    
    kanban: { display: 'flex', gap: '16px', flex: 1, overflowX: 'auto', minHeight: '500px', paddingBottom: '20px' },
    column: { flex: '0 0 320px', background: 'var(--bg-surface)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', transition: 'border-color 0.2s, box-shadow 0.2s' },
    columnDragOver: { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent-border)', background: 'var(--accent-light)' },
    colHeader: (color) => ({ fontSize: '0.95rem', fontWeight: 800, color: color, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '0.05em' }),
    card: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'grab', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
    cardTitle: { fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--accent)', display: 'flex', justifyContent: 'space-between' },
    cardText: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' },
    cardDefect: { fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '10px', background: 'var(--bg-base)', padding: '8px', borderRadius: '8px', borderLeft: '3px solid var(--accent)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
    modal: { background: 'var(--bg-surface)', width: '95%', maxWidth: '1150px', borderRadius: '24px', padding: '0', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', overflow: 'hidden' },
    modalHeader: { padding: '20px 32px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalContent: { padding: '24px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: '32px', overflowY: 'auto', maxHeight: '80vh' },
    
    sidebar: { background: 'var(--bg-base)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', height: 'fit-content' },
    btnGroup: { display: 'flex', gap: '12px', marginTop: '12px', padding: '0 32px 32px' },
    saveBtn: { flex: 2, background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' },
    pdfBtn: { flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }
  };

  const getClientName = (os) => {
    const company = os.equipment?.contact;
    if (company) return company.fantasyName || company.name;
    return os.contact?.fantasyName || os.contact?.name;
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}><FileText size={32} color="#D4AF37" /> Gestão de O.S.</div>
        <div style={s.filterBar}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Calendar size={16} color="#717171" />
            <input type="date" style={s.dateInput} value={startDate} onChange={e=>setStartDate(e.target.value)} />
            <span style={{color: '#717171'}}>até</span>
            <input type="date" style={s.dateInput} value={endDate} onChange={e=>setEndDate(e.target.value)} />
          </div>
          <div style={{width: '1px', height: '24px', background: '#333', margin: '0 8px'}} />
          <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
            <Search size={16} color="#717171" style={{position: 'absolute', left: '10px'}} />
            <input 
              style={{...s.input, paddingLeft: '32px', width: isMobile ? '150px' : '220px'}} 
              placeholder="Nº O.S. ou Cliente..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setIsSearchMode(!isSearchMode); loadOrders(); }}
            style={{ 
              background: isSearchMode ? '#D4AF37' : 'transparent', 
              color: isSearchMode ? '#000' : '#D4AF37', 
              border: '1px solid #D4AF37',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSearchMode ? <X size={14}/> : <History size={14}/>}
            {isSearchMode ? 'Sair da Busca' : 'Histórico'}
          </button>
        </div>
      </div>

      <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
        <button 
          onClick={() => setSearch('')}
          style={{
            background: search === '' ? 'var(--accent)' : 'var(--bg-panel)',
            color: search === '' ? '#000' : 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Todos
        </button>
        {columns.map(c => (
          <button 
            key={c.id}
            onClick={() => setSearch(c.title)}
            style={{
              background: search === c.title ? c.color : 'var(--bg-panel)',
              color: search === c.title ? '#000' : 'var(--text-muted)',
              border: `1px solid ${search === c.title ? c.color : 'var(--border-color)'}`,
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div style={s.kanban}>
        {activeColumns.map(col => (
          <div 
            key={col.id} 
            style={{
              ...s.column,
              opacity: col.id === 'ARQUIVADA' ? 0.7 : 1,
              ...(dragOverCol === col.id ? s.columnDragOver : {})
            }}
            onDragOver={allowDrop}
            onDragEnter={() => setDragOverCol(col.id)}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null); }}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div style={s.colHeader(col.color)}>
              {col.title}
              <span style={{background: '#0F0F0F', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#fff', border: '1px solid #333'}}>
                {filteredOrders.filter(o => o.status === col.id).length}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {filteredOrders.filter(o => o.status === col.id).map(os => (
                <div 
                  key={os.id} 
                  style={s.card} 
                  draggable={os.status !== 'ARQUIVADA'} 
                  onDragStart={(e) => onDragStart(e, os.id)}
                  onClick={() => openOsModal(os)}
                >
                  <div style={s.cardTitle}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>#{os.id.substring(os.id.length - 6).toUpperCase()}</span>
                      <a 
                        href={`${BACKEND_URL}/api/os/${os.id}/pdf?token=${localStorage.getItem('token')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{color: 'var(--accent)', opacity: 0.7, display: 'flex', alignItems: 'center'}}
                        title="Imprimir PDF Rápido"
                      >
                        <FileText size={12} />
                      </a>
                    </div>
                    {os.status === 'FINALIZADA' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOs(os); handleUpdate('ARQUIVADA'); }}
                        style={{background: 'none', border: 'none', color: '#717171', cursor: 'pointer'}}
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{...s.cardText, color: '#fff', fontWeight: 800, fontSize: '0.95rem'}}><User size={14} color="#D4AF37"/> {getClientName(os)}</div>
                  <div style={{...s.cardText, fontSize: '0.75rem', color: '#717171', marginBottom: '8px'}}>Sol: {os.contact?.name}</div>
                  <div style={s.cardText}>
                    <Settings size={14} color="#D4AF37"/> 
                    {os.equipment?.manufacturer} {os.equipment?.model}
                  </div>
                  <div style={{...s.cardText, fontSize: '0.7rem', color: '#717171'}}>
                    <Hash size={12} color="#D4AF37"/> {os.equipment?.serialNumber || 'S/N não inf.'}
                  </div>
                  <div style={s.cardDefect}>{os.defect}</div>
                  
                  {os.status === 'ARQUIVADA' ? (
                    <div style={{fontSize: '0.65rem', color: 'var(--accent)', marginTop: '12px', background: 'var(--bg-base)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                      <div>Fechada em: {new Date(os.closedAt || os.updatedAt).toLocaleString()}</div>
                      <div>Por: {os.closedBy?.name || 'Sistema'}</div>
                    </div>
                  ) : (
                    <div style={{fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>{os.user?.name || 'Atendente'}</span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        color: daysSince(os.createdAt) >= 3 ? '#ff4d4f' : daysSince(os.createdAt) >= 1 ? '#faad14' : 'var(--text-dim)',
                        fontWeight: daysSince(os.createdAt) >= 3 ? 800 : 500
                      }}>
                        <Clock size={11} />
                        {daysSince(os.createdAt) === 0 ? 'hoje' : `${daysSince(os.createdAt)}d`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedOs && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <FileText color="#D4AF37" size={24} />
                <h2 style={{color: '#fff', margin: 0, fontSize: '1.4rem'}}>O.S. #{selectedOs.id.substring(selectedOs.id.length - 6).toUpperCase()}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'}}>✕</button>
            </div>

            <div style={s.modalContent}>
              <div style={s.sidebar}>
                <h4 style={{color: '#D4AF37', marginTop: 0, marginBottom: '16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>DADOS DO CLIENTE</h4>
                <div style={{marginBottom: '20px'}}>
                  <div style={{color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px'}}>{getClientName(selectedOs)}</div>
                  <div style={{color: '#717171', fontSize: '0.85rem'}}>Solicitante: {selectedOs.contact?.name}</div>
                  <div style={{color: '#717171', fontSize: '0.85rem', marginTop: '12px'}}><Hash size={12} style={{display: 'inline', marginRight: '4px'}}/> {selectedOs.equipment?.contact?.cpfCnpj || selectedOs.contact?.cpfCnpj || 'CNPJ não informado'}</div>
                </div>

                <h4 style={{color: '#D4AF37', marginBottom: '12px', fontSize: '0.75rem', textTransform: 'uppercase'}}>EQUIPAMENTO</h4>
                <div style={{color: '#fff', fontSize: '0.9rem', marginBottom: '4px'}}>{selectedOs.equipment?.model}</div>
                <div style={{color: '#717171', fontSize: '0.85rem', marginBottom: '12px'}}>Série: {selectedOs.equipment?.serialNumber}</div>
                <div style={{color: '#717171', fontSize: '0.85rem', display: 'flex', gap: '4px'}}>
                  <MapPin size={14} color="#D4AF37" style={{flexShrink: 0}} />
                  <span>{selectedOs.equipment?.address || selectedOs.contact?.address}</span>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <div>
                  <label style={{fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'block'}}>Status da Ordem</label>
                  <select style={{...s.input, width: '100%', height: '45px'}} value={status} onChange={e=>setStatus(e.target.value)}>
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    <option value="ARQUIVADA">Arquivada</option>
                  </select>
                </div>

                <div>
                  <label style={{fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'block'}}>Leitura de Contadores</label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                       <span style={{fontSize: '0.65rem', color: '#555'}}>P&B</span>
                       <input style={{...s.input, padding: '12px'}} placeholder="000" value={meters.mono} onChange={e=>setMeters({...meters, mono: e.target.value})} />
                     </div>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                       <span style={{fontSize: '0.65rem', color: '#555'}}>COLOR</span>
                       <input style={{...s.input, padding: '12px'}} placeholder="000" value={meters.color} onChange={e=>setMeters({...meters, color: e.target.value})} />
                     </div>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                       <span style={{fontSize: '0.65rem', color: '#555'}}>SCANNER</span>
                       <input style={{...s.input, padding: '12px'}} placeholder="000" value={meters.scan} onChange={e=>setMeters({...meters, scan: e.target.value})} />
                     </div>
                  </div>
                </div>

                <div>
                  <label style={{fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'block'}}>Defeito / Solicitação do Cliente</label>
                  <div style={{background: '#1A1A1B', border: '1px solid #333', borderRadius: '12px', padding: '16px', color: '#D4AF37', fontWeight: 700, fontSize: '0.95rem', borderLeft: '4px solid #D4AF37'}}>
                    {selectedOs.defect}
                  </div>
                </div>

                <div>
                  <label style={{fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'block'}}>Relatório Técnico / Peças Substituídas</label>
                  <textarea 
                    style={{...s.input, minHeight: '180px', resize: 'none', padding: '16px', lineHeight: '1.5', width: '100%'}} 
                    placeholder="Descreva detalhadamente o serviço executado..." 
                    value={notes} 
                    onChange={e=>setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={s.btnGroup}>
              <a href={`${BACKEND_URL}/api/os/${selectedOs.id}/pdf?token=${localStorage.getItem('token')}`} target="_blank" rel="noreferrer" style={s.pdfBtn}>Gerar / Imprimir PDF</a>
              <button style={s.saveBtn} onClick={() => handleUpdate()}>Salvar Atualizações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
