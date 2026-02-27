export interface TokenResult {
  idToken: string;
  userId: string;
}

/**
 * Firebase Refresh Token を使って ID Token を取得する
 * https://securetoken.googleapis.com/v1/token を利用
 */
export async function exchangeRefreshToken(
  apiKey: string,
  refreshToken: string,
): Promise<TokenResult> {
  const url = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as {
    id_token: string;
    user_id: string;
    refresh_token: string;
  };

  return {
    idToken: data.id_token,
    userId: data.user_id,
  };
}
