import * as vscode from "vscode";
import { isAuthenticated, getUser } from "../lib/auth";
import { getDashboardUrl } from "../lib/constants";

class ConnectionItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    icon: string,
    color?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(
      icon,
      color ? new vscode.ThemeColor(color) : undefined,
    );
  }
}

export class ConnectionTreeProvider
  implements vscode.TreeDataProvider<ConnectionItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ConnectionItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConnectionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ConnectionItem[]> {
    const authed = await isAuthenticated();

    if (!authed) {
      const signInItem = new ConnectionItem(
        "Not connected",
        "Click to sign in",
        "plug",
        "errorForeground",
      );
      signInItem.command = {
        command: "lockbox.signIn",
        title: "Sign In",
      };
      return [signInItem];
    }

    const items: ConnectionItem[] = [];

    // Connection status
    const statusItem = new ConnectionItem(
      "Connected",
      getDashboardUrl(),
      "pass-filled",
      "testing.iconPassed",
    );
    items.push(statusItem);

    // User info
    const user = await getUser();
    if (user) {
      const userItem = new ConnectionItem(
        user.email,
        user.name || "",
        "account",
      );
      items.push(userItem);
    }

    // Dashboard link
    const dashboardItem = new ConnectionItem(
      "Open Dashboard",
      "",
      "link-external",
    );
    dashboardItem.command = {
      command: "lockbox.openDashboard",
      title: "Open Dashboard",
    };
    items.push(dashboardItem);

    // Sign out
    const signOutItem = new ConnectionItem("Sign Out", "", "sign-out");
    signOutItem.command = {
      command: "lockbox.signOut",
      title: "Sign Out",
    };
    items.push(signOutItem);

    return items;
  }
}
