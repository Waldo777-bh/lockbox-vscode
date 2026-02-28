import * as vscode from "vscode";
import * as path from "path";
import { getVaultsWithKeys } from "../lib/cache";
import { isAuthenticated } from "../lib/auth";
import { getServiceIcon } from "../types";
import type { VaultWithKeys, ApiKey } from "../types";

export type VaultTreeItem = VaultItem | KeyItem;

export class VaultItem extends vscode.TreeItem {
  constructor(
    public readonly vault: VaultWithKeys,
    private readonly extensionUri: vscode.Uri,
  ) {
    super(vault.name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "vault";
    this.description = `${vault.keys.length} key${vault.keys.length !== 1 ? "s" : ""}`;
    this.tooltip = new vscode.MarkdownString(
      `**${vault.name}**\n\n${vault.description || "No description"}\n\nKeys: ${vault.keys.length}\n\nCreated: ${new Date(vault.createdAt).toLocaleDateString()}`,
    );
    this.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, "resources", "vault-icon.svg"),
      dark: vscode.Uri.joinPath(extensionUri, "resources", "vault-icon.svg"),
    };
  }
}

export class KeyItem extends vscode.TreeItem {
  constructor(
    public readonly key: ApiKey,
    public readonly vaultId: string,
    public readonly vaultName: string,
  ) {
    super(key.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "key";

    const serviceIcon = getServiceIcon(key.service);
    this.description = key.service;
    this.tooltip = new vscode.MarkdownString(
      `**${key.name}**\n\nService: ${serviceIcon.name}\n\nMasked: \`${key.maskedValue}\`\n\nVault: ${vaultName}${key.lastAccessedAt ? `\n\nLast accessed: ${new Date(key.lastAccessedAt).toLocaleDateString()}` : ""}${key.expiresAt ? `\n\nExpires: ${new Date(key.expiresAt).toLocaleDateString()}` : ""}`,
    );
    this.iconPath = new vscode.ThemeIcon("key", new vscode.ThemeColor("charts.green"));
  }
}

export class VaultTreeProvider
  implements vscode.TreeDataProvider<VaultTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    VaultTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private vaults: VaultWithKeys[] = [];
  private extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: VaultTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: VaultTreeItem): Promise<VaultTreeItem[]> {
    const authed = await isAuthenticated();
    if (!authed) {
      return [];
    }

    if (!element) {
      // Root: return vault items
      try {
        this.vaults = await getVaultsWithKeys();
        if (this.vaults.length === 0) {
          return [];
        }
        return this.vaults.map(
          (vault) => new VaultItem(vault, this.extensionUri),
        );
      } catch {
        return [];
      }
    }

    if (element instanceof VaultItem) {
      // Vault children: return key items
      return element.vault.keys.map(
        (key) => new KeyItem(key, element.vault.id, element.vault.name),
      );
    }

    return [];
  }

  getVaults(): VaultWithKeys[] {
    return this.vaults;
  }

  getAllKeys(): Array<ApiKey & { vaultId: string; vaultName: string }> {
    const keys: Array<ApiKey & { vaultId: string; vaultName: string }> = [];
    for (const vault of this.vaults) {
      for (const key of vault.keys) {
        keys.push({ ...key, vaultId: vault.id, vaultName: vault.name });
      }
    }
    return keys;
  }
}
