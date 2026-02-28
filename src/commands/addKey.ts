import * as vscode from "vscode";
import { api, ApiError } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { invalidateCache } from "../lib/cache";
import { getDashboardUrl } from "../lib/constants";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

export async function addKey(
  vaultTreeProvider: VaultTreeProvider,
  refreshCallback: () => void,
  preselectedVaultId?: string,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  // Select vault
  let vaultId = preselectedVaultId;
  if (!vaultId) {
    const vaults = vaultTreeProvider.getVaults();
    if (vaults.length === 0) {
      const create = await vscode.window.showWarningMessage(
        "No vaults found. Create one first?",
        "Create Vault",
        "Cancel",
      );
      if (create === "Create Vault") {
        vscode.commands.executeCommand("lockbox.createVault");
      }
      return;
    }

    const vaultItems = vaults.map((v) => ({
      label: v.name,
      description: `${v.keys.length} keys`,
      detail: v.description || undefined,
      id: v.id,
    }));

    const picked = await vscode.window.showQuickPick(vaultItems, {
      placeHolder: "Select a vault to add the key to...",
    });

    if (!picked) {
      return;
    }
    vaultId = picked.id;
  }

  // Service name
  const service = await vscode.window.showInputBox({
    prompt: "Service name (e.g., openai, stripe, aws)",
    placeHolder: "openai",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Service name is required";
      }
      return undefined;
    },
  });

  if (!service) {
    return;
  }

  // Key name
  const name = await vscode.window.showInputBox({
    prompt: "Key name (e.g., API_KEY, SECRET_KEY)",
    placeHolder: "API_KEY",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Key name is required";
      }
      return undefined;
    },
  });

  if (!name) {
    return;
  }

  // Key value
  const value = await vscode.window.showInputBox({
    prompt: "Key value (this will be encrypted)",
    password: true,
    validateInput: (val) => {
      if (!val.trim()) {
        return "Key value is required";
      }
      return undefined;
    },
  });

  if (!value) {
    return;
  }

  // Optional description
  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
    placeHolder: "Optional description for this key",
  });

  try {
    await api.addKey(vaultId, {
      name: name.trim(),
      service: service.trim().toLowerCase(),
      value: value.trim(),
      description: description?.trim() || undefined,
    });

    await invalidateCache();
    refreshCallback();

    vscode.window.showInformationMessage(
      `Lockbox: Key "${name}" added successfully.`,
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
      `Lockbox: Failed to add key — ${err.message}`,
    );
  }
}
