import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const coreRepo = process.env.GANA_V9_CORE_REPO
  ? resolve(process.env.GANA_V9_CORE_REPO)
  : resolve(repoRoot, '..', 'gana-v9');

const batchId = process.env.GANA_V9_DAILY_BATCH_ID ?? latestDailyBatch(coreRepo);
const sourceArtifact = resolve(coreRepo, '.artifacts/gana-v9/runs', batchId, 'daily-parlay-recommendations.json');
const summaryArtifact = resolve(coreRepo, '.artifacts/gana-v9/runs', batchId, 'daily-e2e-summary.json');
const lockArtifact = resolve(coreRepo, '.artifacts/gana-v9/cron/locks', `daily-e2e-${sourceDateFromBatch(batchId)}.lock`);

if (!existsSync(sourceArtifact)) {
  throw new Error(`Daily recommendation artifact not found: ${sourceArtifact}`);
}

const raw = readFileSync(sourceArtifact, 'utf8');
const source = JSON.parse(raw);
const summary = existsSync(summaryArtifact) ? JSON.parse(readFileSync(summaryArtifact, 'utf8')) : null;
const lock = existsSync(lockArtifact) ? JSON.parse(readFileSync(lockArtifact, 'utf8')) : null;

const recommendations = (source.recommendations ?? []).map((recommendation, index) => {
  const legs = (recommendation.legs ?? []).map((leg) => ({
    predictionId: leg.predictionId ?? null,
    fixtureId: leg.fixtureId ?? null,
    league: leg.display?.leagueName ?? 'Competición pendiente',
    kickoff: leg.display?.kickoffLocal ?? null,
    fixture: leg.display?.fixtureLabel ?? leg.fixture ?? 'Fixture pendiente',
    market: publicMarket(leg.market),
    selection: publicSelection(leg.selection, leg.line),
    odds: typeof leg.odds === 'number' ? leg.odds : null,
    confidence: typeof leg.confidence === 'number' ? leg.confidence : null,
    status: leg.validationStatus ?? 'unvalidated',
    warnings: publicWarnings(leg.warnings ?? []),
  }));

  return {
    id: recommendation.parlayId ?? recommendation.predictionId ?? `recommendation-${index + 1}`,
    kind: recommendation.kind ?? (legs.length > 1 ? 'parlay' : 'pick'),
    rank: recommendation.rank ?? index + 1,
    profile: recommendation.profile ?? null,
    tier: tierFor(recommendation.aggregateConfidence ?? recommendation.adjustedProbability ?? recommendation.score ?? 0),
    status: recommendation.harnessStatus ?? recommendation.validationStatus ?? 'review-required',
    sourceRunId: recommendation.sourceRunId ?? null,
    sourceRunIds: recommendation.sourceRunIds ?? [],
    parlayId: recommendation.parlayId ?? null,
    combinedOdds: typeof recommendation.combinedOdds === 'number' ? recommendation.combinedOdds : null,
    aggregateConfidence: typeof recommendation.aggregateConfidence === 'number' ? recommendation.aggregateConfidence : null,
    stake: publicStake(recommendation.stake, recommendation.stakeRecommendation),
    note: publicNote(recommendation),
    riskFlags: publicWarnings(recommendation.riskFlags ?? []),
    reasons: publicWarnings(recommendation.reasons ?? []).slice(0, 3),
    legs,
  };
});

const discordMessageIds = publicWarnings([
  lock?.messageId,
  ...(Array.isArray(lock?.messageIds) ? lock.messageIds : []),
  ...(Array.isArray(lock?.publicationLedger?.discordMessageIds) ? lock.publicationLedger.discordMessageIds : []),
]).filter((value) => !/^(undefined|null)$/i.test(value));

