import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const required = [
  'Picks de fútbol revisados por Luis',
  '+18 only. No guaranteed profit. Bet responsibly.',
  'No se borran picks perdidos',
  'ROI oculto hasta sample confiable',
  'Lean',
  'Value',
  'Prime',
  'Guardar / compartir pick',
];

const missing = required.filter((text) => !source.includes(text) && !styles.includes(text));

if (missing.length) {
  console.error(`Missing required public-funnel copy: ${missing.join(', ')}`);
  process.exit(1);
}

if (/gambeta\.ai\/api|profit guaranteed|seguro\s+100|ganancia garantizada/i.test(source)) {
  console.error('Forbidden copy or private endpoint reference detected');
  process.exit(1);
}

console.log('Public picks page checks passed');
