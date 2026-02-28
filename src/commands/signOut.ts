import * as vscode from "vscode";
import { clearAuth } from "../lib/auth";
import { invalidateCache } from "../lib/cache";

export async function signOut(
  refreshCallback: () => void,
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    "Are you sure you want to sign out of Lockbox?",
    "Sign Out",
    "Cancel",
  );

  if (confirm !== "Sign Out") {
    return;
  }

  await clearAuth();
  await invalidateCache();
  refreshCallback();
  vscode.window.showInformationMessage("Lockbox: Signed out successfully.");
}
