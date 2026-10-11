import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { decodeJwt } from 'jose/jwt/decode';
import { Platform } from 'react-native';
import { createPkceChallenge } from './pkce';
import { storage, storageKeys } from './storage';

const DEFAULT_HOSTNAME = 'api.workos.com';

WebBrowser.maybeCompleteAuthSession();

export type RawWorkOSUser = {
  object: 'user';
  id: string;
  email: string;
  email_verified: boolean;
  profile_picture_url: string | null;
  first_name: string | null;
  last_name: string | null;
  last_sign_in_at: string | null;
  external_id: string | undefined;
  created_at: string;
  updated_at: string;
};

export type Session = {
  user: RawWorkOSUser;
  access_token: string;
  refresh_token: string;
  error_description?: string;
};

interface WorkOSClientOptions {
  clientId: string;
  apiHostname?: string;
  redirectPath?: string;
}

export class WorkOSClient {
  private clientId: string;
  private apiHostname: string;
  private redirectPath: string;

  constructor({ clientId, apiHostname, redirectPath }: WorkOSClientOptions) {
    this.clientId = clientId;
    this.apiHostname = apiHostname || DEFAULT_HOSTNAME;
    this.redirectPath = redirectPath || '/';
  }

  /**
   * Initiates the PKCE flow.
   * On native, opens the system browser. On web, performs a full-page
   * redirect — popups get blocked or stranded on mobile browsers, where
   * the auth tab can't reliably get back to the opener.
   */
  async signIn(redirectPath?: string) {
    const redirectUri = this.getRedirectUri(redirectPath);
    const authUrl = await this.getAuthorizeUrl(redirectUri);

    if (Platform.OS === 'web') {
      await storage.setItem(
        storageKeys.returnTo,
        window.location.pathname + window.location.search + window.location.hash,
      );
      window.location.assign(authUrl);
      // Page is navigating away; never resolves.
      return new Promise<Session | null>(() => {});
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    return await this.processAuthResult(result);
  }

  /**
   * On web, completes the PKCE flow when the browser lands back on the app
   * with `?code=...` in the URL. Cleans the URL and restores the page the
   * user was on before sign-in. No-op on native.
   */
  async completeAuthFromUrl(): Promise<Session | null> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      throw new Error(url.searchParams.get('error_description') || error);
    }

    if (!code) return null;

    // Strip OAuth params + restore where the user was before sign-in.
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    const returnTo = await storage.getItem(storageKeys.returnTo);
    await storage.removeItem(storageKeys.returnTo);
    const cleanUrl = returnTo || url.pathname + url.search + url.hash;
    window.history.replaceState({}, '', cleanUrl);

    return await this.authenticateWithCode(code);
  }

  private async getAuthorizeUrl(redirectUri: string) {
    const { codeVerifier, codeChallenge } = await createPkceChallenge();
    await storage.setItem(storageKeys.codeVerifier, codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      provider: 'authkit',
    });

    return `https://${this.apiHostname}/user_management/authorize?${params.toString()}`;
  }

  private async processAuthResult(result: WebBrowser.WebBrowserAuthSessionResult) {
    if (result.type !== 'success' || !result.url) return null;

    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) return null;

    return await this.authenticateWithCode(code);
  }

  async authenticateWithCode(code: string): Promise<Session> {
    const codeVerifier = await storage.getItem(storageKeys.codeVerifier);

    if (!codeVerifier) {
      throw new Error('No code verifier found in storage');
    }

    const response = await fetch(`https://${this.apiHostname}/user_management/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Authentication failed');
    }

    await this.setSession(data);
    return data as Session;
  }

  /**
   * Refreshes the current session using the stored refresh token.
   * checks for a locally stored refresh token and exchanges it for a new access token.
   */
  async authenticateWithRefreshToken(): Promise<Session> {
    const refreshToken = await this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`https://${this.apiHostname}/user_management/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data: Session = await response.json();

    if (!response.ok) {
      // Only an explicit rejection (expired/revoked refresh token) ends the session;
      // transient server errors shouldn't sign the user out.
      if (response.status >= 400 && response.status < 500) await this.clearLocalSession();
      throw new Error(data.error_description || 'Failed to refresh session');
    }

    await this.setSession(data);
    return data;
  }

  async clearLocalSession() {
    await storage.removeItem(storageKeys.accessToken);
    await storage.removeItem(storageKeys.refreshToken);
    await storage.removeItem(storageKeys.user);
  }

  async signOut(redirectPath?: string) {
    try {
      const accessToken = await storage.getItem(storageKeys.accessToken);
      const sessionId: string | undefined = accessToken
        ? (decodeJwt(accessToken)?.sid as any)
        : undefined;

      const redirectUri = this.getRedirectUri(redirectPath);

      if (!sessionId) {
        // If they had no active remote session to clear, just clear local state
        await this.clearLocalSession();
        return;
      }

      // Construct the logout URL that returns back to the app
      const logoutParams = new URLSearchParams({
        session_id: sessionId,
        return_to: redirectUri,
      });
      const logoutUrl = `https://${this.apiHostname}/user_management/sessions/logout?${logoutParams.toString()}`;

      if (Platform.OS === 'web') {
        // Clear local state first so a back-button after logout doesn't
        // briefly re-show authenticated UI, then full-page redirect.
        await this.clearLocalSession();
        window.location.assign(logoutUrl);
        return;
      }

      // Open Browser Session to logout remotely
      await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
    } catch (error) {
      console.warn('Remote logout failed', error);
    } finally {
      // Always ensure local session is cleared regardless of remote success
      await this.clearLocalSession();
    }
  }

  async getUser() {
    const userJson = await storage.getItem(storageKeys.user);
    return userJson ? (JSON.parse(userJson) as RawWorkOSUser) : null;
  }

  async getRefreshToken() {
    return (await storage.getItem(storageKeys.refreshToken)) || null;
  }

  async getAccessToken() {
    return (await storage.getItem(storageKeys.accessToken)) || null;
  }

  private getRedirectUri(path?: string) {
    let relativeRedirectUri = path || this.redirectPath;

    if (Platform.OS !== 'web' && relativeRedirectUri.endsWith('/'))
      relativeRedirectUri = relativeRedirectUri.slice(0, -1);

    const qualifiedRedirectUri = AuthSession.makeRedirectUri({
      path: relativeRedirectUri,
      preferLocalhost: true,
    });

    return qualifiedRedirectUri;
  }

  private async setSession(data: Session) {
    await storage.setItem(storageKeys.accessToken, data.access_token);
    await storage.setItem(storageKeys.refreshToken, data.refresh_token);
    await storage.setItem(storageKeys.user, JSON.stringify(data.user));
  }
}
