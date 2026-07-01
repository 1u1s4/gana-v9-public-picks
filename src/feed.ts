export type PickTier = 'Lean' | 'Value' | 'Prime' | 'Mandatory';
export type PickResult = 'pending' | 'won' | 'lost' | 'void' | 'manual_review';
export type FeedSource = 'api' | 'demo';
export type FeedFreshness = 'fresh' | 'stale';
export type FeedSectionKind =
  | 'daily_parlays'
  | 'world_cup_mandatory'
  | 'required_parlays'
  | 'council_review';

export type PublicPick = {
  id: string;
  league: string;
  kickoffLabel: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  odds: number | null;
  tier: PickTier;
  stake: string;
  analystNote: string;
  riskNote: string;
  result: PickResult;
  tags: string[];
};

export type FeedSection = {
  id: string;
  kind: FeedSectionKind;
  title: string;
  summary: string;
  state: 'ready' | 'pending' | 'manual_review';
  required: boolean;
  items: PublicPick[];
};

export type FeedStats = {
  publishedToday: number;
  activeParlays: number;
  pendingReview: number;
  settledSample: number;
  hitRate: string;
};

export type PublicFeed = {
  source: FeedSource;
  freshness: FeedFreshness;
  sourceLabel: string;
  staleReason?: string;
  slateDate: string;
  timezone: string;
  generatedAt: string;
  nextRefreshSeconds: number;
  stats: FeedStats;
  sections: FeedSection[];
};

export type RawPublicFeed = {
  source?: string;
  freshness?: string;
  sourceLabel?: string;
  staleReason?: string;
  slateDate?: string;
  date?: string;
  timezone?: string;
  generatedAt?: string;
  updatedAt?: string;
  nextRefreshSeconds?: number;
  stats?: Partial<FeedStats>;
  dailySummary?: {
    total?: number;
    parlays?: number;
    atomicPredictions?: number;
    requiredLeagueGeneralPredictions?: number;
    status?: string;
  };
  source?: { publicationLedger?: { status?: string; publicationCount?: number; note?: string } };
  sections?: RawFeedSection[];
  parlays?: RawApiRecommendation[];
  atomicPredictions?: RawApiRecommendation[];
  requiredLeagueGeneralPredictions?: RawApiRecommendation[];
  requiredLeague?: { selectedParlayApproaches?: RawApiRecommendation[]; atomicProjections?: RawApiRecommendation[] };
  dailyParlays?: RawPick[];
  worldCupMandatoryPredictions?: RawPick[];
  requiredParlays?: RawPick[];
  councilReview?: RawFeedSection | RawPick[];
};

export type RawFeedSection = {
  id?: string;
  kind?: string;
  title?: string;
  summary?: string;
  state?: string;
  required?: boolean;
  items?: RawPick[];
};

export type RawPick = {
  id?: string;
  league?: string;
  competition?: string;
  kickoffLabel?: string;
  kickoff?: string;
  home?: string;
  away?: string;
  teams?: string;
  market?: string;
  selection?: string;
  odds?: number | string | null;
  tier?: string;
  confidence?: string;
  stake?: string;
  analystNote?: string;
  note?: string;
  riskNote?: string;
  risk?: string;
  result?: string;
  status?: string;
  tags?: string[];
};

export type RawApiRecommendation = {
  kind?: string;
  parlayId?: string;
  predictionId?: string;
  id?: string;
  status?: string;
  profile?: string | null;
  odds?: number | null;
  confidence?: number | null;
  stake?: { label?: string | null; units?: number | null; percentOfBankroll?: number | null } | null;
  fixture?: RawApiFixture;
  profile?: string | null;
  market?: string;
  selection?: string;
  line?: number | null;
  edge?: number | null;
  generatedAt?: string | null;
  legs?: Array<{
    fixture?: RawApiFixture;
    market?: string;
    selection?: string;
    line?: number | null;
    odds?: number | null;
    status?: string | null;
  }>;
  riskFlags?: string[];
};

export type RawApiFixture = {
  label?: string | null;
  league?: string | null;
  kickoff?: string | null;
  kickoffLocal?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
};

