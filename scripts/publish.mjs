#!/usr/bin/env node
// Publish one edition into the "mailbox" the app reads.
//
// Usage:  node scripts/publish.mjs <YYYY-MM-DD>-<matin|midi>
//         node scripts/publish.mjs <YYYY-MM-DD>          (ancien format, toléré)
//
// Deux éditions par jour : « matin » et « midi ». Chacune est un fichier
// editions/<YYYY-MM-DD>-<matin|midi>.json (les anciens fichiers sans créneau,
// editions/<YYYY-MM-DD>.json, restent lisibles jusqu'à leur purge).
//
// Pre-req: the edition has been written to editions/<slug>.json
// (follow edition.template.json / ROUTINE.md). This script then:
//   1. validates that file against the schema,
//   2. normalizes its `date` / `dateShort` / `slot` to match the filename,
//   3. copies it to latest.json           ← the app's fixed mailbox address,
//      en y joignant la leçon d'astrophysique en cours (astro/lessons/),
//   4. prunes editions/ older than 15 days (relative to this edition's date),
//   5. rebuilds index.json                ← the dedup ledger the routine reads.
//
// After it runs: git add -A && git commit && git push.

import {
  readFileSync, writeFileSync, readdirSync, existsSync, rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDITIONS_DIR = join(ROOT, 'editions');
const LESSONS_DIR = join(ROOT, 'astro', 'lessons');
const RETENTION_DAYS = 15;

const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
// <YYYY-MM-DD> ou <YYYY-MM-DD>-matin / -midi (le suffixe est le « créneau »).
const SLUG_RE = /^(\d{4}-\d{2}-\d{2})(?:-(matin|midi))?$/;
const EDITION_FILE_RE = /^\d{4}-\d{2}-\d{2}(?:-(?:matin|midi))?\.json$/;
// Ordre de publication d'une même journée : ancien fichier sans créneau, puis
// matin, puis midi — sert à trier index.json du plus récent au plus ancien.
const SLOT_RANK = { '': 0, matin: 1, midi: 2 };
// Cours d'astrophysique : astro/lessons/<NNN>-<slug>.json, une leçon par jour.
// Les leçons ne sont jamais purgées — le cours est cumulatif.
const LESSON_FILE_RE = /^(\d{3})-[a-z0-9-]+\.json$/;

// Fixed order + chip colours for the 6 rubriques — enforced so the visual
// identity never drifts, whatever the routine produces.
const RUBRIQUE_ORDER = [
  { chipPrefix: 'Législation', ink: '#2a4a6b', tint: '#eaf0f6' },
  { chipPrefix: 'Jurisprudence', ink: '#7a2230', tint: '#f6ecec' },
  { chipPrefix: 'Doctrine', ink: '#2f5741', tint: '#eaf2ed' },
  { chipPrefix: 'Culture', ink: '#7d5a1c', tint: '#f6f0e2' },
  { chipPrefix: 'Pratique', ink: '#2f5566', tint: '#eaf2f4' },
  { chipPrefix: 'Actualité', ink: '#5a3f66', tint: '#f1ecf4' },
];

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const write = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

function dateShortFr(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${FR_MONTHS[m - 1]}`;
}

/** "2026-08-25-midi.json" → { date: "2026-08-25", slot: "midi" } */
function parseSlug(slug) {
  const m = SLUG_RE.exec(slug);
  return m ? { date: m[1], slot: m[2] ?? '' } : null;
}

/** Contrôle minimal d'une leçon — même esprit que validate() pour l'édition. */
function validateLesson(l, file) {
  const errs = [];
  if (typeof l?.n !== 'number') errs.push(`${file}: n manquant ou non numérique`);
  if (!l?.title) errs.push(`${file}: title manquant`);
  if (!Array.isArray(l?.sections) || l.sections.length < 1) {
    errs.push(`${file}: sections doit être un tableau non vide`);
  } else {
    l.sections.forEach((sec, i) => {
      if (!sec?.h || !sec?.body) errs.push(`${file}: sections[${i}] incomplète`);
    });
  }
  if (!l?.recap) errs.push(`${file}: recap manquant`);
  return errs;
}

/**
 * Lit toutes les leçons, vérifie la numérotation, renvoie la plus récente
 * (le plus grand `n`) et le registre à écrire dans astro/index.json.
 */
function collectLessons() {
  if (!existsSync(LESSONS_DIR)) return { current: null, ledger: [] };
  const files = readdirSync(LESSONS_DIR).filter((f) => LESSON_FILE_RE.test(f)).sort();
  const lessons = files.map((f) => {
    const l = JSON.parse(readFileSync(join(LESSONS_DIR, f), 'utf8'));
    const errs = validateLesson(l, `astro/lessons/${f}`);
    if (errs.length) fail('leçon invalide :\n  - ' + errs.join('\n  - '));
    const numbered = Number(LESSON_FILE_RE.exec(f)[1]);
    if (numbered !== l.n) {
      fail(`astro/lessons/${f} : le numéro du fichier (${numbered}) ne correspond pas à n=${l.n}`);
    }
    return { file: `astro/lessons/${f}`, lesson: l };
  });
  lessons.sort((a, b) => a.lesson.n - b.lesson.n);
  lessons.forEach(({ lesson }, i) => {
    if (lesson.n !== i + 1) fail(`numérotation des leçons discontinue : attendu ${i + 1}, trouvé ${lesson.n}`);
  });
  return {
    current: lessons.length ? lessons[lessons.length - 1].lesson : null,
    ledger: lessons.map(({ file, lesson }) => ({
      n: lesson.n,
      file,
      title: lesson.title,
      terms: Array.isArray(lesson.keyTerms) ? lesson.keyTerms.map((t) => t.term) : [],
    })),
  };
}

function validate(e) {
  const errs = [];
  if (!e || typeof e !== 'object') return ['edition is not a JSON object'];
  if (!e.essentiel?.title) errs.push('essentiel.title missing');
  if (!e.essentiel?.url) errs.push('essentiel.url missing');
  if (!Array.isArray(e.rubriques) || e.rubriques.length !== 6) {
    errs.push('rubriques must be an array of exactly 6');
  } else {
    e.rubriques.forEach((r, i) => {
      for (const k of ['chip', 'title', 'summary', 'source', 'url']) {
        if (!r?.[k]) errs.push(`rubriques[${i}].${k} missing`);
      }
    });
  }
  if (!e.mot?.term) errs.push('mot.term missing');
  if (!e.mot?.defShort) errs.push('mot.defShort missing');
  if (!Array.isArray(e.mot?.fiche) || e.mot.fiche.length < 1) {
    errs.push('mot.fiche must be a non-empty array');
  }
  return errs;
}

// ── main ────────────────────────────────────────────────────────────────────
const slug = process.argv[2];
const parsed = slug && parseSlug(slug);
if (!parsed) fail('usage: node scripts/publish.mjs <YYYY-MM-DD>-<matin|midi>');
const { date, slot } = parsed;
if (!slot) {
  console.warn('! aucun créneau dans le nom de fichier — préfère '
    + `${date}-matin / ${date}-midi (deux éditions par jour)`);
}

const editionPath = join(EDITIONS_DIR, `${slug}.json`);
if (!existsSync(editionPath)) {
  fail(`missing editions/${slug}.json — write the edition there first`);
}

let edition;
try {
  edition = JSON.parse(readFileSync(editionPath, 'utf8'));
} catch (e) {
  fail(`editions/${slug}.json is not valid JSON: ${e.message}`);
}

const errs = validate(edition);
if (errs.length) fail('schema errors:\n  - ' + errs.join('\n  - '));

// Normalize date fields and re-assert the canonical chip colours/labels.
edition.date = date;
edition.dateShort = dateShortFr(date);
if (slot) edition.slot = slot;
else delete edition.slot;
if (!edition.essentiel.label) edition.essentiel.label = "L'essentiel du jour";
if (!edition.mot.label) edition.mot.label = 'Le mot du jour';
edition.rubriques.forEach((r, i) => {
  r.ink = RUBRIQUE_ORDER[i].ink;
  r.tint = RUBRIQUE_ORDER[i].tint;
});
write(editionPath, edition);

// Publish to the mailbox — l'édition du jour, plus la leçon d'astrophysique en
// cours. La leçon vit hors des éditions (cours cumulatif, jamais purgé) : elle
// est jointe ici pour que l'appli n'ait toujours qu'un seul fichier à relever.
const { current: lesson, ledger } = collectLessons();
write(join(ROOT, 'latest.json'), lesson ? { ...edition, astro: lesson } : edition);
if (ledger.length) {
  write(join(ROOT, 'astro', 'index.json'), {
    updated: date,
    count: ledger.length,
    lessons: ledger,
  });
}

// Prune editions older than RETENTION_DAYS, measured from this edition's date
// (deterministic — no reliance on the wall clock).
const cutoff = new Date(date + 'T00:00:00Z');
cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
const pruned = [];
for (const f of readdirSync(EDITIONS_DIR).filter((f) => EDITION_FILE_RE.test(f))) {
  if (new Date(f.slice(0, 10) + 'T00:00:00Z') < cutoff) {
    rmSync(join(EDITIONS_DIR, f));
    pruned.push(f);
  }
}

// Rebuild index.json (newest first) — the ledger the routine reads to avoid
// repeating a recent essentiel, mot du jour, or rubrique topic.
const sortKey = (f) => {
  const { date: d, slot: s } = parseSlug(f.replace(/\.json$/, ''));
  return `${d}-${SLOT_RANK[s]}`;
};
const editions = readdirSync(EDITIONS_DIR)
  .filter((f) => EDITION_FILE_RE.test(f))
  .sort((a, b) => sortKey(b).localeCompare(sortKey(a))) // plus récent d'abord
  .map((f) => {
    const e = JSON.parse(readFileSync(join(EDITIONS_DIR, f), 'utf8'));
    return {
      date: f.slice(0, 10),
      slot: parseSlug(f.replace(/\.json$/, '')).slot || null,
      file: `editions/${f}`,
      essentiel: e.essentiel?.title ?? '',
      term: e.mot?.term ?? '',
      rubriques: Array.isArray(e.rubriques) ? e.rubriques.map((r) => r.title) : [],
    };
  });
write(join(ROOT, 'index.json'), {
  updated: date,
  updatedSlot: slot || null,
  count: editions.length,
  editions,
});

console.log(`✓ published ${slug} → latest.json`);
if (lesson) console.log(`✓ leçon d'astrophysique n°${lesson.n} jointe (${ledger.length} au total)`);
else console.log("! aucune leçon d'astrophysique trouvée — latest.json est publié sans");
console.log(`✓ index.json rebuilt (${editions.length} edition(s) in the last ${RETENTION_DAYS} days)`);
if (pruned.length) console.log(`✓ pruned ${pruned.length} old edition(s): ${pruned.join(', ')}`);
