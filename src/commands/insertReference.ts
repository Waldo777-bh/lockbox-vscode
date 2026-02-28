import * as vscode from "vscode";
import { isAuthenticated } from "../lib/auth";
import { getServiceIcon } from "../types";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

export async function insertReference(
  vaultTreeProvider: VaultTreeProvider,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Lockbox: No active editor.");
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
    detail: `lockbox://${key.service.toLowerCase()}/${key.name}`,
    key,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a key to insert a reference...",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return;
  }

  const reference = `lockbox://${picked.key.service.toLowerCase()}/${picked.key.name}`;

  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, reference);
  });
}
