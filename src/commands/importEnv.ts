import * as vscode from "vscode";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { invalidateCache } from "../lib/cache";
import { extractServiceFromEnvKey } from "../providers/envDetector";
import type { VaultTreeProvider } from "../providers/vaultTreeProvider";

export async function importEnv(
  vaultTreeProvider: VaultTreeProvider,
  refreshCallback: () => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Lockbox: No active editor with .env file.");
    return;
  }

  const document = editor.document;
  const envKeys = parseEnvFile(document);

  if (envKeys.length === 0) {
    vscode.window.showInformationMessage(
      "Lockbox: No API keys detected in this file.",
    );
    return;
  }

  // Select vault
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
    id: v.id,
  }));

  const picked = await vscode.window.showQuickPick(vaultItems, {
    placeHolder: "Select a vault to import keys into...",
  });

  if (!picked) {
    return;
  }

  // Confirm import
  const confirm = await vscode.window.showWarningMessage(
    `Import ${envKeys.length} key${envKeys.length !== 1 ? "s" : ""} into "${picked.label}"?`,
    "Import",
    "Cancel",
  );

  if (confirm !== "Import") {
    return;
  }

  let imported = 0;
  let failed = 0;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Lockbox: Importing keys...",
      cancellable: false,
    },
    async (progress) => {
      for (let i = 0; i < envKeys.length; i++) {
        const envKey = envKeys[i];
        progress.report({
          message: `${i + 1}/${envKeys.length}: ${envKey.name}`,
          increment: (1 / envKeys.length) * 100,
        });

        try {
          const service = extractServiceFromEnvKey(envKey.name);
          await api.addKey(picked.id, {
            name: envKey.name,
            service,
            value: envKey.value,
            description: `Imported from .env file`,
          });
          imported++;
        } catch {
          failed++;
        }
      }
    },
  );

  await invalidateCache();
  refreshCallback();

  if (failed > 0) {
    vscode.window.showWarningMessage(
      `Lockbox: Imported ${imported} key${imported !== 1 ? "s" : ""}, ${failed} failed.`,
    );
  } else {
    vscode.window.showInformationMessage(
      `Lockbox: Successfully imported ${imported} key${imported !== 1 ? "s" : ""}.`,
    );
  }
}

export async function storeEnvKey(
  keyName: string,
  value: string,
  vaultTreeProvider: VaultTreeProvider,
  refreshCallback: () => void,
): Promise<void> {
  const authed = await isAuthenticated();
  if (!authed) {
    vscode.window.showWarningMessage("Lockbox: Please sign in first.");
    vscode.commands.executeCommand("lockbox.signIn");
    return;
  }

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
    id: v.id,
  }));

  const picked = await vscode.window.showQuickPick(vaultItems, {
    placeHolder: `Store "${keyName}" in which vault?`,
  });

  if (!picked) {
    return;
  }

  const service = extractServiceFromEnvKey(keyName);

  try {
    await api.addKey(picked.id, {
      name: keyName,
      service,
      value,
      description: "Stored from .env file via VS Code extension",
    });

    await invalidateCache();
    refreshCallback();

    vscode.window.showInformationMessage(
      `Lockbox: "${keyName}" stored in "${picked.label}".`,
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Lockbox: Failed to store key — ${err.message}`,
    );
  }
}

interface EnvKeyParsed {
  name: string;
  value: string;
  line: number;
}

function parseEnvFile(document: vscode.TextDocument): EnvKeyParsed[] {
  const keys: EnvKeyParsed[] = [];
  const keyPatterns = [
    /^[A-Z_]*(?:API_?KEY|SECRET_?KEY|ACCESS_?KEY|AUTH_?TOKEN|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY)[A-Z_]*$/i,
    /^[A-Z_]*(?:OPENAI|STRIPE|AWS|GITHUB|ANTHROPIC|CLERK|SUPABASE|FIREBASE|TWILIO|SENDGRID|CLOUDFLARE|VERCEL|HEROKU|MONGODB|REDIS)[A-Z_]*$/i,
  ];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/i);
    if (!match) {
      continue;
    }

    const name = match[1];
    let value = match[2];

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!value || value === "your_key_here" || value === "xxx" || value === "CHANGE_ME") {
      continue;
    }

    const isApiKey = keyPatterns.some((p) => p.test(name));
    if (!isApiKey) {
      continue;
    }

    keys.push({ name, value, line: i });
  }

  return keys;
}
