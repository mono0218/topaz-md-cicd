import * as core from '@actions/core';
import { readFile } from 'node:fs/promises';
import { exchangeRefreshToken } from './firebase-auth.js';
import { getTopazSession, getTopazProjectData, convertToPutFormat, updateTopazProject } from './topaz-auth.js';

async function run(): Promise<void> {
  try {
    const firebaseApiKey = core.getInput('firebase-api-key', { required: true });
    const refreshToken = core.getInput('firebase-refresh-token', { required: true });
    const topazProjectId = core.getInput('topaz-project-id', { required: true });
    const contentFilePath = core.getInput('content-file-path', { required: true });

    core.setSecret(firebaseApiKey);
    core.setSecret(refreshToken);

    // Markdown ファイルを読み込む
    core.info(`ファイル読み込み中: ${contentFilePath}`);
    const markdownContent = await readFile(contentFilePath, 'utf-8');

    // Step 1: Refresh Token → Firebase ID Token
    core.info('Firebase ID Token を取得中...');
    const firebase = await exchangeRefreshToken(firebaseApiKey, refreshToken);
    core.setSecret(firebase.idToken);

    // Step 2-3: Firebase ID Token → Session Cookie → topaz_session
    core.info('Topaz Session を取得中...');
    const topazSession = await getTopazSession(firebase.idToken);
    core.setSecret(topazSession);

    // Step 4: プロジェクトデータを取得
    core.info(`プロジェクトデータを取得中 (${topazProjectId})...`);
    const projectJson = await getTopazProjectData(topazSession, topazProjectId);
    const project = JSON.parse(projectJson) as Record<string, unknown>;

    // Step 5: PUT 用フォーマットに変換し body を差し替えて更新
    const putData = convertToPutFormat(project);
    putData['body'] = markdownContent;
    core.info('プロジェクトを更新中...');
    await updateTopazProject(topazSession, topazProjectId, JSON.stringify(putData));

    core.info(`Topaz プロジェクト更新成功 (project: ${topazProjectId})`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

run();
