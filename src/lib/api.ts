import { getApiBaseUrl } from "./constants";
import { getAuthToken, getAuthHeaders } from "./auth";
import type { Vault, ApiKey, RevealedKey, AuditEntry, User } from "../types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, text);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // User
  async getUser(): Promise<User> {
    return request<User>("/user");
  },

  // Vaults
  async getVaults(): Promise<Vault[]> {
    return request<Vault[]>("/vaults");
  },

  // Create vault
  async createVault(data: {
    name: string;
    description?: string;
  }): Promise<Vault> {
    return request<Vault>("/vaults", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Keys
  async getKeys(vaultId: string): Promise<ApiKey[]> {
    return request<ApiKey[]>(`/vaults/${vaultId}/keys`);
  },

  // Reveal key value (never cached)
  async revealKey(vaultId: string, keyId: string): Promise<RevealedKey> {
    return request<RevealedKey>(`/vaults/${vaultId}/keys/${keyId}/reveal`);
  },

  // Add key
  async addKey(
    vaultId: string,
    data: {
      name: string;
      service: string;
      value: string;
      description?: string;
    },
  ): Promise<ApiKey> {
    return request<ApiKey>(`/vaults/${vaultId}/keys`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Delete key
  async deleteKey(vaultId: string, keyId: string): Promise<void> {
    await request(`/vaults/${vaultId}/keys/${keyId}`, {
      method: "DELETE",
    });
  },

  // Audit log
  async getAuditLog(): Promise<AuditEntry[]> {
    return request<AuditEntry[]>("/audit");
  },
};
