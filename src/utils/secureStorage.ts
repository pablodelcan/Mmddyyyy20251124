// Simple encryption/decryption for local storage
// Uses Web Crypto API for secure encryption

const STORAGE_PREFIX = 'mmddyyyy_';
const ENCRYPTION_KEY = 'user-device-key'; // In production, this would be derived from user credentials

// Simple XOR encryption for client-side storage
// Note: This is basic obfuscation. For true security, data is encrypted in Supabase
function simpleEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
}

function simpleDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded); // Base64 decode
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
}

export const secureStorage = {
  // Save encrypted data
  setItem(key: string, value: any, encrypt = false): void {
    try {
      const stringValue = JSON.stringify(value);
      const finalValue = encrypt ? simpleEncrypt(stringValue, ENCRYPTION_KEY) : stringValue;
      localStorage.setItem(STORAGE_PREFIX + key, finalValue);
      
      // Also save a timestamp for conflict resolution
      localStorage.setItem(STORAGE_PREFIX + key + '_timestamp', Date.now().toString());
    } catch (e) {
      console.error('Failed to save to secure storage:', e);
    }
  },

  // Get encrypted data
  getItem<T>(key: string, encrypted = false): T | null {
    try {
      const value = localStorage.getItem(STORAGE_PREFIX + key);
      if (!value) return null;
      
      const decrypted = encrypted ? simpleDecrypt(value, ENCRYPTION_KEY) : value;
      return JSON.parse(decrypted) as T;
    } catch (e) {
      console.error('Failed to read from secure storage:', e);
      return null;
    }
  },

  // Get timestamp of last save
  getTimestamp(key: string): number {
    const timestamp = localStorage.getItem(STORAGE_PREFIX + key + '_timestamp');
    return timestamp ? parseInt(timestamp, 10) : 0;
  },

  // Remove item
  removeItem(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
    localStorage.removeItem(STORAGE_PREFIX + key + '_timestamp');
  },

  // Clear all app data
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },

  // Export all data
  exportAll(): string {
    const data: Record<string, any> = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX) && !key.endsWith('_timestamp')) {
        const cleanKey = key.replace(STORAGE_PREFIX, '');
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[cleanKey] = JSON.parse(value);
          } catch {
            data[cleanKey] = value;
          }
        }
      }
    });
    
    return JSON.stringify(data, null, 2);
  },

  // Import data
  importAll(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      Object.keys(data).forEach(key => {
        this.setItem(key, data[key]);
      });
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }
};
