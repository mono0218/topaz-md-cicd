const SESSION_COOKIE_URL =
  'https://gkllavg0p8.execute-api.ap-northeast-1.amazonaws.com/default/topaz-prod-createSessionCookie';
const TOPAZ_LOGIN_URL = 'https://topaz.dev/api/auth/login';

/**
 * Firebase ID Token の payload をデコードする (署名検証なし)
 */
function decodeIdTokenPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split('.');
  const payload = parts[1];
  if (!payload) {
    throw new Error('Invalid ID Token format');
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as Record<string, unknown>;
}

/**
 * ステップ1: Firebase ID Token → Session Cookie を取得
 */
async function createSessionCookie(idToken: string): Promise<string> {
  const claims = decodeIdTokenPayload(idToken);

  const iat = claims['iat'] as number;
  const exp = claims['exp'] as number;
  const authTime = claims['auth_time'] as number;

  const body = {
    claims,
    token: idToken,
    authTime: new Date(authTime * 1000).toUTCString(),
    issuedAtTime: new Date(iat * 1000).toUTCString(),
    expirationTime: new Date(exp * 1000).toUTCString(),
    signInProvider: (claims['firebase'] as { sign_in_provider?: string })?.sign_in_provider ?? null,
    signInSecondFactor: null,
  };

  const res = await fetch(SESSION_COOKIE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`createSessionCookie failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as { sessionCookie: string };
  return data.sessionCookie;
}

/**
 * ステップ2: Session Cookie → topaz.dev にログインして topaz_session を取得
 */
async function loginToTopaz(sessionCookie: string): Promise<string> {
  const res = await fetch(TOPAZ_LOGIN_URL, {
    method: 'POST',
    headers: {
      token: sessionCookie,
      origin: 'https://topaz.dev',
      referer: 'https://topaz.dev/',
    },
    redirect: 'manual',
  });

  // 204 No Content が正常レスポンス
  if (res.status !== 204 && !res.ok) {
    const errorBody = await res.text();
    throw new Error(`Topaz login failed (${res.status}): ${errorBody}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Topaz login did not return set-cookie header');
  }

  const match = setCookie.match(/topaz_session=([^;]+)/);
  if (!match?.[1]) {
    throw new Error('topaz_session cookie not found in response');
  }

  return decodeURIComponent(match[1]);
}

/**
 * Firebase ID Token から Topaz Session を取得する
 */
export async function getTopazSession(idToken: string): Promise<string> {
  const sessionCookie = await createSessionCookie(idToken);
  const topazSession = await loginToTopaz(sessionCookie);
  return topazSession;
}

/**
 * Topaz プロジェクトの JSON データを取得する
 */
export async function getTopazProjectData(
  topazSession: string,
  projectId: string,
): Promise<string> {
  const url = `https://topaz.dev/api/projects/${encodeURIComponent(projectId)}/edit`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: `topaz_session=${topazSession}`,
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to fetch project data (${res.status}): ${errorBody}`);
  }

  return await res.text();
}

/**
 * GET レスポンスを PUT 用フォーマットに変換する
 */
export function convertToPutFormat(project: Record<string, unknown>): Record<string, unknown> {
  const promote = project['promote'] as Record<string, { title: string; body: string }> | null;
  const promoteCardList = promote
    ? Object.values(promote).map((card) => ({ title: card.title, body: card.body }))
    : [];

  const technologyTagList = project['technology_tag_list'] as { id: string }[] | null;
  const technologyTagIdList = technologyTagList
    ? technologyTagList.map((tag) => tag.id)
    : [];

  return {
    title: project['title'],
    description: project['description'],
    body: project['body'],
    github_url: project['github_url'] ?? '',
    reference_url: project['reference_url'] ?? '',
    thumbnail_path: project['thumbnail_path'] ?? '',
    technology_tag_id_list: technologyTagIdList,
    promote_card_list: promoteCardList,
    published: project['published'],
  };
}

/**
 * Topaz プロジェクトを更新する
 */
export async function updateTopazProject(
  topazSession: string,
  projectId: string,
  projectJson: string,
): Promise<void> {
  const url = `https://topaz.dev/api/projects/${encodeURIComponent(projectId)}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      cookie: `topaz_session=${topazSession}`,
      'Content-Type': 'application/json',
      origin: 'https://topaz.dev',
      referer: `https://topaz.dev/projects/${encodeURIComponent(projectId)}/edit`,
    },
    body: projectJson,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to update project (${res.status}): ${errorBody}`);
  }
}