export const sectionOrder: FeedSectionKind[] = [
  'daily_parlays',
  'world_cup_mandatory',
  'required_parlays',
  'council_review',
];

const sectionDefaults: Record<
  FeedSectionKind,
  Pick<FeedSection, 'id' | 'kind' | 'title' | 'summary' | 'state' | 'required'>
> = {
  daily_parlays: {
    id: 'daily-parlays',
    kind: 'daily_parlays',
    title: 'Daily parlays',
    summary: 'Combinadas del día con stake bajo y exposición controlada.',
    state: 'ready',
    required: false,
  },
  world_cup_mandatory: {
    id: 'world-cup-mandatory',
    kind: 'world_cup_mandatory',
    title: 'World Cup mandatory predictions',
    summary: 'Predicciones obligatorias para el bloque mundialista antes del cierre.',
    state: 'ready',
    required: true,
  },
  required_parlays: {
    id: 'required-parlays',
    kind: 'required_parlays',
    title: 'Required parlays',
    summary: 'Parlays requeridos por el calendario editorial y publicados con trazabilidad.',
    state: 'ready',
    required: true,
  },
  council_review: {
    id: 'council-review',
    kind: 'council_review',
    title: 'Council / manual review',
    summary: 'Selecciones retenidas hasta revisión manual o confirmación de alineaciones.',
    state: 'manual_review',
    required: false,
  },
};

const defaultStats: FeedStats = {
  publishedToday: 0,
  activeParlays: 0,
  pendingReview: 0,
  settledSample: 0,
  hitRate: 'N/A',
};

export function transformPublicFeed(raw: RawPublicFeed, source: FeedSource = 'api'): PublicFeed {
  const generatedAt = raw.generatedAt ?? raw.updatedAt ?? new Date().toISOString();
  const sections = normalizeSections(raw);
  const stats = {
    ...defaultStats,
    ...raw.stats,
  };

  if (!raw.stats) {
    stats.publishedToday = sections.reduce((count, section) => count + section.items.length, 0);
    stats.activeParlays = sections
      .filter((section) => section.kind.includes('parlay'))
      .reduce((count, section) => count + section.items.length, 0);
    stats.pendingReview = sections
      .flatMap((section) => section.items)
      .filter((pick) => pick.result === 'manual_review').length;
  }

  if (raw.dailySummary) {
    const requiredParlayCount = raw.requiredLeague?.selectedParlayApproaches?.length ?? 0;
    stats.publishedToday = raw.dailySummary.total ?? stats.publishedToday;
    stats.activeParlays = (raw.dailySummary.parlays ?? 0) + requiredParlayCount;
    stats.pendingReview = uniquePickCount(
      sections.flatMap((section) => section.items).filter((pick) => pick.result === 'manual_review'),
    );
    stats.hitRate = raw.dailySummary.status === 'available' ? 'Sample building' : stats.hitRate;
  }

  return {
    source,
    freshness: source === 'demo' ? 'stale' : normalizeFreshness(raw.freshness),
    sourceLabel: raw.sourceLabel ?? (source === 'demo' ? 'Demo fallback' : 'Public API'),
    staleReason: raw.staleReason,
    slateDate: raw.slateDate ?? raw.date ?? formatSlateDate(generatedAt),
    timezone: raw.timezone ?? 'America/Guatemala',
    generatedAt,
    nextRefreshSeconds: Number(raw.nextRefreshSeconds ?? 45),
    stats,
    sections,
  };
}

function uniquePickCount(items: PublicPick[]): number {
  return new Set(items.map((item) => item.id)).size;
}

export function getVisibleSections(feed: PublicFeed, filter: 'all' | FeedSectionKind): FeedSection[] {
  if (filter === 'all') return feed.sections;
  return feed.sections.filter((section) => section.kind === filter);
}

export function formatKickoffWindow(feed: PublicFeed): string {
  const timestamp = new Date(feed.generatedAt);
  if (Number.isNaN(timestamp.getTime())) return `${feed.slateDate} · ${feed.timezone}`;

  return `${feed.slateDate} · synced ${timestamp.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: feed.timezone,
  })}`;
}

