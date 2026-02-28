import * as vscode from "vscode";
import type { VaultTreeProvider } from "./vaultTreeProvider";

export class LockboxCompletionProvider
  implements vscode.CompletionItemProvider
{
  constructor(private vaultTreeProvider: VaultTreeProvider) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    // Check if we're typing a lockbox:// URI
    if (!linePrefix.includes("lockbox://")) {
      return undefined;
    }

    const allKeys = this.vaultTreeProvider.getAllKeys();

    // After lockbox://
    const uriMatch = linePrefix.match(/lockbox:\/\/([^/]*)$/);
    if (uriMatch) {
      // Suggest service names
      const services = [...new Set(allKeys.map((k) => k.service.toLowerCase()))];
      return services.map((service) => {
        const item = new vscode.CompletionItem(
          service,
          vscode.CompletionItemKind.Value,
        );
        item.detail = `Lockbox service`;
        item.insertText = service + "/";
        item.command = {
          command: "editor.action.triggerSuggest",
          title: "Trigger Suggest",
        };
        return item;
      });
    }

    // After lockbox://service/
    const keyMatch = linePrefix.match(/lockbox:\/\/([^/]+)\/([^/]*)$/);
    if (keyMatch) {
      const service = keyMatch[1].toLowerCase();
      const matchingKeys = allKeys.filter(
        (k) => k.service.toLowerCase() === service,
      );
      return matchingKeys.map((key) => {
        const item = new vscode.CompletionItem(
          key.name,
          vscode.CompletionItemKind.Field,
        );
        item.detail = `${key.service} \u00B7 ${key.vaultName}`;
        item.documentation = new vscode.MarkdownString(
          `**${key.name}**\n\nMasked: \`${key.maskedValue}\`\n\nVault: ${key.vaultName}`,
        );
        return item;
      });
    }

    return undefined;
  }
}
