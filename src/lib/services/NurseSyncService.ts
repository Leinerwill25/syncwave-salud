/**
 * NurseSyncService.ts
 * ═══════════════════════════════════════════════════════════
 * ASHIRA — Servicio de Sincronización Offline Segura
 * ═══════════════════════════════════════════════════════════
 * Este servicio maneja el almacenamiento local cifrado de datos
 * clínicos cuando no hay conexión a internet.
 */

export interface SyncItem {
  id: string;
  userId: string;
  type: 'vital_signs' | 'mar' | 'procedure' | 'note';
  payload: any;
  createdAt: number;
}

const DB_NAME = 'ashira_nurse_sync';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 1;

class NurseSyncService {
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;

  /**
   * Inicializa la base de datos IndexedDB
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
  }

  /**
   * Genera/Obtiene una clave de cifrado derivada del userId
   * @param userId ID del usuario para derivar la clave
   */
  private async initEncryption(userId: string): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;

    const encoder = new TextEncoder();
    const salt = encoder.encode('ashira-medical-salt-2025'); // Salt estático de plataforma
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.encryptionKey;
  }

  /**
   * Cifra un objeto JSON
   */
  private async encrypt(data: any, userId: string): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
    const key = await this.initEncryption(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encodedData
    );

    return { iv, ciphertext };
  }

  /**
   * Descifra un objeto cifrado
   */
  private async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array, userId: string): Promise<any> {
    const key = await this.initEncryption(userId);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  /**
   * Agrega un item a la cola de sincronización (CIFRADO)
   */
  async addToQueue(item: Omit<SyncItem, 'id' | 'createdAt'>): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const { iv, ciphertext } = await this.encrypt(item.payload, item.userId);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.add({
        id,
        userId: item.userId,
        type: item.type,
        createdAt,
        iv,
        ciphertext,
      });

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los items pendientes para el usuario actual (DESCIFRADOS)
   */
  async getPendingItems(userId: string): Promise<SyncItem[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const encryptedItems = request.result;
        const decryptedItems: SyncItem[] = [];

        for (const item of encryptedItems) {
          // Solo procesar items de este usuario
          if (item.userId !== userId) continue;

          try {
            const payload = await this.decrypt(item.ciphertext, item.iv, userId);
            decryptedItems.push({
              id: item.id,
              userId: item.userId,
              type: item.type,
              payload,
              createdAt: item.createdAt,
            });
          } catch (err) {
            console.error('Error descifrando item offline:', err);
            // Si no podemos descifrar, podríamos estar ante un cambio de clave o corrupción.
          }
        }
        resolve(decryptedItems);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina un item de la cola tras una sincronización exitosa
   */
  async removeFromQueue(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cuenta los items pendientes para un usuario
   */
  async getPendingCount(userId: string): Promise<number> {
    const items = await this.getPendingItems(userId);
    return items.length;
  }
}

export const nurseSyncService = new NurseSyncService();
