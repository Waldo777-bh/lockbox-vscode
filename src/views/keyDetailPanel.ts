import * as vscode from "vscode";
import { getServiceIcon } from "../types";

export class KeyDetailPanel {
  public static currentPanel: KeyDetailPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static show(
    extensionUri: vscode.Uri,
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ): void {
    if (KeyDetailPanel.currentPanel) {
      KeyDetailPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      KeyDetailPanel.currentPanel._updateContent(
        keyName,
        service,
        value,
        maskedValue,
        vaultName,
        createdAt,
        lastAccessedAt,
        expiresAt,
      );
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "lockboxKeyDetail",
      `Lockbox: ${keyName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [extensionUri],
      },
    );

    KeyDetailPanel.currentPanel = new KeyDetailPanel(panel, extensionUri);
    KeyDetailPanel.currentPanel._updateContent(
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

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
  ) {
    this._panel = panel;
    this._panel.iconPath = new vscode.ThemeIcon("key");

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "copy") {
          await vscode.env.clipboard.writeText(message.value);
          vscode.window.showInformationMessage("Lockbox: Copied to clipboard.");
        }
      },
      null,
      this._disposables,
    );
  }

  private _updateContent(
    keyName: string,
    service: string,
    value: string,
    maskedValue: string,
    vaultName: string,
    createdAt: string,
    lastAccessedAt: string | null,
    expiresAt: string | null,
  ): void {
    this._panel.title = `Lockbox: ${keyName}`;
    const serviceIcon = getServiceIcon(service);
    const lockboxUri = `lockbox://${service.toLowerCase()}/${keyName}`;

    this._panel.webview.html = `<!DOCTYPE html>
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
      padding: 24px;
      margin: 0;
      max-width: 600px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .service-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: ${serviceIcon.color}22;
      color: ${serviceIcon.color};
      font-weight: 700;
      font-size: 18px;
    }
    .header-text h1 {
      font-size: 1.3em;
      margin: 0;
      font-weight: 600;
    }
    .header-text .service {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 0.8em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
      font-weight: 500;
    }
    .value-container {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
      border-radius: 6px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.95em;
      word-break: break-all;
      position: relative;
    }
    .value-hidden {
      filter: blur(5px);
      user-select: none;
      transition: filter 0.2s;
    }
    .value-visible {
      filter: none;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
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
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      background: var(--vscode-input-background);
      border-radius: 6px;
      padding: 10px 12px;
    }
    .info-label {
      font-size: 0.75em;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 0.9em;
    }
    .uri-container {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
      border-radius: 6px;
      padding: 10px 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.85em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .uri-container button {
      padding: 4px 10px;
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="service-badge">${escapeHtml(serviceIcon.letter)}</div>
    <div class="header-text">
      <h1>${escapeHtml(keyName)}</h1>
      <span class="service">${escapeHtml(serviceIcon.name)} \u00B7 ${escapeHtml(vaultName)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Value</div>
    <div class="value-container">
      <span id="keyValue" class="value-hidden">${escapeHtml(value)}</span>
    </div>
    <div class="actions">
      <button onclick="toggleReveal()" id="toggleBtn">Reveal</button>
      <button class="secondary" onclick="copyValue('${escapeAttr(value)}')">Copy Value</button>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Masked</div>
        <div class="info-value" style="font-family: var(--vscode-editor-font-family, monospace)">${escapeHtml(maskedValue)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Vault</div>
        <div class="info-value">${escapeHtml(vaultName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Created</div>
        <div class="info-value">${new Date(createdAt).toLocaleDateString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Last Accessed</div>
        <div class="info-value">${lastAccessedAt ? new Date(lastAccessedAt).toLocaleDateString() : "Never"}</div>
      </div>
      ${
        expiresAt
          ? `<div class="info-item">
        <div class="info-label">Expires</div>
        <div class="info-value">${new Date(expiresAt).toLocaleDateString()}</div>
      </div>`
          : ""
      }
    </div>
  </div>

  <div class="section">
    <div class="section-title">Reference URI</div>
    <div class="uri-container">
      <span>${escapeHtml(lockboxUri)}</span>
      <button onclick="copyValue('${escapeAttr(lockboxUri)}')">Copy</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let revealed = false;

    function toggleReveal() {
      const el = document.getElementById('keyValue');
      const btn = document.getElementById('toggleBtn');
      revealed = !revealed;
      el.className = revealed ? 'value-visible' : 'value-hidden';
      btn.textContent = revealed ? 'Hide' : 'Reveal';
    }

    function copyValue(val) {
      vscode.postMessage({ command: 'copy', value: val });
    }
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    KeyDetailPanel.currentPanel = undefined;
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

function escapeAttr(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}
