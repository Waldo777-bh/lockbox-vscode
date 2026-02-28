import * as vscode from "vscode";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { addRecentKey } from "../lib/cache";
import { getServiceIcon } from "../types";
import type { VaultTreeProvider, KeyItem } from "../providers/vaultTreeProvider";

export async function revealKey(
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
  showKeyDetailPanel?: (
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ) => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  const allKeys = vaultTreeProvider.getAllKeys();
  if (allKeys.length === 0) {
    vscode.window.showInformationMessage("Lockbox: No keys found.");
    return;
  }

  const items = allKeys.map((key) => ({
    label: `$(key) ${key.name}`,
    description: `${key.service} \u00B7 ${key.vaultName}`,
    detail: key.maskedValue,
    key,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a key to reveal...",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return;
  }

  await revealKeyValue(
    picked.key.vaultId,
    picked.key.id,
    picked.key.name,
    picked.key.service,
    picked.key.maskedValue,
    picked.key.vaultName,
    picked.key.createdAt,
    picked.key.lastAccessedAt,
    picked.key.expiresAt,
    recentRefresh,
    showKeyDetailPanel,
  );
}

export async function revealKeyFromTree(
  item: KeyItem,
  recentRefresh: () => void,
  showKeyDetailPanel?: (
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ) => void,
): Promise<void> {
  await revealKeyValue(
    item.vaultId,
    item.key.id,
    item.key.name,
    item.key.service,
    item.key.maskedValue,
    item.vaultName,
    item.key.createdAt,
    item.key.lastAccessedAt,
    item.key.expiresAt,
    recentRefresh,
    showKeyDetailPanel,
  );
}

async function revealKeyValue(
  vaultId: string,
  keyId: string,
  keyName: string,
  service: string,
  maskedValue: string,
  vaultName: string,
  createdAt: string,
  lastAccessedAt: string | null,
  expiresAt: string | null,
  recentRefresh: () => void,
  showKeyDetailPanel?: (
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ) => void,
): Promise<void> {
  try {
    const revealed = await api.revealKey(vaultId, keyId);
    await addRecentKey(keyId, keyName, service, vaultId, vaultName);
    recentRefresh();

    if (showKeyDetailPanel) {
      showKeyDetailPanel(
        keyName,
        service,
        revealed.value,
        maskedValue,
        vaultName,
        createdAt,
        lastAccessedAt,
        expiresAt,
      );
    } else {
      vscode.window.showInformationMessage(
        `Lockbox: ${keyName} = ${maskedValue}`,
      );
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Lockbox: Failed to reveal key — ${err.message}`,
    );
  }
}

export async function revealKeyByRef(
  service: string,
  keyName: string,
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
  showKeyDetailPanel?: (
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ) => void,
): Promise<void> {
  const allKeys = vaultTreeProvider.getAllKeys();
  const key = allKeys.find(
    (k) =>
      k.service.toLowerCase() === service.toLowerCase() && k.name === keyName,
  );

  if (!key) {
    vscode.window.showErrorMessage(
      `Lockbox: Key "${keyName}" for service "${service}" not found.`,
    );
    return;
  }

  await revealKeyValue(
    key.vaultId,
    key.id,
    key.name,
    key.service,
    key.maskedValue,
    key.vaultName,
    key.createdAt,
    key.lastAccessedAt,
    key.expiresAt,
    recentRefresh,
    showKeyDetailPanel,
  );
}
