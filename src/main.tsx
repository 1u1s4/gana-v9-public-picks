import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { latestArtifactToFeed, latestArtifactToRawFeed } from './artifactFeed';
import { getPublicFeedUrl, publicFeedConfig } from './config';
import latestData from './data/latest-recommendations.json';
import {
  formatKickoffWindow,
  getVisibleSections,
  sectionOrder,
  transformPublicFeed,
  type FeedSectionKind,
  type PublicFeed,
  type PublicPick,
} from './feed';
import './styles.css';

type FeedFilter = 'all' | FeedSectionKind;

type FeedState = {
  feed: PublicFeed;
  loading: boolean;
  error: string | null;
  lastLoadedAt: string;
};

const defaultRiskLine = '+18 only. No guaranteed profit. Bet responsibly.';
const riskLine = latestData.riskLine ?? defaultRiskLine;
const localProxyEnvName = 'VITE_GANA_API_BASE';

const filterLabels: Record<FeedFilter, string> = {
  all: 'All',
  daily_parlays: 'Daily',
  world_cup_mandatory: 'World Cup',
  world_cup_general: 'Analysis',
  required_parlays: 'Required',
  council_review: 'Council',
};

const stateLabels = {
  ready: 'Ready',
  pending: 'Pending',
  manual_review: 'Manual review',
};

const resultLabels = {
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
  void: 'Void',
  manual_review: 'Manual review',
};

