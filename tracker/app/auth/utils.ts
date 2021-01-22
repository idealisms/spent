import { CLIENT_ID } from '../config';
import { sha256 } from 'sha.js';
import { AuthPage } from '../main/components/RoutePaths';

const CODE_VERIFIER_LOCAL_STORAGE_KEY = 'dropboxCodeVerifier';

/**
 * Create the link to authenticate with Dropbox.
 *
 * Following the steps outlined here (PKCE):
 * https://www.dropbox.com/lp/developers/reference/oauth-guide
 *
 * @param origin The protocol, domain and port for the site.
 * @return The URL to send the user to.
 */
export function generateAuthUrl(origin: string) {
  const RETURN_URL = origin + AuthPage;

  // TODO: Split the login link and the token generation into two pages.
  const codeChallenge = generateChallenge();
  let authUrl =
    `https://www.dropbox.com/oauth2/authorize?client_id=${CLIENT_ID}` +
    `&redirect_uri=${RETURN_URL}&response_type=code&code_challenge_method=S256&code_challenge=${codeChallenge}`;
  return authUrl;
}

export function getAuthToken(origin: string, returnCode: string | null) {
  const codeVerifier = window.localStorage.getItem(
    CODE_VERIFIER_LOCAL_STORAGE_KEY
  );

  return new Promise(
    (
      resolve: (accessToken: string) => void,
      reject: (reason: string) => void
    ) => {
      if (!returnCode) {
        reject('missing return code');
        return;
      }
      if (!codeVerifier) {
        reject('missing code verifier');
        return;
      }

      // https://www.dropbox.com/developers/documentation/http/documentation#oauth2-token
      const searchParams = new URLSearchParams();
      searchParams.set('code', returnCode);
      searchParams.set('grant_type', 'authorization_code');
      searchParams.set('client_id', CLIENT_ID);
      searchParams.set('redirect_uri', origin + AuthPage);
      searchParams.set('code_verifier', codeVerifier);

      window
        .fetch('https://api.dropbox.com/oauth2/token', {
          method: 'POST',
          body: searchParams,
        })
        .then(response => {
          console.log(response);
          if (response.status == 200) {
            response.json().then(data => {
              window.localStorage.removeItem('dropboxCodeVerifier');
              resolve(data['access_token']);
            });
          } else {
            console.log(response);
          }
        });
    }
  );
}

/**
 * Create the OAuth code verifier and challenge values.
 *
 * @return The code challenge.
 */
function generateChallenge() {
  const CHARSET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let buffer = new Uint8Array(128);
  window.crypto.getRandomValues(buffer);
  const codeVerifier = Array.prototype.map
    .call(buffer, n => CHARSET[n % CHARSET.length])
    .join('');
  // Save the codeVerifier for when the user returns.
  window.localStorage.setItem(CODE_VERIFIER_LOCAL_STORAGE_KEY, codeVerifier);
  const codeChallenge = new sha256()
    .update(codeVerifier)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return codeChallenge;
}
