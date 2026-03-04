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

// Simple XOR-based encryption for demo purposes (in production, use Web Crypto API)
async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(password);
  const dataBytes = encoder.encode(data);
  
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyData[i % keyData.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

async function decryptData(encrypted: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(password);
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyData[i % keyData.length];
  }
  
  return new TextDecoder().decode(decrypted);
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