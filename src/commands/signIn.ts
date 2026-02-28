import * as vscode from "vscode";
import { getSignInUrl } from "../lib/auth";

export async function signIn(): Promise<void> {
  const signInUrl = getSignInUrl();
  const opened = await vscode.env.openExternal(vscode.Uri.parse(signInUrl));
  if (opened) {
    vscode.window.showInformationMessage(
      "Lockbox: Sign in via the browser to authenticate. The token will be passed back automatically.",
    );
  } else {
    vscode.window.showErrorMessage(
      "Lockbox: Failed to open sign-in page. Please visit " + signInUrl,
    );
  }
}
