import { supabase } from '@/utils/supabase/client';

export class VirtualFileSystem {
  private dbName: string;
  private storeName = 'files';
  private db: IDBDatabase | null = null;

  constructor(gameId: string) {
    this.dbName = `fs_vfs_${gameId}`;
  }

  public async init(): Promise<VirtualFileSystem> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve(this);
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this);
      };

      request.onerror = (event: any) => {
        reject(new Error(`Impossible d'initialiser IndexedDB: ${event.target.error}`));
      };
    });
  }

  public async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("VFS non initialisé"));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(content, path);

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async readFile(path: string): Promise<string | Uint8Array | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);

      request.onsuccess = (e: any) => resolve(e.target.result || null);
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async deleteFile(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("VFS non initialisé"));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(path);

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async getAllFiles(): Promise<{ [path: string]: any }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve({});
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const files: { [path: string]: any } = {};
      const request = store.openCursor();

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          files[cursor.primaryKey as string] = cursor.value;
          cursor.continue();
        } else {
          resolve(files);
        }
      };

      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  // ── Sérialisation binaire-safe pour JSONB ───────────────────────────────────
  // Un fichier VFS peut être une chaîne OU un Uint8Array (binaire). JSON.stringify
  // détruit les Uint8Array (→ objets d'index), d'où des sauvegardes illisibles.
  // On encode donc chaque fichier en { t:'str'|'bin', v } où le binaire passe en base64.
  private static u8ToB64(u8: Uint8Array): string {
    let s = '';
    const CHUNK = 0x8000; // évite le dépassement de pile sur les gros tableaux
    for (let i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK)));
    }
    return btoa(s);
  }

  private static b64ToU8(b64: string): Uint8Array {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  // Synchronisation Cloud avec Supabase (table game_saves, une ligne par user+game+slot).
  public async syncToCloud(gameId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        console.warn("[VFS] Aucun utilisateur connecté pour la synchronisation cloud.");
        return false;
      }

      const files = await this.getAllFiles();
      const serialized: Record<string, { t: 'str' | 'bin'; v: string }> = {};
      for (const [path, content] of Object.entries(files)) {
        if (content instanceof Uint8Array) {
          serialized[path] = { t: 'bin', v: VirtualFileSystem.u8ToB64(content) };
        } else if (typeof content === 'string') {
          serialized[path] = { t: 'str', v: content };
        } else {
          // Objet quelconque → JSON (cas rare ; on garde la donnée).
          serialized[path] = { t: 'str', v: JSON.stringify(content) };
        }
      }

      // onConflict OBLIGATOIRE : la PK est `id`, l'unicité est (user_id, game_id, slot_name).
      // Sans ça, l'upsert tente un INSERT et viole la contrainte dès la 2e sauvegarde.
      const { error } = await supabase.from('game_saves').upsert(
        {
          user_id: user.id,
          game_id: gameId,
          slot_name: 'cloud_sync',
          save_data: { format: 'vfs-v2', files: serialized },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,game_id,slot_name' }
      );

      if (error) throw error;
      console.log("[VFS] Sauvegarde synchronisée avec succès sur Supabase.");
      return true;
    } catch (err) {
      console.error("[VFS] Échec de la synchronisation vers le cloud :", err);
      return false;
    }
  }

  public async syncFromCloud(gameId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return false;

      const { data, error } = await supabase
        .from('game_saves')
        .select('save_data')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .eq('slot_name', 'cloud_sync')
        .maybeSingle();

      if (error || !data) {
        console.log("[VFS] Aucune sauvegarde trouvée dans le cloud.");
        return false;
      }

      const sd = data.save_data as { format?: string; files?: Record<string, { t: string; v: string }> } | null;
      // Compat : tout format inconnu (ancien binaire corrompu) est ignoré proprement.
      if (!sd || sd.format !== 'vfs-v2' || !sd.files) {
        console.log("[VFS] Sauvegarde cloud absente ou format obsolète — ignorée.");
        return false;
      }

      await this.clear();
      for (const [path, entry] of Object.entries(sd.files)) {
        if (entry?.t === 'bin') await this.writeFile(path, VirtualFileSystem.b64ToU8(entry.v));
        else await this.writeFile(path, entry?.v ?? '');
      }

      console.log("[VFS] Restauration cloud complétée.");
      return true;
    } catch (err) {
      console.error("[VFS] Échec de la restauration depuis le cloud :", err);
      return false;
    }
  }
}

// Helper simple d'initialisation
export const initVFS = async (gameId: string): Promise<VirtualFileSystem> => {
  const vfs = new VirtualFileSystem(gameId);
  return await vfs.init();
};
