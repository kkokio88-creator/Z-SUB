// Vercel Serverless Function: /api/sheets/*
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const allowedOrigins = [
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/sheets/', '').split('/').filter(Boolean);

  // GET /api/sheets/status - 먼저 기본 테스트
  if (pathParts[0] === 'status') {
    try {
      const { auth, sheets } = await import('@googleapis/sheets');

      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const key = process.env.GOOGLE_PRIVATE_KEY;
      const sheetId = process.env.GOOGLE_SPREADSHEET_ID;

      if (!email || !key || !sheetId) {
        return res.status(200).json({
          connected: false,
          message: 'Google Sheets 환경변수가 설정되지 않았습니다.',
          envCheck: { email: !!email, key: !!key, sheetId: !!sheetId },
        });
      }

      const jwtAuth = new auth.JWT({
        email,
        key: key.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheetsClient = sheets({ version: 'v4', auth: jwtAuth });
      const result = await sheetsClient.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const title = result.data.properties?.title || '(제목 없음)';
      return res.status(200).json({ connected: true, message: `연결 성공: "${title}"` });
    } catch (err) {
      return res.status(200).json({
        connected: false,
        message: `오류: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 나머지 Sheets CRUD
  if (pathParts.length < 1) {
    return res.status(400).json({ error: 'Sheet name required' });
  }

  try {
    const { auth, sheets } = await import('@googleapis/sheets');

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!email || !key || !sheetId) {
      return res.status(503).json({ error: 'Google Sheets 미설정', success: false });
    }

    const jwtAuth = new auth.JWT({
      email,
      key: key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = sheets({ version: 'v4', auth: jwtAuth });
    const sheetName = decodeURIComponent(pathParts[0]);
    const isAppend = pathParts[1] === 'append';

    if (req.method === 'GET') {
      const result = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:Z`,
      });
      return res.status(200).json({ sheetName, data: result.data.values || [] });
    }

    if (req.method === 'POST') {
      const { data } = req.body;
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'data 배열이 필요합니다.', sheetName, success: false });
      }
      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:Z`,
      });
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: data },
      });
      return res.status(200).json({
        sheetName,
        success: true,
        message: `${data.length}행 업데이트 완료`,
      });
    }

    if (req.method === 'PUT' && isAppend) {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'rows 배열이 필요합니다.', sheetName, success: false });
      }
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      return res.status(200).json({
        sheetName,
        success: true,
        message: `${rows.length}행 추가 완료`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
