import * as vscode from "vscode";
import { ENV_KEY_PATTERNS } from "../lib/constants";

interface EnvKeyInfo {
  lineNumber: number;
  keyName: string;
  value: string;
  range: vscode.Range;
}

export class EnvCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration("lockbox");
    if (!config.get<boolean>("showEnvSuggestions", true)) {
      return [];
    }

    // Only for .env files
    const fileName = document.fileName.toLowerCase();
    if (
      !fileName.endsWith(".env") &&
      !fileName.includes(".env.") &&
      !fileName.endsWith(".env.local") &&
      !fileName.endsWith(".env.development") &&
      !fileName.endsWith(".env.production") &&
      !fileName.endsWith(".env.example")
    ) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const envKeys = this.detectEnvKeys(document);

    for (const envKey of envKeys) {
      // "Store in Lockbox" lens
      codeLenses.push(
        new vscode.CodeLens(envKey.range, {
          title: "\u{1F512} Store in Lockbox",
          command: "lockbox.storeEnvKey",
          arguments: [envKey.keyName, envKey.value],
        }),
      );
    }

    // If there are multiple keys, add a "Import All" lens at the top
    if (envKeys.length > 1) {
      const topRange = new vscode.Range(0, 0, 0, 0);
      codeLenses.unshift(
        new vscode.CodeLens(topRange, {
          title: `\u{1F512} Import all ${envKeys.length} keys to Lockbox`,
          command: "lockbox.importEnv",
        }),
      );
    }

    return codeLenses;
  }

  private detectEnvKeys(document: vscode.TextDocument): EnvKeyInfo[] {
    const keys: EnvKeyInfo[] = [];

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text.trim();

      // Skip comments and empty lines
      if (!text || text.startsWith("#")) {
        continue;
      }

      // Match KEY=VALUE pattern
      const envMatch = text.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/i);
      if (!envMatch) {
        continue;
      }

      const keyName = envMatch[1];
      let value = envMatch[2];

      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Skip empty values or placeholders
      if (
        !value ||
        value === "your_key_here" ||
        value === "xxx" ||
        value === "CHANGE_ME"
      ) {
        continue;
      }

      // Check if it looks like an API key
      const isApiKey = ENV_KEY_PATTERNS.some((pattern) =>
        pattern.test(keyName),
      );
      if (!isApiKey) {
        continue;
      }

      keys.push({
        lineNumber: i,
        keyName,
        value,
        range: new vscode.Range(i, 0, i, 0),
      });
    }

    return keys;
  }
}

export function extractServiceFromEnvKey(keyName: string): string {
  const upper = keyName.toUpperCase();
  const servicePatterns: Record<string, string> = {
    OPENAI: "openai",
    STRIPE: "stripe",
    AWS: "aws",
    GITHUB: "github",
    ANTHROPIC: "anthropic",
    CLERK: "clerk",
    SUPABASE: "supabase",
    FIREBASE: "firebase",
    TWILIO: "twilio",
    SENDGRID: "sendgrid",
    CLOUDFLARE: "cloudflare",
    VERCEL: "vercel",
    HEROKU: "heroku",
    MONGODB: "mongodb",
    MONGO: "mongodb",
    REDIS: "redis",
    DIGITAL_OCEAN: "digitalocean",
    DIGITALOCEAN: "digitalocean",
  };

  for (const [pattern, service] of Object.entries(servicePatterns)) {
    if (upper.includes(pattern)) {
      return service;
    }
  }

  return "other";
}
