export interface ClawChivesExport {
  version: string;
  exportedAt: string;
  branding: {
    name: string;
    version: string;
    url: string;
    tagline: string;
  };
  metadata: {
    totalBookmarks: number;
    totalFolders: number;
    totalSettings: number;
    encrypted: boolean;
    checksum: string;
  };
  data: {
    bookmarks: any[];
    folders: any[];
    settings: any[];
  };
  encryptedData?: string;
}

/**
 * AES-256-GCM encryption using Web Crypto API
 * Password is derived via PBKDF2 with random salt
 * Each encryption generates a new IV (nonce) for security
 */
async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();

  // Generate random salt (16 bytes) and IV (12 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive encryption key from password via PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const keyMaterial = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 256 bits for AES-256
  );

  const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt']);

  // Encrypt the data
  const dataBytes = encoder.encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBytes
  );

  // Combine salt + IV + ciphertext and encode as base64
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * AES-256-GCM decryption using Web Crypto API
 * Extracts salt and IV from the combined blob and derives the same key
 */
async function decryptData(encrypted: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode base64 and extract salt, IV, ciphertext
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  // Derive the same key from password using the same salt
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const keyMaterial = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['decrypt']);

  // Decrypt the ciphertext
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

export async function exportToClawChivesJSON(
  bookmarks: any[],
  folders: any[],
  settings: any[],
  password?: string
): Promise<Blob> {
  const exportData: ClawChivesExport = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    branding: {
      name: "ClawChives",
      version: "1.0.0",
      url: "https://clawchives.com",
      tagline: "Your Sovereign Bookmark Library",
    },
    metadata: {
      totalBookmarks: bookmarks.length,
      totalFolders: folders.length,
      totalSettings: settings.length,
      encrypted: !!password,
      checksum: btoa(JSON.stringify({ bookmarks, folders, settings }).slice(0, 100)),
    },
    data: {
      bookmarks,
      folders,
      settings,
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  
  if (password) {
    const encrypted = await encryptData(jsonString, password);
    const protectedExport = {
      ...exportData,
      metadata: {
        ...exportData.metadata,
        encrypted: true,
      },
      data: null as any,
      encryptedData: encrypted,
    };
    return new Blob([JSON.stringify(protectedExport, null, 2)], {
      type: "application/json",
    });
  }

  return new Blob([jsonString], { type: "application/json" });
}

export async function importFromClawChivesJSON(
  file: File,
  password?: string
): Promise<ClawChivesExport> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (parsed.metadata?.encrypted && parsed.encryptedData) {
    if (!password) {
      throw new Error("This export is password protected. Please provide a password.");
    }
    try {
      const decrypted = await decryptData(parsed.encryptedData, password);
      const decryptedData = JSON.parse(decrypted);
      return {
        ...parsed,
        data: decryptedData.data,
        encryptedData: undefined,
      };
    } catch (e) {
      throw new Error("Invalid password or corrupted file.");
    }
  }

  return parsed;
}

// Simplified export without double-zip (since JSZip is not available)
export async function exportToBackup(
  bookmarks: any[],
  folders: any[],
  settings: any[],
  password?: string
): Promise<Blob> {
  const exportData: ClawChivesExport = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    branding: {
      name: "ClawChives",
      version: "1.0.0",
      url: "https://clawchives.com",
      tagline: "Your Sovereign Bookmark Library",
    },
    metadata: {
      totalBookmarks: bookmarks.length,
      totalFolders: folders.length,
      totalSettings: settings.length,
      encrypted: !!password,
      checksum: btoa(JSON.stringify({ bookmarks, folders, settings }).slice(0, 100)),
    },
    data: {
      bookmarks,
      folders,
      settings,
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  
  if (password) {
    const encrypted = await encryptData(jsonString, password);
    const protectedExport = {
      ...exportData,
      metadata: {
        ...exportData.metadata,
        encrypted: true,
      },
      data: null as any,
      encryptedData: encrypted,
    };
    return new Blob([JSON.stringify(protectedExport, null, 2)], {
      type: "application/json",
    });
  }

  return new Blob([jsonString], { type: "application/json" });
}

export async function importFromBackup(file: File, password?: string): Promise<ClawChivesExport> {
  return await importFromClawChivesJSON(file, password);
}