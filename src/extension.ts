import * as vscode from "vscode";
import { initAuth, saveAuth, isAuthenticated } from "./lib/auth";
import { initCache, getVaultsWithKeys, invalidateCache } from "./lib/cache";
import { disposeClearTimer } from "./lib/clipboard";
import { getAutoRefreshInterval } from "./lib/constants";
import { api } from "./lib/api";

import { VaultTreeProvider, KeyItem } from "./providers/vaultTreeProvider";
import { RecentTreeProvider } from "./providers/recentTreeProvider";
import { ConnectionTreeProvider } from "./providers/connectionTreeProvider";
import { LockboxCodeLensProvider } from "./providers/codeLensProvider";
import { LockboxCompletionProvider } from "./providers/completionProvider";
import { LockboxHoverProvider } from "./providers/hoverProvider";
import { EnvCodeLensProvider } from "./providers/envDetector";

import { signIn } from "./commands/signIn";
import { signOut } from "./commands/signOut";
import {
  copyKey,
  copyKeyFromTree,
  copyRecentKey,
  copyKeyByRef,
} from "./commands/copyKey";
import { addKey } from "./commands/addKey";
import { createVault } from "./commands/createVault";
import { searchKeys } from "./commands/searchKeys";
import { insertReference } from "./commands/insertReference";
import { insertValue } from "./commands/insertValue";
import {
  revealKey,
  revealKeyFromTree,
  revealKeyByRef,
} from "./commands/revealKey";
import { importEnv, storeEnvKey } from "./commands/importEnv";

import { AuditLogPanel } from "./views/auditLogPanel";
import { KeyDetailPanel } from "./views/keyDetailPanel";
import {
  createStatusBar,
  updateStatusBar,
  disposeStatusBar,
} from "./statusBar/statusBar";
import { RecentKeyItem } from "./providers/recentTreeProvider";

