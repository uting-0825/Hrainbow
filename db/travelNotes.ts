import { env } from 'cloudflare:workers';
import { travelNotesSchemaSql } from './schema';

type RuntimeEnv = {
  DB: D1Database;
};

type TravelNoteRow = {
  photo_key: string;
  note: string;
};

let schemaPromise: Promise<void> | null = null;

function database() {
  return (env as unknown as RuntimeEnv).DB;
}

async function ensureSchema() {
  schemaPromise ??= database().prepare(travelNotesSchemaSql).run().then(() => undefined);
  await schemaPromise;
}

export async function getTravelNotes() {
  await ensureSchema();
  const result = await database()
    .prepare('SELECT photo_key, note FROM travel_notes ORDER BY photo_key')
    .all<TravelNoteRow>();

  return Object.fromEntries(result.results.map((row) => [row.photo_key, row.note]));
}

export async function saveTravelNote(photoKey: string, note: string) {
  await ensureSchema();

  if (!note) {
    await database().prepare('DELETE FROM travel_notes WHERE photo_key = ?').bind(photoKey).run();
    return;
  }

  await database()
    .prepare(`
      INSERT INTO travel_notes (photo_key, note, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(photo_key) DO UPDATE SET
        note = excluded.note,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(photoKey, note)
    .run();
}
