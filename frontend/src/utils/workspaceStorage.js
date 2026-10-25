// 100% Client-Side Native IndexedDB Workspace Storage
// Persists parsed datasets and workspace metadata locally on user's device (zero server transmission)

const DB_NAME = 'ExcelManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';
const KEY_CURRENT = 'active_workspace';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB: ${event.target.error?.message || 'Unknown error'}`));
    };
  });
}

export async function saveWorkspace(workspaceData) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const payload = {
        masterData: workspaceData.masterData || [],
        fileMeta: workspaceData.fileMeta || null,
        stagedData: workspaceData.stagedData || [],
        savedAt: new Date().toISOString(),
        recordCount: (workspaceData.masterData || []).length,
        fileName: workspaceData.fileMeta?.fileName || 'Spreadsheet Workspace'
      };

      const putRequest = store.put(payload, KEY_CURRENT);

      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = (e) => reject(new Error(`Failed to save workspace: ${e.target.error?.message}`));
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error?.message}`));
    });
    return true;
  } catch (err) {
    console.warn('Workspace auto-save error (IndexedDB):', err);
    return false;
  }
}

export async function loadWorkspace() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY_CURRENT);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = (e) => reject(new Error(`Failed to load workspace: ${e.target.error?.message}`));
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error?.message}`));
    });
  } catch (err) {
    console.warn('Workspace restore error (IndexedDB):', err);
    return null;
  }
}

export async function clearWorkspace() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deleteRequest = store.delete(KEY_CURRENT);

      deleteRequest.onsuccess = () => resolve(true);
      deleteRequest.onerror = (e) => reject(new Error(`Failed to clear workspace: ${e.target.error?.message}`));
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error?.message}`));
    });
  } catch (err) {
    console.warn('Workspace clear error (IndexedDB):', err);
    return false;
  }
}
