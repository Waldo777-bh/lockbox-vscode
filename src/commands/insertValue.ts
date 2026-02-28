import * as vscode from "vscode";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { addRecentKey } from "../lib/cache";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

export async function insertValue(
  vaultTreeProvider: VaultTreeProvider,
  recentRefresh: () => void,
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

  // Show warning
  const confirm = await vscode.window.showWarningMessage(
    "Inserting a plaintext key value into a file is a security risk. The value may be committed to version control. Consider using a lockbox:// reference instead.",
    "Insert Anyway",
    "Insert Reference Instead",
    "Cancel",
  );

  if (confirm === "Cancel" || !confirm) {
    return;
  }

  if (confirm === "Insert Reference Instead") {
    vscode.commands.executeCommand("lockbox.insertReference");
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
    placeHolder: "Select a key to insert its value...",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return;
  }

  try {
    const revealed = await api.revealKey(
      picked.key.vaultId,
      picked.key.id,
    );

    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, revealed.value);
    });

    await addRecentKey(
      picked.key.id,
      picked.key.name,
      picked.key.service,
      picked.key.vaultId,
      picked.key.vaultName,
    );
    recentRefresh();
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Lockbox: Failed to reveal key — ${err.message}`,
    );
  }
}
