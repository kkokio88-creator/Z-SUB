// Google Sheets 서비스 계정 인증
// Vite dev server 미들웨어 및 Vercel Serverless Function에서 사용됩니다.

import { google, type sheets_v4 } from 'googleapis';

export interface SheetsAuthConfig {
  serviceAccountEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

export const getSheetsAuthConfig = (): SheetsAuthConfig | null => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!email || !key || !sheetId) {
    console.warn(
      '[SheetsAuth] 환경변수 누락:',
      !email ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL' : '',
      !key ? 'GOOGLE_PRIVATE_KEY' : '',
      !sheetId ? 'GOOGLE_SPREADSHEET_ID' : ''
    );
    return null;
  }

  return {
    serviceAccountEmail: email,
    privateKey: key.replace(/\\n/g, '\n'),
    spreadsheetId: sheetId,
  };
};

// 인증된 Sheets 클라이언트 캐싱
let cachedClient: { sheets: sheets_v4.Sheets; spreadsheetId: string } | null = null;
let cachedConfigHash = '';

function configHash(config: SheetsAuthConfig): string {
  return `${config.serviceAccountEmail}:${config.spreadsheetId}`;
}

export function getAuthorizedSheets(): { sheets: sheets_v4.Sheets; spreadsheetId: string } | null {
  const config = getSheetsAuthConfig();
  if (!config) return null;

  const hash = configHash(config);
  if (cachedClient && cachedConfigHash === hash) {
    return cachedClient;
  }

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedClient = {
    sheets: google.sheets({ version: 'v4', auth }),
    spreadsheetId: config.spreadsheetId,
  };
  cachedConfigHash = hash;

  return cachedClient;
}

export async function testSheetsConnection(): Promise<{ connected: boolean; message: string }> {
  const client = getAuthorizedSheets();
  if (!client) {
    return {
      connected: false,
      message:
        'Google Sheets 인증 정보가 설정되지 않았습니다. 환경변수(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID)를 설정하세요.',
    };
  }

  try {
    const result = await client.sheets.spreadsheets.get({ spreadsheetId: client.spreadsheetId });
    const title = result.data.properties?.title || '(제목 없음)';
    return { connected: true, message: `Google Sheets 연결 성공: "${title}"` };
  } catch (err) {
    cachedClient = null;
    cachedConfigHash = '';
    return {
      connected: false,
      message: `연결 실패: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
