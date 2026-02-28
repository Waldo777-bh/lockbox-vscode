import * as vscode from "vscode";
import { api } from "../lib/api";
import { copyToClipboard } from "../lib/clipboard";
import { addRecentKey } from "../lib/cache";
import { isAuthenticated } from "../lib/auth";
import { getServiceIcon } from "../types";
import type { VaultTreeProvider, KeyItem } from "../providers/vaultTreeProvider";
import type { RecentKeyItem } from "../providers/recentTreeProvider";

export async function copyKey(
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage(
      "Lockbox: Please sign in first.",
    );
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  const allKeys = vaultTreeProvider.getAllKeys();
  if (allKeys.length === 0) {
    vscode.window.showInformationMessage(
      "Lockbox: No keys found. Add keys via the dashboard.",
    );
    return;
  }

  const items = allKeys.map((key) => {
    const icon = getServiceIcon(key.service);
    return {
      label: `$(key) ${key.name}`,
      description: key.service,
      detail: `Vault: ${key.vaultName} \u00B7 ${key.maskedValue}`,
      key,
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Search for a key to copy...",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return;
  }

  await copyKeyValue(
    picked.key.vaultId,
    picked.key.id,
    picked.key.name,
    picked.key.service,
    picked.key.vaultName,
    recentRefresh,
  );
}

export async function copyKeyFromTree(
  item: KeyItem,
  recentRefresh: () => void,
): Promise<void> {
  await copyKeyValue(
    item.vaultId,
    item.key.id,
    item.key.name,
    item.key.service,
    item.vaultName,
    recentRefresh,
  );
}

export async function copyRecentKey(
  item: RecentKeyItem,
  recentRefresh: () => void,
): Promise<void> {
  await copyKeyValue(
    item.entry.vaultId,
    item.entry.keyId,
    item.entry.keyName,
    item.entry.service,
    item.entry.vaultName,
    recentRefresh,
  );
}

async function copyKeyValue(
  vaultId: string,
  keyId: string,
  keyName: string,
  service: string,
  vaultName: string,
  recentRefresh: () => void,
): Promise<void> {
  try {
    const revealed = await api.revealKey(vaultId, keyId);
    await copyToClipboard(revealed.value);
    await addRecentKey(keyId, keyName, service, vaultId, vaultName);
    recentRefresh();

    const timeout = vscode.workspace
      .getConfiguration("lockbox")
      .get<number>("clipboardClearTimeout", 30);

    vscode.window.showInformationMessage(
      `Lockbox: Copied "${keyName}" to clipboard.${timeout > 0 ? ` Clipboard will be cleared in ${timeout}s.` : ""}`,
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Lockbox: Failed to copy key — ${err.message}`,
    );
  }
}

export async function copyKeyByRef(
  service: string,
  keyName: string,
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
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

  await copyKeyValue(
    key.vaultId,
    key.id,
    key.name,
    key.service,
    key.vaultName,
    recentRefresh,
  );
}
