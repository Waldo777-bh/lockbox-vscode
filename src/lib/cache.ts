import * as vscode from "vscode";
import {
  CACHE_DATA_KEY,
  RECENT_KEYS_KEY,
  CACHE_TTL_MS,
  RECENT_KEYS_COUNT,
} from "./constants";
import { api } from "./api";
import type { CacheData, ApiKey, VaultWithKeys } from "../types";

let _globalState: vscode.Memento | undefined;

export function initCache(context: vscode.ExtensionContext): void {
  _globalState = context.globalState;
}

function getGlobalState(): vscode.Memento {
  if (!_globalState) {
    throw new Error("Cache not initialized. Call initCache first.");
  }
  return _globalState;
}

function getCacheData(): CacheData | undefined {
  return getGlobalState().get<CacheData>(CACHE_DATA_KEY);
}

async function setCacheData(data: CacheData): Promise<void> {
  await getGlobalState().update(CACHE_DATA_KEY, data);
}

function isCacheValid(cache: CacheData | undefined): boolean {
  if (!cache) {
    return false;
  }
  return Date.now() - cache.lastFetched < CACHE_TTL_MS;
}

export async function getVaultsWithKeys(
  forceRefresh = false,
): Promise<VaultWithKeys[]> {
  const cache = getCacheData();

  if (!forceRefresh && isCacheValid(cache) && cache) {
    return cache.vaults.map((vault) => ({
      ...vault,
      keys: cache.keys[vault.id] ?? [],
    }));
  }

  // Fetch fresh data
  const vaults = await api.getVaults();
  const keys: Record<string, ApiKey[]> = {};

  // Fetch keys for all vaults in parallel
  const keyResults = await Promise.allSettled(
    vaults.map((vault) => api.getKeys(vault.id)),
  );

  vaults.forEach((vault, index) => {
    const result = keyResults[index];
    keys[vault.id] = result.status === "fulfilled" ? result.value : [];
  });

  // Update cache
  await setCacheData({
    vaults,
    keys,
    lastFetched: Date.now(),
  });

  return vaults.map((vault) => ({
    ...vault,
    keys: keys[vault.id] ?? [],
  }));
}

export async function addRecentKey(
  keyId: string,
  keyName: string,
  service: string,
  vaultId: string,
  vaultName: string,
): Promise<void> {
  const recent = getGlobalState().get<RecentKeyEntry[]>(RECENT_KEYS_KEY, []);

  // Remove existing entry for this key
  const filtered = recent.filter((r) => r.keyId !== keyId);

  // Add to front
  filtered.unshift({
    keyId,
    keyName,
    service,
    vaultId,
    vaultName,
    timestamp: Date.now(),
  });

  // Keep only recent N
  const trimmed = filtered.slice(0, RECENT_KEYS_COUNT);

  await getGlobalState().update(RECENT_KEYS_KEY, trimmed);
}

export function getRecentKeys(): RecentKeyEntry[] {
  return getGlobalState().get<RecentKeyEntry[]>(RECENT_KEYS_KEY, []);
}

export async function invalidateCache(): Promise<void> {
  await getGlobalState().update(CACHE_DATA_KEY, undefined);
}

export interface RecentKeyEntry {
  keyId: string;
  keyName: string;
  service: string;
  vaultId: string;
  vaultName: string;
  timestamp: number;
}
