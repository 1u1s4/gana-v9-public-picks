import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type PickStatus = 'upcoming' | 'live' | 'finished';
type Result = 'pending' | 'won' | 'lost' | 'void';
type Tier = 'Lean' | 'Value' | 'Prime';

type Pick = {
  id: string;
  league: string;
  kickoff: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  odds: number;
  tier: Tier;
  stake: string;
  note: string;
  risk: string;
  status: PickStatus;
  result: Result;
};

const riskLine = '+18 only. No guaranteed profit. Bet responsibly.';

const picks: Pick[] = [
  {
    id: 'G9-071-001',
    league: 'Mundial 2026',
    kickoff: 'Hoy · 13:00 GT',
    home: 'Paraguay',
    away: 'Francia',
    market: 'Doble oportunidad',
    selection: 'Francia o empate',
    odds: 1.28,
    tier: 'Prime',
    stake: '1.0u',
    note: 'Luis mantiene exposición baja: la ventaja está en cubrir el empate, no en perseguir cuota alta.',
    risk: 'Si Francia rota titulares, bajar stake o esperar XI confirmado.',
    status: 'upcoming',
    result: 'pending',
  },
  {
    id: 'G9-071-002',
    league: 'Liga MX',
    kickoff: 'Hoy · 19:05 GT',
    home: 'América',
    away: 'Puebla',
    market: 'Total goles',
    selection: 'Más de 1.5',
    odds: 1.34,
    tier: 'Value',
    stake: '0.75u',
    note: 'Ritmo y volumen favorecen un pick simple; no es spot para forzar handicap.',
    risk: 'Evitar si la línea sube demasiado antes del kickoff.',
    status: 'live',
    result: 'pending',
  },
  {
    id: 'G9-070-009',
    league: 'Copa Libertadores',
    kickoff: 'Ayer · Final',
    home: 'River Plate',
    away: 'Colo-Colo',
    market: '1X2',
    selection: 'River Plate',
    odds: 1.72,
    tier: 'Lean',
    stake: '0.5u',
    note: 'Pick publicado con cautela por baja liquidez; quedó como muestra de accountability.',
    risk: 'Mercado sensible a once inicial.',
    status: 'finished',
    result: 'lost',
  },
  {
    id: 'G9-070-004',
    league: 'Premier League',
    kickoff: 'Ayer · Final',
    home: 'Arsenal',
    away: 'Everton',
    market: 'Total goles',
    selection: 'Menos de 3.5',
    odds: 1.41,
    tier: 'Prime',
    stake: '1.0u',
    note: 'Partido de control y poca urgencia: buen encaje para proteger downside.',
    risk: 'Gol temprano rompe el guion.',
    status: 'finished',
    result: 'won',
  },
];

const stats = {
  published: 124,
  settled: 89,
  hitRate: '58.4%',
  corrections: 3,
};

function formatResult(result: Result) {
  return {
    pending: 'Pendiente',
    won: 'Ganado',
    lost: 'Perdido',
    void: 'Void',
  }[result];
}

function App() {
  const [filter, setFilter] = useState<'today' | 'results'>('today');
  const visiblePicks = useMemo(() => {
    if (filter === 'results') return picks.filter((pick) => pick.status === 'finished');
    return picks.filter((pick) => pick.status !== 'finished');
  }, [filter]);

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Navegación principal">
          <div className="brand">
            <span className="brand-mark">G9</span>
            <span>Gana v9</span>
          </div>
          <a href="#alertas">Recibir alertas</a>
        </nav>

        <div className="hero-grid">
          <div>
            <p className="eyebrow">Picks de fútbol revisados por Luis</p>
            <h1>Picks gratis con historial visible, riesgo claro y cero promesas mágicas</h1>
            <p className="hero-copy">
              Una superficie pública original para gana-v9: picks diarios, tiers de confianza,
              resultados append-only y notas cortas para entender el porqué antes de optar por alertas.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#picks">Ver picks de hoy</a>
              <a className="secondary" href="#resultados">Ver historial</a>
            </div>
            <p className="risk-line">{riskLine}</p>
          </div>

          <aside className="scorecard" aria-label="Métricas públicas">
            <span className="score-label">Trust layer</span>
            <strong>{stats.hitRate}</strong>
            <p>Hit rate sobre picks liquidados no-void. ROI oculto hasta 30 picks con stake y odds confiables.</p>
            <div className="metrics">
              <span><b>{stats.published}</b> publicados</span>
              <span><b>{stats.settled}</b> liquidados</span>
              <span><b>{stats.corrections}</b> correcciones visibles</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="filters" id="picks">
        <div>
          <p className="eyebrow">Feed público</p>
          <h2>Picks frescos primero, marketing después</h2>
        </div>
        <div className="tabs" role="tablist" aria-label="Filtros de picks">
          <button className={filter === 'today' ? 'active' : ''} onClick={() => setFilter('today')}>Hoy / Live</button>
          <button className={filter === 'results' ? 'active' : ''} onClick={() => setFilter('results')}>Resultados</button>
        </div>
      </section>

      <section className="pick-grid" aria-live="polite">
        {visiblePicks.map((pick) => (
          <article className={`pick-card ${pick.tier.toLowerCase()}`} key={pick.id}>
            <div className="card-topline">
              <span>{pick.league}</span>
              <span>{pick.kickoff}</span>
            </div>
            <h3>{pick.home} vs {pick.away}</h3>
            <div className="selection">
              <span>{pick.market}</span>
              <strong>{pick.selection}</strong>
            </div>
            <div className="card-facts">
              <span>Cuota {pick.odds.toFixed(2)}</span>
              <span>{pick.tier}</span>
              <span>{pick.stake}</span>
              <span>{formatResult(pick.result)}</span>
            </div>
            <p>{pick.note}</p>
            <p className="risk">Riesgo: {pick.risk}</p>
            <button>Guardar / compartir pick</button>
          </article>
        ))}
      </section>

      <section className="trust" id="resultados">
        <div>
          <p className="eyebrow">Resultados transparentes</p>
          <h2>No se borran picks perdidos</h2>
          <p>
            El historial es append-only: cada pick conserva selección, cuota, tier, stake y timestamp de publicación.
            Las correcciones requieren nota visible y los backfills no inflan métricas públicas.
          </p>
        </div>
        <ul>
          <li>ROI oculto hasta sample confiable de 30 picks liquidados</li>
          <li>Pendientes y voids fuera del denominador de hit rate</li>
          <li>Correcciones visibles, nunca edición silenciosa post-kickoff</li>
        </ul>
      </section>

      <section className="lead" id="alertas">
        <p className="eyebrow">Free → paid sin humo</p>
        <h2>Recibí alertas cuando haya valor real</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Email" placeholder="tu@email.com" type="email" />
          <button>Unirme a alertas</button>
        </form>
        <small>{riskLine}</small>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
