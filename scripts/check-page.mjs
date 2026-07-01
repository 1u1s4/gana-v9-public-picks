import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const feedSource = readFileSync(new URL('../src/feed.ts', import.meta.url), 'utf8');
const artifactSource = readFileSync(new URL('../src/artifactFeed.ts', import.meta.url), 'utf8');
const demoSource = readFileSync(new URL('../src/demoFeed.ts', import.meta.url), 'utf8');
const configSource = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../src/data/latest-recommendations.json', import.meta.url), 'utf8');

const required = [
  'Picks de fútbol revisados por Luis',
  '+18 only. No guaranteed profit. Bet responsibly.',
  'No se borran picks perdidos',
  'ROI oculto hasta sample confiable',
  'Lean',
  'Value',
  'Prime',
  'Mandatory',
  'Daily parlays',
  'World Cup mandatory picks',
  'World Cup general board',
  'Required parlays',
  'Council / manual review',
  'Discord y web deben leer la misma verdad persistida',
  'Discord ↔ Web source of truth',
  'Ledger rows',
  'DB live',
  'review-required',
  'Demo/stale fallback',
  'Guardar / compartir pick',
  'VITE_PUBLIC_PICKS_API_BASE_URL',
  'VITE_GANA_API_BASE',
  '/gana-api',
];

const haystack = [
  source,
  styles,
  vite,
  feedSource,
  artifactSource,
  demoSource,
  configSource,
  dataSource,
].join('\n');
const missing = required.filter((text) => !haystack.includes(text));

if (missing.length) {
  console.error(`Missing required public-feed contract copy: ${missing.join(', ')}`);
  process.exit(1);
}

if (/gambeta\.ai\/api|profit guaranteed|seguro\s+100|ganancia garantizada/i.test(haystack)) {
  console.error('Forbidden copy or private endpoint reference detected');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'gana-public-feed-'));
const compiledFeedPath = join(tempDir, 'feed.mjs');
const compiledArtifactPath = join(tempDir, 'artifactFeed.mjs');

