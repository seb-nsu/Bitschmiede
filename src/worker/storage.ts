// Ablage der Spielstände im Worker (TEC-R42, TEC-R43): JSON mit gzip (CompressionStream), gespeichert in IndexedDB.
// Funktioniert im Browser und in der Electron-Hülle gleich; Export und Import als Datei laufen über die Oberfläche.
import type { SaveFile, SaveMeta } from "../sim/save";

const DB_NAME = "game-studio-tycoon";
const STORE = "saves";

export interface SlotInfo {
  slot: string;
  savedAt: string;
  meta: SaveMeta;
  bytes: number;
}

interface Record_ {
  slot: string;
  savedAt: string;
  meta: SaveMeta;
  data: Uint8Array;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "slot" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function compress(file: SaveFile): Promise<Uint8Array> {
  return pipe(new TextEncoder().encode(JSON.stringify(file)), new CompressionStream("gzip"));
}

export async function decompress(bytes: Uint8Array): Promise<unknown> {
  return JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream("gzip"))));
}

export async function writeSlot(slot: string, file: SaveFile): Promise<SlotInfo> {
  const data = await compress(file);
  const record: Record_ = { slot, savedAt: new Date().toISOString(), meta: file.meta, data };
  await withStore("readwrite", (s) => s.put(record));
  return { slot, savedAt: record.savedAt, meta: record.meta, bytes: data.byteLength };
}

export async function readSlot(slot: string): Promise<Uint8Array | null> {
  const r = await withStore<Record_ | undefined>("readonly", (s) => s.get(slot) as IDBRequest<Record_ | undefined>);
  return r ? r.data : null;
}

export async function listSlots(): Promise<SlotInfo[]> {
  const all = await withStore<Record_[]>("readonly", (s) => s.getAll() as IDBRequest<Record_[]>);
  return all
    .map((r) => ({ slot: r.slot, savedAt: r.savedAt, meta: r.meta, bytes: r.data.byteLength }))
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function deleteSlot(slot: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(slot));
}

/** TEC-R43: Autosave rotiert über eine feste Zahl von Slots; überschrieben wird der älteste. */
export async function nextAutosaveSlot(count: number): Promise<string> {
  const slots = await listSlots();
  for (let i = 1; i <= count; i++) {
    const name = `auto-${i}`;
    if (!slots.some((s) => s.slot === name)) return name;
  }
  const autos = slots.filter((s) => s.slot.startsWith("auto-")).sort((a, b) => (a.savedAt < b.savedAt ? -1 : 1));
  return autos[0]?.slot ?? "auto-1";
}