function normalizeSections(raw: RawPublicFeed): FeedSection[] {
  const directSections = raw.sections?.map(normalizeSection) ?? [];
  const apiSections = normalizeApiRecommendationSections(raw);
  const legacySections: FeedSection[] = [
    normalizeSection({ kind: 'daily_parlays', items: raw.dailyParlays }),
    normalizeSection({
      kind: 'world_cup_mandatory',
      items: raw.worldCupMandatoryPredictions,
    }),
    normalizeSection({ kind: 'required_parlays', items: raw.requiredParlays }),
    normalizeSection(
      Array.isArray(raw.councilReview)
        ? { kind: 'council_review', items: raw.councilReview, state: 'manual_review' }
        : { kind: 'council_review', ...raw.councilReview },
    ),
  ];

  const merged = new Map<FeedSectionKind, FeedSection>();
  [...legacySections, ...directSections, ...apiSections].forEach((section) => {
    const previous = merged.get(section.kind);
    merged.set(section.kind, previous ? { ...section, items: [...previous.items, ...section.items] } : section);
  });

  return sectionOrder.map((kind) => merged.get(kind) ?? normalizeSection({ kind, items: [] }));
}

function normalizeApiRecommendationSections(raw: RawPublicFeed): FeedSection[] {
  const parlays = raw.parlays?.map((item) => apiRecommendationToPick(item, 'parlay')) ?? [];
  const atomic = raw.atomicPredictions?.map((item) => apiRecommendationToPick(item, 'atomic')) ?? [];
  const required = raw.requiredLeagueGeneralPredictions?.map((item) => apiRecommendationToPick(item, 'required')) ?? [];
  const requiredParlays = raw.requiredLeague?.selectedParlayApproaches?.map((item) => apiRecommendationToPick(item, 'parlay')) ?? [];
  const review = [...parlays, ...atomic, ...required, ...requiredParlays].filter((pick) => normalizeResult(pick.status ?? pick.result) === 'manual_review');

  return [
    normalizeSection({ kind: 'daily_parlays', items: [...parlays, ...atomic] }),
    normalizeSection({ kind: 'world_cup_mandatory', required: true, items: required.filter((pick) => /world cup|mundial/i.test(pick.league ?? '')) }),
    normalizeSection({ kind: 'required_parlays', required: true, items: requiredParlays }),
    normalizeSection({ kind: 'council_review', state: 'manual_review', items: review }),
  ];
}

function apiRecommendationToPick(item: RawApiRecommendation, fallbackKind: 'parlay' | 'atomic' | 'required'): RawPick {
  const firstLeg = item.legs?.[0];
  const fixture = item.fixture ?? firstLeg?.fixture;
  const [home, away] = splitLabel(fixture?.label);
  const id = item.parlayId ?? item.predictionId ?? item.id;
  const confidence = typeof item.confidence === 'number' ? item.confidence : null;
  const profile = prettyProfile(item.profile ?? item.kind ?? fallbackKind);
  const legs = item.legs ?? [];
  const fixtureSummary = legs.length
    ? legs.slice(0, 3).map((leg) => leg.fixture?.label ?? 'Fixture').join(' + ')
    : fixture?.label;
  return {
    id,
    league: fixture?.league ?? firstLeg?.fixture?.league ?? 'Football',
    kickoff: formatApiKickoff(fixture?.kickoffLocal ?? fixture?.kickoff ?? firstLeg?.fixture?.kickoffLocal ?? firstLeg?.fixture?.kickoff),
    home: fallbackKind === 'parlay' ? fixtureSummary ?? 'Parlay' : fixture?.homeTeam ?? home ?? fixture?.label ?? 'Match',
    away: fallbackKind === 'parlay' ? profile : fixture?.awayTeam ?? away ?? 'TBD',
    market: fallbackKind === 'parlay' ? `${legs.length} legs` : humanMarket(item.market ?? firstLeg?.market),
    selection: fallbackKind === 'parlay' ? summarizeApiLegs(legs) : formatSelection(item.selection ?? firstLeg?.selection, item.line ?? firstLeg?.line, item.market ?? firstLeg?.market),
    odds: item.odds ?? firstLeg?.odds ?? null,
    tier: confidence !== null && confidence >= 0.84 ? 'Prime' : confidence !== null && confidence >= 0.72 ? 'Value' : fallbackKind === 'required' ? 'Mandatory' : 'Lean',
    stake: formatStake(item.stake),
    note: `${profile}${formatConfidence(confidence)}${formatEdge(item.edge)}`,
    risk: item.riskFlags?.slice(0, 3).map(humanRisk).join(', ') || 'Revisión manual antes de promoción.',
    result: item.status,
    tags: [fallbackKind, item.status ?? 'review-required', item.profile].filter((value): value is string => Boolean(value)).map(prettyTag),
  };
}

