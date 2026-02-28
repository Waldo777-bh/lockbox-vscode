import * as vscode from "vscode";
import { isAuthenticated } from "../lib/auth";
import { getShowStatusBar } from "../lib/constants";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

let statusBarItem: vscode.StatusBarItem | undefined;

export function createStatusBar(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.name = "Lockbox";
  return statusBarItem;
}

export async function updateStatusBar(
  vaultTreeProvider: VaultTreeProvider,
): Promise<void> {
  if (!statusBarItem) {
    return;
  }

  if (!getShowStatusBar()) {
    statusBarItem.hide();
    return;
  }

  const authed = await isAuthenticated();

  if (!authed) {
    statusBarItem.text = "$(unlock) Lockbox: Not connected";
    statusBarItem.tooltip = "Click to sign in to Lockbox";
    statusBarItem.command = "lockbox.signIn";
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
    return;
  }

  const vaults = vaultTreeProvider.getVaults();
  const totalKeys = vaults.reduce((sum, v) => sum + v.keys.length, 0);

  statusBarItem.text = `$(lock) Lockbox: ${vaults.length} vault${vaults.length !== 1 ? "s" : ""}, ${totalKeys} key${totalKeys !== 1 ? "s" : ""}`;
  statusBarItem.tooltip = new vscode.MarkdownString(
    `**Lockbox** — Connected\n\nVaults: ${vaults.length}\n\nKeys: ${totalKeys}\n\nLast synced: ${new Date().toLocaleTimeString()}`,
  );
  statusBarItem.command = "lockbox.copyKey";
  statusBarItem.show();
}

export function disposeStatusBar(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
