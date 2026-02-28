import * as vscode from "vscode";
import { api, ApiError } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { invalidateCache } from "../lib/cache";
import { getDashboardUrl } from "../lib/constants";

export async function createVault(
  refreshCallback: () => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: "Vault name",
    placeHolder: "Production",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Vault name is required";
      }
      return undefined;
    },
  });

  if (!name) {
    return;
  }

  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
    placeHolder: "Production API keys",
  });

  try {
    await api.createVault({
      name: name.trim(),
      description: description?.trim() || undefined,
    });

    await invalidateCache();
    refreshCallback();

    vscode.window.showInformationMessage(
      `Lockbox: Vault "${name}" created successfully.`,
    );
  } catch (err: any) {
    if (err instanceof ApiError && err.code === "TIER_LIMIT") {
      const action = await vscode.window.showWarningMessage(
        `Lockbox: ${err.message}`,
        "Upgrade to Pro",
        "Dismiss",
      );
      if (action === "Upgrade to Pro") {
        vscode.env.openExternal(
          vscode.Uri.parse(`${getDashboardUrl()}/dashboard/pricing`),
        );
      }
      return;
    }
    vscode.window.showErrorMessage(
      `Lockbox: Failed to create vault — ${err.message}`,
    );
  }
}
