// Vercel Serverless Function: /api/sheets/*
// 프로덕션 환경에서 Google Sheets API 프록시 역할

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

function getAuthorizedSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!email || !key || !sheetId) return null;

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId: sheetId };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/sheets/', '').split('/').filter(Boolean);

  // GET /api/sheets/status
  if (pathParts[0] === 'status') {
    const client = getAuthorizedSheets();
    if (!client) {
      return res.status(200).json({
        connected: false,
        message: 'Google Sheets 환경변수가 설정되지 않았습니다.',
      });
    }
    try {
      const result = await client.sheets.spreadsheets.get({ spreadsheetId: client.spreadsheetId });
      const title = result.data.properties?.title || '(제목 없음)';
      return res.status(200).json({ connected: true, message: `연결 성공: "${title}"` });
    } catch (err) {
      return res.status(200).json({
        connected: false,
        message: `연결 실패: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (pathParts.length < 1) {
    return res.status(400).json({ error: 'Sheet name required' });
  }

  const sheetName = decodeURIComponent(pathParts[0]);
  const isAppend = pathParts[1] === 'append';
  const client = getAuthorizedSheets();

  if (!client) {
    return res.status(503).json({ error: 'Google Sheets 미설정', sheetName, success: false });
  }

  try {
    if (req.method === 'GET') {
      const result = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      return res.status(200).json({ sheetName, data: result.data.values || [] });
    }

    if (req.method === 'POST') {
      const { data } = req.body;
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'data 배열이 필요합니다.', sheetName, success: false });
      }
      await client.sheets.spreadsheets.values.clear({
        spreadsheetId: client.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: data },
      });
      return res.status(200).json({ sheetName, success: true, message: `${data.length}행 업데이트 완료` });
    }

    if (req.method === 'PUT' && isAppend) {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'rows 배열이 필요합니다.', sheetName, success: false });
      }
      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      return res.status(200).json({ sheetName, success: true, message: `${rows.length}행 추가 완료` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      sheetName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
