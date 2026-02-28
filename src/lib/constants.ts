import * as vscode from "vscode";

export function getDashboardUrl(): string {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<string>("dashboardUrl", "https://dashboard.yourlockbox.dev");
}

export function getApiBaseUrl(): string {
  return `${getDashboardUrl()}/api`;
}

export function getAutoRefreshInterval(): number {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<number>("autoRefreshInterval", 300);
}

export function getClipboardClearTimeout(): number {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<number>("clipboardClearTimeout", 30);
}

export function getShowCodeLens(): boolean {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<boolean>("showCodeLens", true);
}

export function getShowEnvSuggestions(): boolean {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<boolean>("showEnvSuggestions", true);
}

export function getShowStatusBar(): boolean {
  return vscode.workspace
    .getConfiguration("lockbox")
    .get<boolean>("showStatusBar", true);
}

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const RECENT_KEYS_COUNT = 5;
export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

export const AUTH_SECRET_KEY = "lockbox.authToken";
export const USER_DATA_KEY = "lockbox.userData";
export const CACHE_DATA_KEY = "lockbox.cacheData";
export const RECENT_KEYS_KEY = "lockbox.recentKeys";
export const LAST_ACTIVE_KEY = "lockbox.lastActive";

export const LOCKBOX_URI_PATTERN = /lockbox:\/\/([^/\s]+)\/([^\s]+)/g;
export const LOCKBOX_URI_PATTERN_SINGLE = /lockbox:\/\/([^/\s]+)\/([^\s]+)/;

export const ENV_KEY_PATTERNS = [
  /^[A-Z_]*(?:API_?KEY|SECRET_?KEY|ACCESS_?KEY|AUTH_?TOKEN|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY)[A-Z_]*$/i,
  /^[A-Z_]*(?:OPENAI|STRIPE|AWS|GITHUB|ANTHROPIC|CLERK|SUPABASE|FIREBASE|TWILIO|SENDGRID|CLOUDFLARE|VERCEL|HEROKU|MONGODB|REDIS)[A-Z_]*$/i,
];
