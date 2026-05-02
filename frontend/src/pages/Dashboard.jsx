import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(r => {
        setStats(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.loading}>Carregando métricas de performance...</div>;
  if (!stats) return <div style={s.loading}>Erro ao carregar dashboard.</div>;

  const kpis = stats.kpis;
  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{ ...s.container, padding: isMobile ? '20px' : '40px' }}>
      <header style={{ ...s.header, marginBottom: isMobile ? '24px' : '40px' }}>
        <h1 style={{ ...s.title, fontSize: isMobile ? '1.8rem' : '2.4rem' }}>📊 Dashboard de Performance</h1>
        <p style={{ ...s.subtitle, fontSize: isMobile ? '0.9rem' : '1.1rem' }}>Acompanhe a economia de tempo e eficiência da sua operação.</p>
      </header>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardIcon}>⏱️</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>Tempo Economizado</div>
            <div style={s.cardValue}>{kpis.hoursSaved}h</div>
            <div style={s.cardHint}>Baseado na produtividade da IA</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>🤖</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>Taxa de Retenção IA</div>
            <div style={s.cardValue}>{kpis.retentionRate}%</div>
            <div style={s.cardHint}>Conversas resolvidas sem humano</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>⚡</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>TMA Médio</div>
            <div style={s.cardValue}>{kpis.avgTMA > 60 ? `${Math.round(kpis.avgTMA / 60)}h` : `${kpis.avgTMA}m`}</div>
            <div style={s.cardHint}>Tempo de resolução p/ ticket</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>💬</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>Atendimentos Ativos</div>
            <div style={s.cardValue}>{kpis.activeTickets}</div>
            <div style={s.cardHint}>Conversas em curso agora</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>⭐</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>Pontuação Média</div>
            <div style={s.cardValue}>{kpis.avgRating}/5</div>
            <div style={s.cardHint}>Baseado em {kpis.totalRatings} avaliações</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>📔</div>
          <div style={s.cardInfo}>
            <div style={s.cardLabel}>Total de Contatos</div>
            <div style={s.cardValue}>{kpis.totalContacts}</div>
            <div style={s.cardHint}>Base de clientes engajados</div>
          </div>
        </div>
      </div>

      <div style={s.sections}>
        <div style={s.sectionCard}>
          <h2 style={s.sectionTitle}>🏆 Ranking de Agentes (Resolvidos)</h2>
          <div style={s.rankingList}>
            {stats.agentRanking.length > 0 ? stats.agentRanking.map((a, i) => (
              <div key={i} style={s.rankingItem}>
                <div style={s.rankingPos}>{i + 1}º</div>
                <div style={s.rankingName}>{a.name}</div>
                <div style={s.rankingCount}>{a.count} tickets</div>
              </div>
            )) : <p style={s.hint}>Nenhum ticket resolvido por agentes ainda.</p>}
          </div>
          
          <div style={{ marginTop: '40px' }}>
            <h2 style={s.sectionTitle}>📈 Volume de Mensagens (30 dias)</h2>
            <div style={s.chartBox}>
              <div style={s.chartRow}>
                <div style={{ ...s.chartBar, width: `${(kpis.iaMessages / (kpis.iaMessages + kpis.humanMessages || 1)) * 100}%`, background: '#D4AF37' }} />
                <div style={s.chartLabel}>
                  <span>IA (Robô)</span>
                  <span>{kpis.iaMessages} mensagens</span>
                </div>
              </div>
              <div style={s.chartRow}>
                <div style={{ ...s.chartBar, width: `${(kpis.humanMessages / (kpis.iaMessages + kpis.humanMessages || 1)) * 100}%`, background: '#444' }} />
                <div style={s.chartLabel}>
                  <span>Humanos (Agentes)</span>
                  <span>{kpis.humanMessages} mensagens</span>
                </div>
              </div>
            </div>
            <p style={s.hint}>A IA está processando {Math.round((kpis.iaMessages / (kpis.iaMessages + kpis.humanMessages || 1)) * 100)}% de todo o tráfego.</p>
          </div>
        </div>

        <div style={s.sectionCard}>
          <h2 style={s.sectionTitle}>📡 Status Operacional</h2>
          <div style={s.statusList}>
            <div style={s.statusItem}>
              <span style={{ ...s.statusDot, background: '#D4AF37' }} />
              <span>Aguardando ({kpis.pendingTickets})</span>
            </div>
            <div style={s.statusItem}>
              <span style={{ ...s.statusDot, background: '#4CAF50' }} />
              <span>Em Atendimento ({kpis.activeTickets})</span>
            </div>
            <div style={s.statusItem}>
              <span style={{ ...s.statusDot, background: '#717171' }} />
              <span>Resolvidos (Total: {stats.ticketsByStatus.find(t => t.status === 'resolved')?._count.id || 0})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { padding: '40px', color: '#fff', flex: 1, overflowY: 'auto' },
  header: { marginBottom: '40px' },
  title: { fontSize: '2.4rem', fontWeight: 900, background: 'linear-gradient(45deg, #FFF, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  subtitle: { color: '#717171', fontSize: '1.1rem' },
  loading: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#717171' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' },
  card: { background: '#1A1A1B', padding: '24px', borderRadius: '24px', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s' },
  cardIcon: { fontSize: '2rem', opacity: 0.8 },
  cardInfo: { display: 'flex', flexDirection: 'column' },
  cardLabel: { fontSize: '0.75rem', color: '#717171', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' },
  cardValue: { fontSize: '1.6rem', fontWeight: 900, margin: '4px 0', color: '#D4AF37' },
  cardHint: { fontSize: '0.7rem', color: '#444' },

  sections: { display: 'grid', gridTemplateColumns: window.innerWidth <= 1024 ? '1fr' : '2fr 1fr', gap: '24px' },
  sectionCard: { background: '#1A1A1B', padding: window.innerWidth <= 768 ? '24px' : '32px', borderRadius: '24px', border: '1px solid #2A2A2A' },
  sectionTitle: { fontSize: '1rem', fontWeight: 800, marginBottom: '24px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  chartBox: { display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '24px' },
  chartRow: { display: 'flex', flexDirection: 'column', gap: '12px' },
  chartBar: { height: '12px', borderRadius: '6px', transition: 'width 1s ease-in-out' },
  chartLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#888' },
  hint: { fontSize: '0.85rem', color: '#444', fontStyle: 'italic' },

  rankingList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rankingItem: { display: 'flex', alignItems: 'center', gap: '16px', background: '#131314', padding: '12px 20px', borderRadius: '16px', border: '1px solid #222' },
  rankingPos: { fontSize: '1.1rem', fontWeight: 900, color: '#D4AF37', width: '30px' },
  rankingName: { flex: 1, fontWeight: 700, fontSize: '0.95rem' },
  rankingCount: { fontSize: '0.85rem', color: '#717171', fontWeight: 600 },

  statusList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  statusItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: '#A0A0A0' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%' }
};
