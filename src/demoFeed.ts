import { transformPublicFeed, type PublicFeed, type RawPublicFeed } from './feed';

export const fallbackReason =
  'Public API unavailable or VITE_PUBLIC_PICKS_API_BASE_URL is not configured.';

const demoFeed: RawPublicFeed = {
  sourceLabel: 'Demo fallback',
  staleReason: fallbackReason,
  slateDate: 'Wednesday, July 1',
  timezone: 'America/Guatemala',
  generatedAt: '2026-07-01T15:30:00-06:00',
  nextRefreshSeconds: 45,
  stats: {
    publishedToday: 7,
    activeParlays: 3,
    pendingReview: 2,
    settledSample: 89,
    hitRate: '58.4%',
  },
  sections: [
    {
      kind: 'daily_parlays',
      title: 'Daily parlays',
      summary: 'Low-stake daily card. Keep exposure small until the API slate confirms line movement.',
      items: [
        {
          id: 'DEMO-DP-001',
          league: 'Mundial 2026',
          kickoffLabel: '13:00 GT',
          home: 'Paraguay',
          away: 'Francia',
          market: 'Double chance',
          selection: 'Francia or draw',
          odds: 1.28,
          tier: 'Prime',
          stake: '1.0u',
          note: 'Protected side only; do not chase a higher line if the market moves late.',
          risk: 'Lower stake if France rotates more than two starters.',
          tags: ['daily', 'parlay-leg'],
        },
        {
          id: 'DEMO-DP-002',
          league: 'Liga MX',
          kickoffLabel: '19:05 GT',
          home: 'America',
          away: 'Puebla',
          market: 'Total goals',
          selection: 'Over 1.5',
          odds: 1.34,
          tier: 'Value',
          stake: '0.75u',
          note: 'Simple volume spot. The edge is the floor, not a stretched alternate total.',
          risk: 'Avoid if the price drops below 1.25 before kickoff.',
          tags: ['daily', 'parlay-leg'],
        },
      ],
    },
    {
      kind: 'world_cup_mandatory',
      title: 'World Cup mandatory predictions',
      summary: 'Mandatory predictions from the Discord workflow, grouped before optional plays.',
      required: true,
      items: [
        {
          id: 'DEMO-WC-001',
          league: 'World Cup',
          kickoffLabel: '16:00 GT',
          home: 'Brasil',
          away: 'Marruecos',
          market: 'Team total',
          selection: 'Brasil over 0.5 goals',
          odds: 1.31,
          tier: 'Mandatory',
          stake: '1.0u',
          note: 'Mandatory card item because it anchors the public slate and has a low volatility profile.',
          risk: 'Wait for lineup confirmation if the API marks Neymar unavailable.',
          tags: ['world-cup', 'mandatory'],
        },
      ],
    },
    {
      kind: 'required_parlays',
      title: 'Required parlays',
      summary: 'Required parlays stay separate from normal daily plays so users can audit them later.',
      required: true,
      items: [
        {
          id: 'DEMO-RP-001',
          league: 'Copa Libertadores',
          kickoffLabel: '20:30 GT',
          home: 'River Plate',
          away: 'Colo-Colo',
          market: '1X2',
          selection: 'River Plate draw no bet',
          odds: 1.52,
          tier: 'Lean',
          stake: '0.5u',
          note: 'Manual cap on stake because liquidity can be thin close to kickoff.',
          risk: 'Do not combine with correlated home-team overs.',
          tags: ['required', 'parlay'],
        },
      ],
    },
    {
      kind: 'council_review',
      title: 'Council / manual review',
      summary: 'Picks held by council review remain visible, but they are not active betting instructions.',
      state: 'manual_review',
      items: [
        {
          id: 'DEMO-CR-001',
          league: 'MLS',
          kickoffLabel: 'Review',
          home: 'Inter Miami',
          away: 'Atlanta United',
          market: 'Player prop',
          selection: 'Assist prop pending',
          odds: null,
          tier: 'Lean',
          stake: '0u',
          note: 'Manual review required because the public feed is missing lineup and minutes confidence.',
          risk: 'Not actionable until council marks it ready.',
          result: 'manual_review',
          tags: ['manual-review'],
        },
      ],
    },
  ],
};

export function getFallbackFeed(reason = fallbackReason): PublicFeed {
  return transformPublicFeed({ ...demoFeed, staleReason: reason }, 'demo');
}