function splitLabel(label?: string | null): [string | undefined, string | undefined] {
  const match = /^(.*?)\s+vs\s+(.*)$/i.exec(label ?? '');
  return match ? [match[1], match[2]] : [undefined, undefined];
}

function summarizeApiLegs(legs: NonNullable<RawApiRecommendation['legs']>): string {
  if (!legs.length) return 'Selection pending';
  return legs
    .slice(0, 3)
    .map((leg) => `${leg.fixture?.label ?? 'Fixture'}: ${formatSelection(leg.selection, leg.line, leg.market)} @ ${formatOddsValue(leg.odds)}`)
    .join(' + ');
}

function formatSelection(selection?: string, line?: number | null, market?: string): string {
  const prettySelection = humanSelection(selection, market);
  return typeof line === 'number' && !prettySelection.match(String(line))
    ? `${prettySelection} ${line}`
    : prettySelection;
}

function formatStake(stake: RawApiRecommendation['stake']): string {
  if (!stake) return 'Revisión manual';
  if (typeof stake.units === 'number') return `${stake.units}u`;
  if (typeof stake.percentOfBankroll === 'number') return `${Math.round(stake.percentOfBankroll * 10000) / 100}% bankroll`;
  return stake.label ? prettyTag(stake.label) : 'Revisión manual';
}

function formatOddsValue(value?: number | null): string {
  return typeof value === 'number' ? value.toFixed(2) : 'TBD';
}

function formatConfidence(value: number | null): string {
  return typeof value === 'number' ? ` · Conf ${Math.round(value * 100)}%` : '';
}

function formatEdge(value?: number | null): string {
  return typeof value === 'number' ? ` · Edge ${Math.round(value * 10000) / 100}%` : '';
}

function prettyProfile(value: string): string {
  const map: Record<string, string> = {
    'parlay-diamante': '💎 Parlay diamante',
    'parlay-refinado': '🧠 Parlay refinado',
    'low-variance': '🛡️ Low variance',
    principal: '💎 Principal',
    resultados: '⚽ Resultados',
    'mixto-seguro': '🧩 Mixto seguro',
    parlay: 'Parlay',
    atomic: 'Simple',
    required: 'Obligatoria',
  };
  return map[value] ?? prettyTag(value);
}

function prettyTag(value: string): string {
  return value.replace(/[|][^\s]+/g, '').split(/[-_\s]+/).filter(Boolean).slice(0, 3).join(' ');
}

function humanMarket(value?: string): string {
  const map: Record<string, string> = {
    goals_over_under: 'Total goles',
    total_goals: 'Total goles',
    double_chance: 'Doble oportunidad',
    h2h: 'Resultado',
    btts: 'Ambos anotan',
    corners_over_under: 'Corners',
  };
  return value ? map[value] ?? prettyTag(value) : 'Market pending';
}

function humanSelection(value?: string, market?: string): string {
  const map: Record<string, string> = {
    over: 'Más de',
    under: 'Menos de',
    home: 'Local gana',
    away: 'Visitante gana',
    draw: 'Empate',
    home_or_draw: 'Local o empate',
    away_or_draw: 'Visitante o empate',
    home_or_away: 'Sin empate',
    yes: market === 'btts' ? 'Sí' : 'Sí',
    no: market === 'btts' ? 'No' : 'No',
  };
  return value ? map[value] ?? prettyTag(value) : 'Selection pending';
}

