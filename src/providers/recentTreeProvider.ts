import * as vscode from "vscode";
import { getRecentKeys, RecentKeyEntry } from "../lib/cache";
import { isAuthenticated } from "../lib/auth";
import { getServiceIcon } from "../types";

export class RecentKeyItem extends vscode.TreeItem {
  constructor(public readonly entry: RecentKeyEntry) {
    super(entry.keyName, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "recentKey";

    const serviceIcon = getServiceIcon(entry.service);
    this.description = `${entry.service} \u00B7 ${entry.vaultName}`;
    this.tooltip = new vscode.MarkdownString(
      `**${entry.keyName}**\n\nService: ${serviceIcon.name}\n\nVault: ${entry.vaultName}\n\nAccessed: ${new Date(entry.timestamp).toLocaleString()}`,
    );
    this.iconPath = new vscode.ThemeIcon(
      "history",
      new vscode.ThemeColor("charts.green"),
    );
  }
}

export class RecentTreeProvider
  implements vscode.TreeDataProvider<RecentKeyItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    RecentKeyItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RecentKeyItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<RecentKeyItem[]> {
    const authed = await isAuthenticated();
    if (!authed) {
      return [];
    }

    const recent = getRecentKeys();
    if (recent.length === 0) {
      return [];
    }

    return recent.map((entry) => new RecentKeyItem(entry));
  }
}
