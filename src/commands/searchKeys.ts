import * as vscode from "vscode";
import { api } from "../lib/api";
import { copyToClipboard } from "../lib/clipboard";
import { addRecentKey } from "../lib/cache";
import { isAuthenticated } from "../lib/auth";
import { getServiceIcon } from "../types";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

export async function searchKeys(
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
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
      description: `${key.service} \u00B7 ${key.vaultName}`,
      detail: key.maskedValue,
      key,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon("copy"),
          tooltip: "Copy Value",
        },
      ],
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Search across all vaults and keys...",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return;
  }

  // Copy the selected key
  try {
    const revealed = await api.revealKey(
      picked.key.vaultId,
      picked.key.id,
    );
    await copyToClipboard(revealed.value);
    await addRecentKey(
      picked.key.id,
      picked.key.name,
      picked.key.service,
      picked.key.vaultId,
      picked.key.vaultName,
    );
    recentRefresh();

    vscode.window.showInformationMessage(
      `Lockbox: Copied "${picked.key.name}" to clipboard.`,
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Lockbox: Failed to copy key — ${err.message}`,
    );
  }
}
