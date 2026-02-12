// Google Sheets 서비스 계정 인증
// Vite dev server 미들웨어에서 사용됩니다.
// 프로덕션 환경에서는 별도 백엔드 서버에서 실행해야 합니다.

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
    return null;
  }

  return {
    serviceAccountEmail: email,
    privateKey: key.replace(/\n/g, '\n'),
    spreadsheetId: sheetId,
  };
};
