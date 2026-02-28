import * as vscode from "vscode";
import { LOCKBOX_URI_PATTERN_SINGLE } from "../lib/constants";
import { getServiceIcon } from "../types";
import type { VaultTreeProvider } from "./vaultTreeProvider";

export class LockboxHoverProvider implements vscode.HoverProvider {
  constructor(private vaultTreeProvider: VaultTreeProvider) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(
      position,
      /lockbox:\/\/[^\s]+/,
    );

    if (!range) {
      return undefined;
    }

    const word = document.getText(range);
    const match = word.match(LOCKBOX_URI_PATTERN_SINGLE);

    if (!match) {
      return undefined;
    }

    const service = match[1];
    const keyName = match[2];
    const serviceIcon = getServiceIcon(service);

    // Try to find the actual key in cached data
    const allKeys = this.vaultTreeProvider.getAllKeys();
    const foundKey = allKeys.find(
      (k) =>
        k.service.toLowerCase() === service.toLowerCase() &&
        k.name === keyName,
    );

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    md.appendMarkdown(`### $(key) Lockbox Key Reference\n\n`);
    md.appendMarkdown(`| | |\n|---|---|\n`);
    md.appendMarkdown(`| **Service** | ${serviceIcon.name} |\n`);
    md.appendMarkdown(`| **Key** | ${keyName} |\n`);

    if (foundKey) {
      md.appendMarkdown(`| **Vault** | ${foundKey.vaultName} |\n`);
      md.appendMarkdown(`| **Masked** | \`${foundKey.maskedValue}\` |\n`);
      if (foundKey.lastAccessedAt) {
        md.appendMarkdown(
          `| **Last Accessed** | ${new Date(foundKey.lastAccessedAt).toLocaleDateString()} |\n`,
        );
      }
      if (foundKey.expiresAt) {
        md.appendMarkdown(
          `| **Expires** | ${new Date(foundKey.expiresAt).toLocaleDateString()} |\n`,
        );
      }
    } else {
      md.appendMarkdown(`| **Status** | Key not found in vaults |\n`);
    }

    md.appendMarkdown(
      `\n\n[Copy Value](command:lockbox.copyKeyByRef?${encodeURIComponent(JSON.stringify([service, keyName]))}) | [Reveal](command:lockbox.revealKeyByRef?${encodeURIComponent(JSON.stringify([service, keyName]))})`,
    );

    return new vscode.Hover(md, range);
  }
}