function App() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [feedState, setFeedState] = useState<FeedState>(() => {
    const feed = latestArtifactToFeed(latestData, 'Waiting for the public API configuration.');
    return {
      feed,
      loading: true,
      error: null,
      lastLoadedAt: feed.generatedAt,
    };
  });

  useEffect(() => {
    const configuredFeedUrl = getPublicFeedUrl();
    const feedUrl = configuredFeedUrl ? withDefaultSlateDate(configuredFeedUrl, latestSlateDate()) : null;

    if (!feedUrl) {
      const feed = latestArtifactToFeed(latestData, 'No public API base URL is configured for this deploy.');
      setFeedState({
        feed,
        loading: false,
        error: 'Demo/stale fallback is visible because the API URL is not configured.',
        lastLoadedAt: new Date().toISOString(),
      });
      return undefined;
    }

    let cancelled = false;

    async function loadFeed() {
      setFeedState((current) => ({ ...current, loading: true }));

      try {
        const response = await fetch(feedUrl, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Feed request failed with ${response.status}`);
        }

        const rawFeed = await response.json();
        if (cancelled) return;

        const normalizedRawFeed = rawFeed?.schemaVersion === 1 && rawFeed?.recommendations
          ? latestArtifactToRawFeed(rawFeed, 'Live local artifact feed from gana-v9 core.')
          : rawFeed;

        const feed = transformPublicFeed(
          {
            ...normalizedRawFeed,
            sourceLabel: normalizedRawFeed.sourceLabel ?? new URL(feedUrl, window.location.href).hostname,
          },
          'api',
        );

        setFeedState({
          feed,
          loading: false,
          error: null,
          lastLoadedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : 'Unknown feed error';
        setFeedState((current) => {
          const nextFeed =
            current.feed.source === 'api'
              ? {
                  ...current.feed,
                  freshness: 'stale' as const,
                  staleReason: message,
                }
              : latestArtifactToFeed(latestData, message);

          return {
            feed: nextFeed,
            loading: false,
            error: `Demo/stale fallback is visible because ${message}.`,
            lastLoadedAt: new Date().toISOString(),
          };
        });
      }
    }

    loadFeed();
    const intervalId = window.setInterval(loadFeed, publicFeedConfig.pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const visibleSections = useMemo(
    () => getVisibleSections(feedState.feed, filter),
    [feedState.feed, filter],
  );

  const sourceStatus =
    feedState.feed.source === 'api' && feedState.feed.freshness === 'fresh' ? 'DB live' : 'Demo / stale';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#feed" aria-label="Gana v9 public picks">
          <span className="brand-mark">G9</span>
          <span>
            <strong>Gana v9</strong>
            <small>Public picks</small>
          </span>
        </a>
        <div className={`source-pill ${feedState.feed.source}`}>
          <span>{sourceStatus}</span>
          <small>{feedState.feed.sourceLabel}</small>
        </div>
      </header>

      <section className="daily-header" aria-labelledby="daily-title">
        <div className="daily-copy">
          <p className="eyebrow">Picks de fútbol revisados por Luis</p>
          <h1 id="daily-title">Daily public slate</h1>
          <p>{formatKickoffWindow(feedState.feed)}</p>
        </div>

        <dl className="metric-strip" aria-label="Public feed metrics">
          <Metric label="Today" value={feedState.feed.stats.publishedToday.toString()} />
          <Metric label="Parlays" value={feedState.feed.stats.activeParlays.toString()} />
          <Metric label="Review" value={feedState.feed.stats.pendingReview.toString()} />
          <Metric label="Hit rate" value={feedState.feed.stats.hitRate} />
        </dl>
      </section>

      <section className="status-row" aria-live="polite">
        <div>
          <strong>{feedState.loading ? 'Syncing feed' : 'Feed synced'}</strong>
          <span>{formatSyncTime(feedState.lastLoadedAt, feedState.feed.timezone)}</span>
        </div>
        {feedState.error ? (
          <p>{feedState.error}</p>
        ) : (
          <p>Realtime feed refreshes every {Math.round(publicFeedConfig.pollMs / 1000)}s.</p>
        )}
      </section>

      <section className={`ledger-banner ${feedState.feed.publicationLedger.status}`} aria-label="Publication ledger status">
        <div>
          <p className="eyebrow">Discord ↔ Web source of truth</p>
          <h2>{feedState.feed.publicationLedger.label}</h2>
          <p>{feedState.feed.publicationLedger.note}</p>
        </div>
        <dl>
          <Metric label="Ledger rows" value={feedState.feed.publicationLedger.publicationCount.toString()} />
          <Metric label="Discord IDs" value={feedState.feed.publicationLedger.discordMessageIds.length.toString()} />
          <Metric label="Payload hash" value={shortHash(feedState.feed.publicationLedger.payloadSha256)} />
        </dl>
      </section>

      <nav className="tabs" aria-label="Feed filters">
        {(['all', ...sectionOrder] as FeedFilter[]).map((option) => (
          <button
            key={option}
            className={filter === option ? 'active' : ''}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {filterLabels[option]}
          </button>
        ))}
      </nav>

      <section className="feed-layout" id="feed" aria-live="polite">
        {visibleSections.map((section) => {
          const displayLimit = section.kind === 'council_review' && filter === 'all' ? 6 : section.items.length;
          const displayedItems = section.items.slice(0, displayLimit);
          const hiddenCount = Math.max(section.items.length - displayedItems.length, 0);

          return (
            <article className="section-panel" key={section.id}>
              <header className="section-header">
                <div>
                  <p className="eyebrow">{section.required ? 'Required block' : 'Public block'}</p>
                  <h2>{section.title}</h2>
                  <p>{section.summary}</p>
                </div>
                <span className={`section-state ${section.state}`}>{stateLabels[section.state]}</span>
              </header>

              {hiddenCount > 0 ? (
                <div className="review-summary">
                  <strong>Mostrando {displayedItems.length} claves de revisión</strong>
                  <span>{hiddenCount} más quedan visibles en las secciones Analysis/Required para evitar duplicar el feed completo.</span>
                </div>
              ) : null}

              {displayedItems.length ? (
                <div className="pick-list">
                  {displayedItems.map((pick) => (
                    <PickCard key={`${section.id}-${pick.id}`} pick={pick} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">No active picks in this block.</div>
              )}
            </article>
          );
        })}
      </section>

      <section className="trust-layer" id="resultados">
        <div>
          <p className="eyebrow">Trust layer</p>
          <h2>No se borran picks perdidos</h2>
          <p>
            Discord y web deben leer la misma verdad persistida; hoy Discord y web leen la misma verdad pública.
            El estado de ledger arriba separa publicaciones persistidas de batches viejos que sólo tienen
            artifact auditado. Corrections stay visible and manual-review picks never count as settled wins.
          </p>
        </div>
        <ul>
          <li>ROI oculto hasta sample confiable de 30 picks liquidados</li>
          <li>Pendientes, manual review y voids fuera del denominador de hit rate</li>
          <li>review-required stays visible until council approval clears it</li>
          <li>Demo/stale fallback clearly labeled when the API is unavailable</li>
        </ul>
      </section>

      <section className="lead" id="alertas">
        <div>
          <p className="eyebrow">Free to paid</p>
          <h2>Recibí alertas cuando haya valor real</h2>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Email" placeholder="tu@email.com" type="email" />
          <button type="submit">Unirme a alertas</button>
        </form>
      </section>

      <footer className="responsible-footer">
        <strong>{riskLine}</strong>
        <span>Public picks are informational, not financial advice. Never bet money you cannot afford to lose.</span>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PickCard({ pick }: { pick: PublicPick }) {
  const shareText = `${pick.home} vs ${pick.away} · ${pick.selection} · ${formatOdds(pick.odds)}`;

  return (
    <article className={`pick-card ${pick.tier.toLowerCase().replace(' ', '-')}`}>
      <div className="pick-topline">
        <span>{pick.league}</span>
        <span>{pick.kickoffLabel}</span>
      </div>

      <div className="match-row">
        <strong>{pick.home}</strong>
        <span>vs</span>
        <strong>{pick.away}</strong>
      </div>

      <div className="selection-box">
        <span>{pick.market}</span>
        <strong>{pick.selection}</strong>
      </div>

      <dl className="pick-facts">
        <Fact label="Odds" value={formatOdds(pick.odds)} />
        <Fact label="Tier" value={pick.tier} />
        <Fact label="Stake" value={pick.stake} />
        <Fact label="State" value={resultLabels[pick.result]} />
      </dl>

      <p>{pick.analystNote}</p>
      <p className="risk">Riesgo: {pick.riskNote}</p>

      <div className="tag-row">
        {pick.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <button type="button" onClick={() => void navigator.clipboard?.writeText(shareText)}>
        Guardar / compartir pick
      </button>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatOdds(odds: number | null) {
  return odds === null ? 'TBD' : odds.toFixed(2);
}

function latestSlateDate(): string | undefined {
  const data = latestData as { date?: string; source?: { date?: string | null } };
  return data.date ?? data.source?.date ?? undefined;
}

function withDefaultSlateDate(feedUrl: string, slateDate?: string): string {
  if (!slateDate || /[?&]date=/.test(feedUrl)) return feedUrl;
  const separator = feedUrl.includes('?') ? '&' : '?';
  return `${feedUrl}${separator}date=${encodeURIComponent(slateDate)}`;
}

function shortHash(value: string | null) {
  return value ? value.slice(0, 10) : '—';
}

function formatSyncTime(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last sync unknown';

  return date.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone,
  });
}

createRoot(document.getElementById('root')!).render(<App />);
