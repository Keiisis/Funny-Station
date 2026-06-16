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

  // Synchronisation Cloud avec Supabase Storage ou Table (game_saves)
  public async syncToCloud(gameId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[VFS] Aucun utilisateur connecté pour la synchronisation cloud.");
        return false;
      }

      const files = await this.getAllFiles();
      const saveContent = JSON.stringify(files);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(saveContent);

      const { error } = await supabase.from('game_saves').upsert({
        user_id: user.id,
        game_id: gameId,
        slot_name: 'cloud_sync',
        save_data: bytes,
        checksum: crypto.randomUUID()
      });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('game_saves')
        .select('save_data')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .eq('slot_name', 'cloud_sync')
        .single();

      if (error || !data) {
        console.log("[VFS] Aucune sauvegarde trouvée dans le cloud.");
        return false;
      }

      const decoder = new TextDecoder();
      const filesJson = decoder.decode(data.save_data as any);
      const files = JSON.parse(filesJson);

      await this.clear();
      for (const [path, content] of Object.entries(files)) {
        await this.writeFile(path, content as any);
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
