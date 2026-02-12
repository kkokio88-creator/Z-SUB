// Vite 미들웨어 플러그인: /api/sheets/* 라우트 처리
// Google Sheets API를 서버 사이드에서 호출합니다.

import type { Plugin } from 'vite';
import { google } from 'googleapis';
import { getSheetsAuthConfig } from './sheetsAuth';

function getAuthorizedSheets() {
  const config = getSheetsAuthConfig();
  if (!config) return null;

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId: config.spreadsheetId };
}

function parseBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
  });
}

export const sheetsMiddleware = (): Plugin => ({
  name: 'sheets-api-middleware',
  configureServer(server) {
    // GET /api/sheets/status - 연결 상태 확인
    server.middlewares.use('/api/sheets/status', async (_req, res) => {
      res.setHeader('Content-Type', 'application/json');

      const client = getAuthorizedSheets();
      if (!client) {
        res.end(
          JSON.stringify({
            connected: false,
            message:
              'Google Sheets 인증 정보가 설정되지 않았습니다. 환경변수(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID)를 설정하세요.',
          })
        );
        return;
      }

      try {
        await client.sheets.spreadsheets.get({ spreadsheetId: client.spreadsheetId });
        res.end(JSON.stringify({ connected: true, message: 'Google Sheets 연결 성공' }));
      } catch (err) {
        res.end(
          JSON.stringify({
            connected: false,
            message: `연결 실패: ${err instanceof Error ? err.message : String(err)}`,
          })
        );
      }
    });

    // /api/sheets/:sheetName - 시트 데이터 CRUD
    server.middlewares.use('/api/sheets', async (req, res, next) => {
      if (req.url?.startsWith('/status')) return next();

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length < 1) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Sheet name required' }));
        return;
      }

      const sheetName = decodeURIComponent(pathParts[0]);
      const isAppend = pathParts[1] === 'append';
      const client = getAuthorizedSheets();

      res.setHeader('Content-Type', 'application/json');

      if (!client) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'Google Sheets 미설정', sheetName, success: false }));
        return;
      }

      try {
        if (req.method === 'GET') {
          // 시트 데이터 조회
          const result = await client.sheets.spreadsheets.values.get({
            spreadsheetId: client.spreadsheetId,
            range: `${sheetName}!A:Z`,
          });
          res.end(
            JSON.stringify({
              sheetName,
              data: result.data.values || [],
            })
          );
        } else if (req.method === 'POST') {
          // 시트 데이터 덮어쓰기
          const body = JSON.parse(await parseBody(req));
          await client.sheets.spreadsheets.values.clear({
            spreadsheetId: client.spreadsheetId,
            range: `${sheetName}!A:Z`,
          });
          await client.sheets.spreadsheets.values.update({
            spreadsheetId: client.spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: body.data },
          });
          res.end(JSON.stringify({ sheetName, success: true, message: `${body.data?.length || 0}행 업데이트 완료` }));
        } else if (req.method === 'PUT' && isAppend) {
          // 시트에 행 추가
          const body = JSON.parse(await parseBody(req));
          await client.sheets.spreadsheets.values.append({
            spreadsheetId: client.spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: body.rows },
          });
          res.end(JSON.stringify({ sheetName, success: true, message: `${body.rows?.length || 0}행 추가 완료` }));
        } else {
          next();
        }
      } catch (err) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            sheetName,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    });
  },
});