const publicationTrace = {
  status: lock?.status ?? null,
  dailyBatchId: lock?.dailyBatchId ?? source.dailyBatchId ?? batchId,
  completedAt: lock?.completedAt ?? summary?.completedAt ?? null,
  recommendationCount: lock?.recommendationCount ?? source.publishedTargets?.recommendationCount ?? recommendations.length,
  selectionCount: lock?.selectionCount ?? source.publishedTargets?.predictionIds?.length ?? null,
  requiredLeagueSelectionCount: lock?.requiredLeagueSelectionCount ?? null,
  discordMessageId: discordMessageIds[0] ?? null,
  discordMessageIds,
  exactPayloadPath: lock?.payloadPath ?? null,
  payloadPath: lock?.publicationLedger?.payloadPath ?? lock?.payloadPath ?? null,
  payloadSha256: lock?.publicationLedger?.payloadSha256 ?? null,
  targetLedger: lock?.ledger ?? null,
  publicationLedger: lock?.publicationLedger ?? null,
  publicationLedgerStatus: lock?.publicationLedger?.ok === true ? 'persisted' : lock?.publicationLedger?.ok === false ? 'error' : null,
  publicationLedgerReason: lock?.publicationLedger?.reason ?? lock?.ledger?.reason ?? null,
};

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  riskLine: '+18 only. No guaranteed profit. Bet responsibly.',
  source: {
    kind: 'gana-v9-daily-parlay-recommendations-artifact',
    coreRepoRelativePath: relative(coreRepo, sourceArtifact),
    sha256: createHash('sha256').update(raw).digest('hex'),
    dailyBatchId: source.dailyBatchId ?? batchId,
    date: source.date ?? null,
    sourceRunIds: source.sourceRunIds ?? [],
    publishedTargets: source.publishedTargets ?? null,
    executionCapability: source.executionCapability ?? null,
    analyticalArtifactOnly: source.analyticalArtifactOnly ?? null,
  },
  publicationTrace,
  stats: {
    published: source.publishedTargets?.recommendationCount ?? recommendations.length,
    settled: 0,
    hitRate: null,
    corrections: 0,
    roiVisible: false,
  },
  recommendations,
};

const outputPath = resolve(repoRoot, 'src/data/latest-recommendations.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Synced ${recommendations.length} recommendation(s) from ${relative(coreRepo, sourceArtifact)}`);

function latestDailyBatch(coreRepoPath) {
  const cronDir = resolve(coreRepoPath, '.artifacts/gana-v9/cron');
  const outcome = resolve(cronDir, 'daily-2026-07-02-full-outcome.json');
  if (existsSync(outcome)) return 'daily-2026-07-02-full';
  return 'daily-2026-07-01-full';
}

function sourceDateFromBatch(value) {
  const match = value.match(/daily-(\d{4}-\d{2}-\d{2})-/);
  if (!match) throw new Error(`Cannot derive daily lock date from batch id: ${value}`);
  return match[1];
}

function tierFor(score) {
  if (score >= 0.84) return 'Prime';
  if (score >= 0.72) return 'Value';
  return 'Lean';
}

function publicMarket(market) {
  return {
    goals_over_under: 'Total goles',
    double_chance: 'Doble oportunidad',
    h2h: '1X2',
  }[market] ?? String(market ?? 'Mercado pendiente');
}

function publicSelection(selection, line) {
  const label = {
    over: 'Más de',
    under: 'Menos de',
    home_or_draw: 'Local o empate',
    away_or_draw: 'Visitante o empate',
    home: 'Local',
    away: 'Visitante',
    draw: 'Empate',
  }[selection] ?? String(selection ?? 'Selección pendiente');
  return typeof line === 'number' ? `${label} ${line}` : label;
}

function publicStake(stake, stakeRecommendation) {
  if (stake?.units === 0 || stake?.percentOfBankroll === 0) return '0u · revisión manual';
  if (typeof stakeRecommendation?.stake === 'number') return `${stakeRecommendation.stake}% bankroll sugerido`;
  if (typeof stake?.units === 'number') return `${stake.units}u`;
  return 'Stake pendiente';
}

function publicWarnings(values) {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

function publicNote(recommendation) {
  if (recommendation.harnessStatus === 'review-required') {
    return 'Recomendación respaldada por artifact diario de gana-v9, marcada para revisión manual antes de cualquier promoción.';
  }
  return 'Recomendación respaldada por artifact diario de gana-v9 y lista para revisión pública.';
}
