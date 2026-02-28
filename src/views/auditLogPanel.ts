import * as vscode from "vscode";
import { api } from "../lib/api";
import type { AuditEntry } from "../types";

export class AuditLogPanel {
  public static currentPanel: AuditLogPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static async show(extensionUri: vscode.Uri): Promise<void> {
    if (AuditLogPanel.currentPanel) {
      AuditLogPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      await AuditLogPanel.currentPanel._update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "lockboxAuditLog",
      "Lockbox: Audit Log",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    AuditLogPanel.currentPanel = new AuditLogPanel(panel, extensionUri);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
  ) {
    this._panel = panel;
    this._panel.iconPath = new vscode.ThemeIcon("history");

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "refresh") {
          await this._update();
        }
      },
      null,
      this._disposables,
    );

    this._update();
  }

  private async _update(): Promise<void> {
    try {
      const entries = await api.getAuditLog();
      this._panel.webview.html = this._getHtml(entries);
    } catch (err: any) {
      this._panel.webview.html = this._getErrorHtml(err.message);
    }
  }

  private _getHtml(entries: AuditEntry[]): string {
    const rows = entries
      .map((entry) => {
        const date = new Date(entry.createdAt);
        const timeAgo = getTimeAgo(date);
        const actionBadge = getActionBadge(entry.action);
        return `
          <tr>
            <td><span class="badge ${actionBadge.class}">${actionBadge.label}</span></td>
            <td>${escapeHtml(entry.keyName || "—")}</td>
            <td>${escapeHtml(entry.vaultName || "—")}</td>
            <td class="muted">${escapeHtml(entry.ipAddress || "—")}</td>
            <td class="muted" title="${date.toLocaleString()}">${timeAgo}</td>
          </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      margin: 0;
    }
    h1 {
      font-size: 1.4em;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .subtitle {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 20px;
      font-size: 0.9em;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85em;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
    }
    tr:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .muted {
      color: var(--vscode-descriptionForeground);
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.8em;
      font-weight: 500;
    }
    .badge-access {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }
    .badge-create {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }
    .badge-update {
      background: rgba(249, 115, 22, 0.15);
      color: #f97316;
    }
    .badge-delete {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .badge-default {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
    }
    .empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h1>Audit Log</h1>
  <p class="subtitle">Recent activity across your vaults</p>
  <div class="toolbar">
    <span class="muted">${entries.length} entries</span>
    <button onclick="refresh()">Refresh</button>
  </div>
  ${
    entries.length > 0
      ? `<table>
    <thead>
      <tr>
        <th>Action</th>
        <th>Key</th>
        <th>Vault</th>
        <th>IP</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
      : `<div class="empty">No audit entries found.</div>`
  }
  <script>
    const vscode = acquireVsCodeApi();
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
  </script>
</body>
</html>`;
  }

  private _getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 40px;
      text-align: center;
    }
    .error {
      color: var(--vscode-errorForeground);
      margin-bottom: 16px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      border-radius: 3px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <p class="error">Failed to load audit log: ${escapeHtml(message)}</p>
  <button onclick="refresh()">Retry</button>
  <script>
    const vscode = acquireVsCodeApi();
    function refresh() { vscode.postMessage({ command: 'refresh' }); }
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    AuditLogPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getActionBadge(action: string): { label: string; class: string } {
  const lower = action.toLowerCase();
  if (lower.includes("access") || lower.includes("reveal") || lower.includes("copy")) {
    return { label: "Access", class: "badge-access" };
  }
  if (lower.includes("create") || lower.includes("add")) {
    return { label: "Create", class: "badge-create" };
  }
  if (lower.includes("update") || lower.includes("edit")) {
    return { label: "Update", class: "badge-update" };
  }
  if (lower.includes("delete") || lower.includes("remove")) {
    return { label: "Delete", class: "badge-delete" };
  }
  return { label: action, class: "badge-default" };
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString();
}