try {
  const transpileOptions = {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  };

  writeFileSync(compiledFeedPath, ts.transpileModule(feedSource, transpileOptions).outputText);
  writeFileSync(
    compiledArtifactPath,
    ts.transpileModule(artifactSource.replace("from './feed'", "from './feed.mjs'"), transpileOptions)
      .outputText,
  );

  const { getVisibleSections, transformPublicFeed } = await import(pathToFileURL(compiledFeedPath).href);
  const { latestArtifactToFeed } = await import(pathToFileURL(compiledArtifactPath).href);

  const apiFeed = transformPublicFeed(
    {
      slateDate: 'Wednesday, July 1',
      timezone: 'America/Guatemala',
      generatedAt: '2026-07-01T18:00:00-06:00',
      source: {
        publicationLedger: {
          status: 'persisted',
          publicationCount: 9,
          publishedAt: '2026-07-02T16:32:00.000Z',
          discordMessageIds: ['discord-1', 'discord-2'],
          payloadSha256: 'abcdef1234567890',
          note: 'Discord publication targets are persisted.',
        },
      },
      sections: [
        {
          kind: 'daily_parlays',
          items: [
            {
              id: 'T-DP-1',
              league: 'Liga MX',
              kickoffLabel: '19:05 GT',
              home: 'America',
              away: 'Puebla',
              market: 'Total goals',
              selection: 'Over 1.5',
              odds: '1.34',
              tier: 'Value',
            },
          ],
        },
        {
          kind: 'worldCupMandatoryPredictions',
          items: [
            {
              teams: 'Brasil vs Marruecos',
              market: 'Team total',
              selection: 'Brasil over 0.5',
              confidence: 'Mandatory',
            },
          ],
        },
        {
          kind: 'requiredParlays',
          items: [
            {
              teams: 'River Plate vs Colo-Colo',
              market: 'Draw no bet',
              selection: 'River Plate',
              tier: 'Lean',
            },
          ],
        },
        {
          kind: 'councilReview',
          state: 'manual-review',
          items: [
            {
              teams: 'Inter Miami vs Atlanta United',
              market: 'Player prop',
              selection: 'Assist pending',
              status: 'review',
            },
          ],
        },
      ],
    },
    'api',
  );

  assert(apiFeed.source === 'api', 'API feed source should be preserved');
  assert(apiFeed.freshness === 'fresh', 'API feed should default to fresh');
  assert(apiFeed.publicationLedger.status === 'persisted', 'Ledger status should normalize persisted state');
  assert(apiFeed.publicationLedger.label.includes('9 targets'), 'Ledger banner should expose persisted target count');
  assert(apiFeed.publicationLedger.discordMessageIds.length === 2, 'Ledger should expose Discord ids count');
  assert(apiFeed.sections.length === 5, 'API feed should render all Discord sections');
  assert(apiFeed.sections[1].kind === 'world_cup_mandatory', 'World Cup mandatory section should normalize');
  assert(apiFeed.sections[1].required === true, 'World Cup mandatory section should be required');
  assert(apiFeed.sections[2].kind === 'world_cup_general', 'World Cup general section should normalize');
  assert(apiFeed.sections[3].kind === 'required_parlays', 'Required parlay section should normalize');
  assert(apiFeed.sections[4].state === 'manual_review', 'Council section state should normalize');
  assert(
    apiFeed.sections[4].items[0].result === 'manual_review',
    'Manual review pick state should normalize',
  );
  assert(apiFeed.sections[0].items[0].odds === 1.34, 'String odds should become numbers');
  assert(
    getVisibleSections(apiFeed, 'required_parlays').length === 1,
    'Section filter should return required parlays only',
  );

  const liveShapeFeed = transformPublicFeed(
    {
      dailySummary: { total: 21, parlays: 3, requiredLeagueGeneralPredictions: 18, status: 'available' },
      requiredLeague: {
        atomicProjections: [
          { id: 'must-1', kind: 'required-league-atomic', fixture: { label: 'Spain vs Austria', league: 'World Cup' }, market: 'h2h', selection: 'home', odds: 1.33, confidence: 0.7, status: 'promotable' },
          { id: 'must-2', kind: 'required-league-atomic', fixture: { label: 'Portugal vs Croatia', league: 'World Cup' }, market: 'goals_over_under', selection: 'under', line: 2.5, odds: 1.76, confidence: 0.64, status: 'review-required' },
          { id: 'must-3', kind: 'required-league-atomic', fixture: { label: 'Switzerland vs Algeria', league: 'World Cup' }, market: 'goals_over_under', selection: 'under', line: 3.25, odds: 1.31, confidence: 0.6, status: 'review-required' },
        ],
        selectedParlayApproaches: Array.from({ length: 6 }, (_, index) => ({ id: `required-parlay-${index}`, kind: 'parlay', profile: 'principal', fixture: { label: 'Spain vs Austria + Portugal vs Croatia', league: 'World Cup' }, odds: 1.54, confidence: 0.64, status: 'review-required', legs: [] })),
      },
      requiredLeagueGeneralPredictions: Array.from({ length: 18 }, (_, index) => ({ id: `general-${index}`, kind: 'required-league-general', fixture: { label: 'Portugal vs Croatia', league: 'World Cup' }, market: 'double_chance', selection: 'home_or_draw', odds: 1.17, confidence: 0.8, status: 'blocked' })),
    },
    'api',
  );
  assert(liveShapeFeed.sections[1].items.length === 3, 'World Cup mandatory should show only the 3 required atomic picks');
  assert(liveShapeFeed.sections[2].items.length === 18, 'World Cup general board should show the 18 general predictions');
  assert(liveShapeFeed.sections[3].items.length === 6, 'Required parlays should show the 6 selected approaches');

  const demoFeed = transformPublicFeed({ dailyParlays: [{ selection: 'Demo pick' }] }, 'demo');
  assert(demoFeed.source === 'demo', 'Fallback feed should be marked demo');
  assert(demoFeed.freshness === 'stale', 'Fallback feed should be marked stale');

  const artifactFeed = latestArtifactToFeed(JSON.parse(dataSource), 'test fallback');
  assert(artifactFeed.source === 'demo', 'Artifact fallback should be marked demo/stale');
  assert(artifactFeed.sections.length === 5, 'Artifact fallback should render all Discord sections');
  assert(artifactFeed.sections[0].items.length > 0, 'Artifact fallback should expose daily parlays');
  assert(
    artifactFeed.sections[4].state === 'manual_review',
    'Artifact fallback should preserve council review state',
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Public picks realtime page and feed contract checks passed');

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}
