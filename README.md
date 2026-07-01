# Gana v9 Public Picks

MVP público para el feed de picks de gana-v9. La primera pantalla muestra el slate diario, estado de sincronización, filtros por bloque y cards de picks desde el read model público.

## Qué incluye

- Feed público con estado DB live o demo/stale
- Header diario con métricas del slate
- Tabs para Daily parlays, World Cup mandatory predictions, Required parlays y Council / manual review
- Cards de picks con liga, kickoff, mercado, selección, cuota, tier, stake y nota
- Tiers Lean / Value / Prime
- Resultados visibles con ledger append-only
- CTA de alertas después de mostrar valor
- Guardrails +18 / no guaranteed profit / bet responsibly

## Configuración del feed

La app intenta leer JSON desde:

```bash
VITE_PUBLIC_PICKS_API_BASE_URL=https://tu-api-publica.example
VITE_GANA_API_BASE=/gana-api
VITE_PUBLIC_PICKS_FEED_PATH=/public-picks/feed
VITE_PUBLIC_PICKS_POLL_MS=45000
```

`VITE_GANA_API_BASE` funciona como alias compatible con el proxy local de Vite. Si no se configura ninguna base URL, la app intenta `/gana-api/public-picks/feed`; si la API falla, la UI usa el artifact generado como fallback marcado `Demo / stale`.

Contrato esperado del read model:

```json
{
  "slateDate": "Wednesday, July 1",
  "timezone": "America/Guatemala",
  "generatedAt": "2026-07-01T18:00:00-06:00",
  "stats": {
    "publishedToday": 7,
    "activeParlays": 3,
    "pendingReview": 2,
    "settledSample": 89,
    "hitRate": "58.4%"
  },
  "sections": [
    { "kind": "daily_parlays", "items": [] },
    { "kind": "world_cup_mandatory", "items": [] },
    { "kind": "required_parlays", "items": [] },
    { "kind": "council_review", "state": "manual_review", "items": [] }
  ]
}
```

## Correr local

```bash
npm install
npm run dev
```

## Verificar

```bash
npm test
npm run build
```

## Fuente de producto

Derivado de la documentación canónica del repo `gana-v9`:

- `docs/growth/public-picks-funnel.md`
- `docs/growth/free-to-paid-funnel.md`
- `docs/growth/free-to-paid-measurement-contract.md`
- `docs/competitive-intelligence/gambeta-public-boundary.md`

No copia marca, assets, copy, código ni endpoints privados de competidores