function humanRisk(value: string): string {
  const map: Record<string, string> = {
    'review-required': 'requiere revisión',
    'daily-focus-fallback': 'fallback diario',
    'analytical-fallback': 'analítico',
    'low-liquidity': 'baja liquidez',
    'profile-window-miss': 'fuera de ventana ideal',
  };
  return map[value] ?? prettyTag(value);
}

function formatApiKickoff(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    timeZone: 'America/Guatemala',
  }).format(date);
}

function normalizeSection(raw: RawFeedSection): FeedSection {
  const kind = normalizeSectionKind(raw.kind);
  const defaults = sectionDefaults[kind];

  return {
    ...defaults,
    id: raw.id ?? defaults.id,
    title: raw.title ?? defaults.title,
    summary: raw.summary ?? defaults.summary,
    state: normalizeSectionState(raw.state ?? defaults.state),
    required: raw.required ?? defaults.required,
    items: (raw.items ?? []).map((item, index) => normalizePick(item, `${defaults.id}-${index + 1}`)),
  };
}

function normalizePick(raw: RawPick, fallbackId: string): PublicPick {
  const [home, away] = splitTeams(raw);
  const result = normalizeResult(raw.result ?? raw.status);

  return {
    id: raw.id ?? fallbackId,
    league: raw.league ?? raw.competition ?? 'Football',
    kickoffLabel: raw.kickoffLabel ?? raw.kickoff ?? 'TBD',
    home,
    away,
    market: raw.market ?? 'Market pending',
    selection: raw.selection ?? 'Selection pending',
    odds: normalizeOdds(raw.odds),
    tier: normalizeTier(raw.tier ?? raw.confidence),
    stake: raw.stake ?? '0.5u',
    analystNote: raw.analystNote ?? raw.note ?? 'Awaiting analyst note from the public read model.',
    riskNote: raw.riskNote ?? raw.risk ?? 'Confirm odds and line movement before staking.',
    result,
    tags: raw.tags ?? (result === 'manual_review' ? ['manual-review'] : []),
  };
}

function normalizeSectionKind(kind?: string): FeedSectionKind {
  if (kind === 'world_cup_mandatory' || kind === 'worldCupMandatoryPredictions') {
    return 'world_cup_mandatory';
  }
  if (kind === 'required_parlays' || kind === 'requiredParlays') return 'required_parlays';
  if (kind === 'council_review' || kind === 'councilReview') return 'council_review';
  return 'daily_parlays';
}

function normalizeSectionState(state?: string): FeedSection['state'] {
  if (state === 'pending') return 'pending';
  if (state === 'manual_review' || state === 'manual-review') return 'manual_review';
  return 'ready';
}

function normalizeFreshness(freshness?: string): FeedFreshness {
  return freshness === 'stale' ? 'stale' : 'fresh';
}

function normalizeTier(tier?: string): PickTier {
  if (tier === 'Mandatory') return 'Mandatory';
  if (tier === 'Prime') return 'Prime';
  if (tier === 'Value') return 'Value';
  return 'Lean';
}

function normalizeResult(result?: string): PickResult {
  if (result === 'won' || result === 'lost' || result === 'void') return result;
  if (
    result === 'manual_review' ||
    result === 'manual-review' ||
    result === 'review' ||
    result === 'review-required'
  ) {
    return 'manual_review';
  }
  return 'pending';
}

function normalizeOdds(odds?: number | string | null): number | null {
  if (typeof odds === 'number' && Number.isFinite(odds)) return odds;
  if (typeof odds === 'string') {
    const parsed = Number(odds);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function splitTeams(raw: RawPick): [string, string] {
  if (raw.home || raw.away) return [raw.home ?? 'Home', raw.away ?? 'Away'];
  if (raw.teams?.includes(' vs ')) {
    const [home, away] = raw.teams.split(' vs ');
    return [home.trim(), away.trim()];
  }
  return [raw.teams ?? 'Match', 'TBD'];
}

function formatSlateDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';

  return date.toLocaleDateString('es-GT', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Guatemala',
  });
}
