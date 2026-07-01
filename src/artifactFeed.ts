import { transformPublicFeed, type PublicFeed, type RawPick, type RawPublicFeed } from './feed';

type LatestRecommendationLeg = {
  league?: string;
  kickoff?: string | null;
  fixture?: string;
  market?: string;
  selection?: string;
  odds?: number | null;
};

type LatestRecommendation = {
  id?: string;
  kind?: string;
  rank?: number;
  profile?: string | null;
  tier?: string;
  status?: string;
  combinedOdds?: number | null;
  stake?: string;
  note?: string;
  riskFlags?: string[];
  reasons?: string[];
  legs?: LatestRecommendationLeg[];
};

type LatestRecommendationsData = {
  generatedAt?: string;
  source?: {
    coreRepoRelativePath?: string;
    dailyBatchId?: string;
    date?: string | null;
  };
  publicationTrace?: {
    requiredLeagueSelectionCount?: number | null;
  };
  stats?: {
    published?: number;
    settled?: number;
    hitRate?: string | null;
  };
  recommendations?: LatestRecommendation[];
};

export function latestArtifactToFeed(
  data: LatestRecommendationsData,
  staleReason = 'Public API unavailable; showing generated artifact fallback.',
): PublicFeed {
  return transformPublicFeed(latestArtifactToRawFeed(data, staleReason), 'demo');
}

export function latestArtifactToRawFeed(
  data: LatestRecommendationsData,
  staleReason = 'Public API unavailable; showing generated artifact fallback.',
): RawPublicFeed {
  const recommendations = data.recommendations ?? [];
  const picks = recommendations.map(recommendationToPick);
  const reviewPicks = recommendations
    .filter((recommendation) => recommendation.status === 'review-required')
    .map(recommendationToPick);
  const worldCupPicks = recommendations
    .filter((recommendation) =>
      (recommendation.legs ?? []).some((leg) => /world cup|mundial/i.test(leg.league ?? '')),
    )
    .map(recommendationToPick);

  return {
    sourceLabel: 'Artifact fallback',
    staleReason,
    slateDate: data.source?.date ?? 'Latest artifact',
    timezone: 'America/Guatemala',
    generatedAt: data.generatedAt ?? new Date().toISOString(),
    nextRefreshSeconds: 45,
    stats: {
      publishedToday: data.stats?.published ?? picks.length,
      activeParlays: picks.filter((pick) => pick.tags?.includes('parlay')).length,
      pendingReview: reviewPicks.length,
      settledSample: data.stats?.settled ?? 0,
      hitRate: data.stats?.hitRate ?? 'Sample building',
    },
    sections: [
      {
        kind: 'daily_parlays',
        title: 'Daily parlays',
        summary: `Artifact ${data.source?.dailyBatchId ?? 'latest'} from ${
          data.source?.coreRepoRelativePath ?? 'core read model'
        }.`,
        items: picks,
      },
      {
        kind: 'world_cup_mandatory',
        title: 'World Cup mandatory predictions',
        summary: 'Mandatory World Cup predictions stay isolated for Discord parity and auditability.',
        required: true,
        items: worldCupPicks,
      },
      {
        kind: 'required_parlays',
        title: 'Required parlays',
        summary: `${
          data.publicationTrace?.requiredLeagueSelectionCount ?? 0
        } required league selections traced in the publication lock.`,
        required: true,
        items: picks,
      },
      {
        kind: 'council_review',
        title: 'Council / manual review',
        summary: 'Review-required recommendations are visible but not active staking instructions.',
        state: 'manual_review',
        items: reviewPicks,
      },
    ],
  };
}

function recommendationToPick(recommendation: LatestRecommendation, index: number): RawPick {
  const legs = recommendation.legs ?? [];
  const firstLeg = legs[0];
  const profile = recommendation.profile ? titleCase(recommendation.profile) : `Recommendation ${recommendation.rank ?? index + 1}`;
  const riskFlags = [...(recommendation.riskFlags ?? []), ...(recommendation.reasons ?? [])].filter(Boolean);

  const fixtureSummary = compactUnique(legs.map((leg) => leg.fixture)).slice(0, 3).join(' + ');

  return {
    id: recommendation.id ?? `artifact-recommendation-${index + 1}`,
    league: compactUnique(legs.map((leg) => leg.league)).slice(0, 2).join(' + ') || 'Football',
    kickoffLabel: firstLeg?.kickoff ? formatKickoff(firstLeg.kickoff) : 'Review',
    home: fixtureSummary || profile,
    away: profile,
    market: recommendation.kind === 'parlay' ? `${legs.length} legs` : firstLeg?.market,
    selection: summarizeSelections(legs),
    odds: recommendation.combinedOdds ?? firstLeg?.odds ?? null,
    tier: recommendation.tier,
    stake: recommendation.stake ?? 'Stake pending',
    note: recommendation.note,
    risk: riskFlags.slice(0, 3).join(', ') || 'Manual review required before promotion.',
    result: recommendation.status,
    tags: [
      recommendation.kind ?? 'pick',
      recommendation.profile ?? 'artifact',
      recommendation.status ?? 'review-required',
    ],
  };
}

function summarizeSelections(legs: LatestRecommendationLeg[]): string {
  if (!legs.length) return 'Selection pending';
  return legs
    .slice(0, 3)
    .map((leg) => `${leg.market ?? 'Market'}: ${leg.selection ?? 'Selection'}`)
    .join(' + ');
}

function compactUnique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatKickoff(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Kickoff pending';

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    timeZone: 'America/Guatemala',
  }).format(date);
}
