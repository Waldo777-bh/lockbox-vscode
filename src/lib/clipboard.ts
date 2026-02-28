import * as vscode from "vscode";
import { getClipboardClearTimeout } from "./constants";

let clearTimer: ReturnType<typeof setTimeout> | undefined;

export async function copyToClipboard(value: string): Promise<void> {
  await vscode.env.clipboard.writeText(value);

  // Clear any existing timer
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = undefined;
  }

  const timeout = getClipboardClearTimeout();
  if (timeout > 0) {
    clearTimer = setTimeout(async () => {
      // Only clear if our value is still on the clipboard
      const current = await vscode.env.clipboard.readText();
      if (current === value) {
        await vscode.env.clipboard.writeText("");
      }
      clearTimer = undefined;
    }, timeout * 1000);
  }
}

export function disposeClearTimer(): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = undefined;
  }
}
