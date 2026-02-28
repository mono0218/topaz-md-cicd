/**
 * Firebase ID Token から Topaz Session を取得する
 */
export declare function getTopazSession(idToken: string): Promise<string>;
/**
 * Topaz プロジェクトの JSON データを取得する
 */
export declare function getTopazProjectData(topazSession: string, projectId: string): Promise<string>;
/**
 * GET レスポンスを PUT 用フォーマットに変換する
 */
export declare function convertToPutFormat(project: Record<string, unknown>): Record<string, unknown>;
/**
 * Topaz プロジェクトを更新する
 */
export declare function updateTopazProject(topazSession: string, projectId: string, projectJson: string): Promise<void>;
