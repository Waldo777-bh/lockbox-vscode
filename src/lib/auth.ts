import * as vscode from "vscode";
import {
  AUTH_SECRET_KEY,
  USER_DATA_KEY,
  LAST_ACTIVE_KEY,
  SESSION_TIMEOUT_MS,
  getDashboardUrl,
} from "./constants";
import type { User } from "../types";

let _secrets: vscode.SecretStorage | undefined;
let _globalState: vscode.Memento | undefined;

export function initAuth(context: vscode.ExtensionContext): void {
  _secrets = context.secrets;
  _globalState = context.globalState;
}

function getSecrets(): vscode.SecretStorage {
  if (!_secrets) {
    throw new Error("Auth not initialized. Call initAuth first.");
  }
  return _secrets;
}

function getGlobalState(): vscode.Memento {
  if (!_globalState) {
    throw new Error("Auth not initialized. Call initAuth first.");
  }
  return _globalState;
}

export async function getAuthToken(): Promise<string | undefined> {
  const token = await getSecrets().get(AUTH_SECRET_KEY);
  if (!token) {
    return undefined;
  }

  // Check session timeout
  const lastActive = getGlobalState().get<number>(LAST_ACTIVE_KEY, 0);
  if (Date.now() - lastActive > SESSION_TIMEOUT_MS) {
    await clearAuth();
    return undefined;
  }

  // Update last active timestamp
  await getGlobalState().update(LAST_ACTIVE_KEY, Date.now());
  return token;
}

export async function getUser(): Promise<User | undefined> {
  const data = getGlobalState().get<User>(USER_DATA_KEY);
  return data;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

export async function saveAuth(token: string, user: User): Promise<void> {
  await getSecrets().store(AUTH_SECRET_KEY, token);
  await getGlobalState().update(USER_DATA_KEY, user);
  await getGlobalState().update(LAST_ACTIVE_KEY, Date.now());
}

export async function clearAuth(): Promise<void> {
  await getSecrets().delete(AUTH_SECRET_KEY);
  await getGlobalState().update(USER_DATA_KEY, undefined);
  await getGlobalState().update(LAST_ACTIVE_KEY, undefined);
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function getSignInUrl(): string {
  return `${getDashboardUrl()}/vscode-auth`;
}

export function getAuthCallbackUri(): vscode.Uri {
  return vscode.Uri.parse("vscode://lockbox.lockbox-vault/auth-callback");
}
