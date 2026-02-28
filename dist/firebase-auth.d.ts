export interface TokenResult {
    idToken: string;
    userId: string;
}
/**
 * Firebase Refresh Token を使って ID Token を取得する
 * https://securetoken.googleapis.com/v1/token を利用
 */
export declare function exchangeRefreshToken(apiKey: string, refreshToken: string): Promise<TokenResult>;
