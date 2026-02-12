// Vite 미들웨어 플러그인: /api/sheets/* 라우트 처리
// Google Sheets API를 서버 사이드에서 호출합니다.

import type { Plugin } from 'vite';
import { getAuthorizedSheets, testSheetsConnection } from './sheetsAuth';

function parseBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    const maxSize = 5 * 1024 * 1024; // 5MB 제한
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > maxSize) {
        reject(new Error('요청 본문이 5MB를 초과했습니다.'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function logRequest(method: string, path: string, status: number, durationMs: number) {
  const timestamp = new Date().toISOString();
  console.log(`[Sheets API] ${timestamp} ${method} ${path} → ${status} (${durationMs}ms)`);
}

export const sheetsMiddleware = (): Plugin => ({
  name: 'sheets-api-middleware',
  configureServer(server) {
    // GET /api/sheets/status - 연결 상태 확인
    server.middlewares.use('/api/sheets/status', async (_req, res) => {
      const start = Date.now();
      res.setHeader('Content-Type', 'application/json');

      const result = await testSheetsConnection();
      const status = result.connected ? 200 : 503;
      res.statusCode = status;
      res.end(JSON.stringify(result));

      logRequest('GET', '/api/sheets/status', status, Date.now() - start);
    });

    // /api/sheets/:sheetName - 시트 데이터 CRUD
    server.middlewares.use('/api/sheets', async (req, res, next) => {
      if (req.url?.startsWith('/status')) return next();

      const start = Date.now();
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length < 1) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Sheet name required' }));
        logRequest(req.method || 'UNKNOWN', '/api/sheets', 400, Date.now() - start);
        return;
      }

      const sheetName = decodeURIComponent(pathParts[0]);
      const isAppend = pathParts[1] === 'append';
      const client = getAuthorizedSheets();

      res.setHeader('Content-Type', 'application/json');

      if (!client) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'Google Sheets 미설정', sheetName, success: false }));
        logRequest(req.method || 'UNKNOWN', `/api/sheets/${sheetName}`, 503, Date.now() - start);
        return;
      }

      try {
        if (req.method === 'GET') {
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
          logRequest('GET', `/api/sheets/${sheetName}`, 200, Date.now() - start);
        } else if (req.method === 'POST') {
          const body = JSON.parse(await parseBody(req));
          if (!body.data || !Array.isArray(body.data)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'data 배열이 필요합니다.', sheetName, success: false }));
            logRequest('POST', `/api/sheets/${sheetName}`, 400, Date.now() - start);
            return;
          }
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
          logRequest('POST', `/api/sheets/${sheetName}`, 200, Date.now() - start);
        } else if (req.method === 'PUT' && isAppend) {
          const body = JSON.parse(await parseBody(req));
          if (!body.rows || !Array.isArray(body.rows)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'rows 배열이 필요합니다.', sheetName, success: false }));
            logRequest('PUT', `/api/sheets/${sheetName}/append`, 400, Date.now() - start);
            return;
          }
          await client.sheets.spreadsheets.values.append({
            spreadsheetId: client.spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: body.rows },
          });
          res.end(JSON.stringify({ sheetName, success: true, message: `${body.rows?.length || 0}행 추가 완료` }));
          logRequest('PUT', `/api/sheets/${sheetName}/append`, 200, Date.now() - start);
        } else {
          next();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            sheetName,
            success: false,
            error: errorMessage,
          })
        );
        logRequest(req.method || 'UNKNOWN', `/api/sheets/${sheetName}`, 500, Date.now() - start);
      }
    });
  },
});