let refreshInterval: ReturnType<typeof setInterval> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Initialize auth and cache with extension context
  initAuth(context);
  initCache(context);

  // --- Tree View Providers ---
  const vaultTreeProvider = new VaultTreeProvider(context.extensionUri);
  const recentTreeProvider = new RecentTreeProvider();
  const connectionTreeProvider = new ConnectionTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("lockboxVaults", vaultTreeProvider),
    vscode.window.registerTreeDataProvider("lockboxRecent", recentTreeProvider),
    vscode.window.registerTreeDataProvider(
      "lockboxStatus",
      connectionTreeProvider,
    ),
  );

  // --- Refresh helper ---
  function refreshAll(): void {
    vaultTreeProvider.refresh();
    recentTreeProvider.refresh();
    connectionTreeProvider.refresh();
    updateStatusBar(vaultTreeProvider);
  }

  function refreshRecent(): void {
    recentTreeProvider.refresh();
  }

  // --- Key Detail Panel helper ---
  function showKeyDetailPanel(
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ): void {
    KeyDetailPanel.show(
      context.extensionUri,
      keyName,
      service,
      value,
      maskedValue,
      vaultName,
      createdAt,
      lastAccessedAt,
      expiresAt,
    );
  }

  // --- Code Intelligence Providers ---
  const codeLensProvider = new LockboxCodeLensProvider();
  const envCodeLensProvider = new EnvCodeLensProvider();
  const completionProvider = new LockboxCompletionProvider(vaultTreeProvider);
  const hoverProvider = new LockboxHoverProvider(vaultTreeProvider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      codeLensProvider,
    ),
    vscode.languages.registerCodeLensProvider(
      { scheme: "file", pattern: "**/.env*" },
      envCodeLensProvider,
    ),
    vscode.languages.registerCompletionItemProvider(
      { scheme: "file" },
      completionProvider,
      "/",
    ),
    vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider),
  );

  // --- Status Bar ---
  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  // --- Register Commands ---
  context.subscriptions.push(
    vscode.commands.registerCommand("lockbox.signIn", () => signIn()),

    vscode.commands.registerCommand("lockbox.signOut", () =>
      signOut(refreshAll),
    ),

    vscode.commands.registerCommand("lockbox.copyKey", () =>
      copyKey(vaultTreeProvider, refreshRecent),
    ),

    vscode.commands.registerCommand("lockbox.addKey", () =>
      addKey(vaultTreeProvider, refreshAll),
    ),

    vscode.commands.registerCommand("lockbox.createVault", () =>
      createVault(refreshAll),
    ),

    vscode.commands.registerCommand("lockbox.searchKeys", () =>
      searchKeys(vaultTreeProvider, refreshRecent),
    ),

    vscode.commands.registerCommand("lockbox.insertReference", () =>
      insertReference(vaultTreeProvider),
    ),

    vscode.commands.registerCommand("lockbox.insertValue", () =>
      insertValue(vaultTreeProvider, refreshRecent),
    ),

    vscode.commands.registerCommand("lockbox.revealKey", () =>
      revealKey(vaultTreeProvider, refreshRecent, showKeyDetailPanel),
    ),

    vscode.commands.registerCommand("lockbox.importEnv", () =>
      importEnv(vaultTreeProvider, refreshAll),
    ),

    vscode.commands.registerCommand(
      "lockbox.storeEnvKey",
      (keyName: string, value: string) =>
        storeEnvKey(keyName, value, vaultTreeProvider, refreshAll),
    ),

    vscode.commands.registerCommand("lockbox.refreshVaults", async () => {
      await invalidateCache();
      refreshAll();
      vscode.window.showInformationMessage("Lockbox: Vaults refreshed.");
    }),

    vscode.commands.registerCommand("lockbox.openDashboard", () => {
      const url = vscode.workspace
        .getConfiguration("lockbox")
        .get<string>("dashboardUrl", "https://dashboard.yourlockbox.dev");
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand("lockbox.showAuditLog", () =>
      AuditLogPanel.show(context.extensionUri),
    ),

    // Tree view context commands
    vscode.commands.registerCommand(
      "lockbox.copyKeyFromTree",
      (item: KeyItem) => copyKeyFromTree(item, refreshRecent),
    ),

    vscode.commands.registerCommand(
      "lockbox.revealKeyFromTree",
      (item: KeyItem) =>
        revealKeyFromTree(item, refreshRecent, showKeyDetailPanel),
    ),

    vscode.commands.registerCommand(
      "lockbox.deleteKeyFromTree",
      async (item: KeyItem) => {
        const confirm = await vscode.window.showWarningMessage(
          `Delete key "${item.key.name}"? This cannot be undone.`,
          "Delete",
          "Cancel",
        );
        if (confirm !== "Delete") {
          return;
        }
        try {
          await api.deleteKey(item.vaultId, item.key.id);
          await invalidateCache();
          refreshAll();
          vscode.window.showInformationMessage(
            `Lockbox: Key "${item.key.name}" deleted.`,
          );
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Lockbox: Failed to delete key — ${err.message}`,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      "lockbox.addKeyToVault",
      (item: any) => {
        if (item && item.vault) {
          addKey(vaultTreeProvider, refreshAll, item.vault.id);
        }
      },
    ),

    vscode.commands.registerCommand(
      "lockbox.copyRecentKey",
      (item: RecentKeyItem) => copyRecentKey(item, refreshRecent),
    ),

    // CodeLens commands (by ref)
    vscode.commands.registerCommand(
      "lockbox.copyKeyByRef",
      (service: string, keyName: string) =>
        copyKeyByRef(service, keyName, vaultTreeProvider, refreshRecent),
    ),

    vscode.commands.registerCommand(
      "lockbox.revealKeyByRef",
      (service: string, keyName: string) =>
        revealKeyByRef(
          service,
          keyName,
          vaultTreeProvider,
          refreshRecent,
          showKeyDetailPanel,
        ),
    ),
  );

  // --- URI Handler (auth callback) ---
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri: vscode.Uri) {
        if (uri.path === "/auth-callback") {
          const params = new URLSearchParams(uri.query);
          const token = params.get("token");

          if (!token) {
            vscode.window.showErrorMessage(
              "Lockbox: Authentication failed — no token received.",
            );
            return;
          }

          try {
            // Save token and fetch user data
            // Temporarily save token to make API call
            const { saveAuth } = await import("./lib/auth");
            // We need to save the token first so the API call works
            await saveAuth(token, {
              id: "",
              email: "",
              name: null,
              imageUrl: null,
            });

            // Now fetch real user data
            const user = await api.getUser();
            await saveAuth(token, user);

            refreshAll();
            vscode.window.showInformationMessage(
              `Lockbox: Signed in as ${user.email}`,
            );
          } catch (err: any) {
            vscode.window.showErrorMessage(
              `Lockbox: Authentication failed — ${err.message}`,
            );
          }
        }
      },
    }),
  );

  // --- Auto-refresh interval ---
  function setupAutoRefresh(): void {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    const intervalSeconds = getAutoRefreshInterval();
    if (intervalSeconds > 0) {
      refreshInterval = setInterval(
        async () => {
          const authed = await isAuthenticated();
          if (authed) {
            await invalidateCache();
            refreshAll();
          }
        },
        intervalSeconds * 1000,
      );
    }
  }

  setupAutoRefresh();

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("lockbox.autoRefreshInterval")) {
        setupAutoRefresh();
      }
      if (e.affectsConfiguration("lockbox.showStatusBar")) {
        updateStatusBar(vaultTreeProvider);
      }
      if (e.affectsConfiguration("lockbox.showCodeLens")) {
        codeLensProvider.refresh();
      }
      if (e.affectsConfiguration("lockbox.showEnvSuggestions")) {
        envCodeLensProvider.refresh();
      }
    }),
  );

  // --- Initial Load ---
  refreshAll();
}

export function deactivate(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  disposeClearTimer();
  disposeStatusBar();
}
