import * as vscode from "vscode";
import { LOCKBOX_URI_PATTERN } from "../lib/constants";

export class LockboxCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration("lockbox");
    if (!config.get<boolean>("showCodeLens", true)) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const regex = new RegExp(LOCKBOX_URI_PATTERN.source, "g");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line.text)) !== null) {
        const service = match[1];
        const keyName = match[2];
        const range = new vscode.Range(
          i,
          match.index,
          i,
          match.index + match[0].length,
        );

        // Copy Value action
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: "\u{1F511} Copy Value",
            command: "lockbox.copyKeyByRef",
            arguments: [service, keyName],
          }),
        );

        // Reveal action
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: "Reveal",
            command: "lockbox.revealKeyByRef",
            arguments: [service, keyName],
          }),
        );

        // Open in Dashboard
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: "Open in Dashboard",
            command: "lockbox.openDashboard",
          }),
        );
      }
    }

    return codeLenses;
  }
}
