import { readFile } from 'node:fs/promises';
import { exchangeRefreshToken } from './src/firebase-auth.js';
import { getTopazSession, getTopazProjectData, convertToPutFormat, updateTopazProject } from './src/topaz-auth.js';

const FIREBASE_API_KEY = process.env['FIREBASE_API_KEY'] ?? '';
const FIREBASE_REFRESH_TOKEN = process.env['FIREBASE_REFRESH_TOKEN'] ?? '';
const TOPAZ_PROJECT_ID = process.env['TOPAZ_PROJECT_ID'] ?? '';
const CONTENT_FILE_PATH = process.env['CONTENT_FILE_PATH'] ?? '';

if (!FIREBASE_API_KEY || !FIREBASE_REFRESH_TOKEN || !TOPAZ_PROJECT_ID || !CONTENT_FILE_PATH) {
  console.error('環境変数を設定してください:');
  console.error('  FIREBASE_API_KEY, FIREBASE_REFRESH_TOKEN, TOPAZ_PROJECT_ID, CONTENT_FILE_PATH');
  process.exit(1);
}

async function main() {
  console.log('=== ファイル読み込み ===');
  const markdownContent = await readFile(CONTENT_FILE_PATH, 'utf-8');
  console.log(`読み込み完了: ${CONTENT_FILE_PATH} (${markdownContent.length} 文字)`);

  console.log('\n=== Step 1: Refresh Token → Firebase ID Token ===');
  const firebase = await exchangeRefreshToken(FIREBASE_API_KEY, FIREBASE_REFRESH_TOKEN);
  console.log('userId:', firebase.userId);

  console.log('\n=== Step 2-3: Firebase ID Token → Topaz Session ===');
  const topazSession = await getTopazSession(firebase.idToken);
  console.log('topaz_session:', topazSession.slice(0, 50) + '...');

  console.log('\n=== Step 4: プロジェクトデータ取得 ===');
  const projectJson = await getTopazProjectData(topazSession, TOPAZ_PROJECT_ID);
  const project = JSON.parse(projectJson) as Record<string, unknown>;
  console.log('現在の body:', String(project['body'] ?? '').slice(0, 100) + '...');

  console.log('\n=== Step 5: body を更新 ===');
  const putData = convertToPutFormat(project);
  putData['body'] = markdownContent;
  console.log('PUT データ:', JSON.stringify(putData, null, 2));
  await updateTopazProject(topazSession, TOPAZ_PROJECT_ID, JSON.stringify(putData));

  console.log('\n=== 成功 ===');
}

main().catch((err) => {
  console.error('失敗:', err);
  process.exit(1);
});
