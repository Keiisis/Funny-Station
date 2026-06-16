import { initVFS, VirtualFileSystem } from './vfs';

export class MemorySwapManager {
  private gameId: string;
  private vfs: VirtualFileSystem | null = null;
  private ramCache: Map<string, Uint8Array> = new Map();
  private ramUsageBytes = 0;
  private maxRamBytes: number;

  // Liste d'ordonnancement pour l'algorithme LRU (Least Recently Used)
  private lruOrder: string[] = [];

  constructor(gameId: string, maxMemoryMb = 128) {
    this.gameId = gameId;
    this.maxRamBytes = maxMemoryMb * 1024 * 1024;
  }

  public async init(): Promise<void> {
    this.vfs = await initVFS(this.gameId);
    
    // Demander la persistance du stockage si supporté
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
    }
  }

  // Enregistrer ou mettre à jour un asset dans la RAM virtuelle
  public async loadAsset(path: string, fetchUrl: string): Promise<Uint8Array> {
    this.updateLRU(path);

    // 1. Vérifier si l'asset est déjà en RAM
    if (this.ramCache.has(path)) {
      return this.ramCache.get(path)!;
    }

    // 2. Vérifier si l'asset est en Swap (IndexedDB)
    if (this.vfs) {
      const swappedData = await this.vfs.readFile(path);
      if (swappedData && swappedData instanceof Uint8Array) {
        await this.allocateInRam(path, swappedData);
        return swappedData;
      }
    }

    // 3. Sinon, télécharger l'asset depuis le réseau / CDN
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Échec de récupération de l'asset: ${fetchUrl}`);
    }
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Mettre en Swap (IndexedDB) pour les chargements futurs
    if (this.vfs) {
      await this.vfs.writeFile(path, data);
    }

    // Charger en RAM (avec swap si nécessaire)
    await this.allocateInRam(path, data);

    return data;
  }

  // Allouer de la place en RAM et décharger d'autres éléments si le quota est dépassé
  private async allocateInRam(path: string, data: Uint8Array): Promise<void> {
    const assetSize = data.length;

    // Si l'asset à lui seul est plus gros que la RAM max autorisée, on l'alloue mais on swap tout le reste
    while (this.ramUsageBytes + assetSize > this.maxRamBytes && this.lruOrder.length > 0) {
      // Trouver le candidat de swap (le moins récemment utilisé qui n'est pas le path actuel)
      const swapCandidate = this.lruOrder.find(p => p !== path);
      if (!swapCandidate) break;

      await this.swapOut(swapCandidate);
    }

    this.ramCache.set(path, data);
    this.ramUsageBytes += assetSize;
    console.log(`[Swap] Alloc: ${path} (${(assetSize / 1024 / 1024).toFixed(2)} MB). RAM active: ${(this.ramUsageBytes / 1024 / 1024).toFixed(2)} MB.`);
  }

  // Décharger un fichier de la RAM (il reste persistant dans IndexedDB)
  private async swapOut(path: string): Promise<void> {
    const data = this.ramCache.get(path);
    if (!data) return;

    this.ramCache.delete(path);
    this.ramUsageBytes -= data.length;
    this.lruOrder = this.lruOrder.filter(p => p !== path);

    console.log(`[Swap] Ejecté de la RAM vers IndexedDB : ${path}`);
  }

  private updateLRU(path: string) {
    this.lruOrder = this.lruOrder.filter(p => p !== path);
    this.lruOrder.push(path);
  }

  public getActiveRamUsage(): number {
    return this.ramUsageBytes;
  }

  public clearRam() {
    this.ramCache.clear();
    this.ramUsageBytes = 0;
    this.lruOrder = [];
  }
}
