import * as Crypto from 'expo-crypto';

export async function createPkceChallenge() {
  const codeVerifier = generateRandomString(96);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = Crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomBytes[i] % charset.length);
  }
  return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });

  // Convert standard Base64 to Base64URL
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
