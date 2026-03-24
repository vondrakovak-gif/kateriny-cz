import { google } from 'googleapis';
import type { Faktura } from './types';

function getAuth() {
  const email = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google service account credentials nejsou nastaveny v .env');
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

const SHEET_ID = import.meta.env.GOOGLE_SHEET_ID;

export async function getFaktury(): Promise<Faktura[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Faktury!A2:Z',
  });

  const rows = res.data.values ?? [];
  return rows.map(rowToFaktura).filter(Boolean) as Faktura[];
}

export async function saveFaktura(faktura: Faktura): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const row = fakturaToRow(faktura);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Faktury!A:A',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function updateZaplaceno(cislo: string, zaplaceno: boolean, datum?: string): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Faktury!A:A',
  });

  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex(r => r[0] === cislo);
  if (rowIndex === -1) return;

  const rowNum = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Faktury!M${rowNum}:N${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[zaplaceno ? 'ANO' : 'NE', datum ?? '']] },
  });
}

function fakturaToRow(f: Faktura): string[] {
  return [
    f.cislo,
    f.datum,
    f.datumSplatnosti,
    f.klient.nazev,
    f.klient.ico,
    f.klient.dic ?? '',
    f.klient.adresa,
    f.klient.email ?? '',
    JSON.stringify(f.polozky),
    String(f.celkemBezDph),
    String(f.dph),
    String(f.celkemSDph),
    f.zaplaceno ? 'ANO' : 'NE',
    f.datumZaplaceni ?? '',
    f.poznamka ?? '',
    f.googleDriveId ?? '',
  ];
}

function rowToFaktura(row: string[]): Faktura | null {
  try {
    return {
      id: row[0],
      cislo: row[0],
      datum: row[1],
      datumSplatnosti: row[2],
      klient: {
        nazev: row[3],
        ico: row[4],
        dic: row[5],
        adresa: row[6],
        email: row[7],
      },
      polozky: JSON.parse(row[8] || '[]'),
      celkemBezDph: parseFloat(row[9]) || 0,
      dph: parseFloat(row[10]) || 0,
      celkemSDph: parseFloat(row[11]) || 0,
      zaplaceno: row[12] === 'ANO',
      datumZaplaceni: row[13] || undefined,
      poznamka: row[14] || undefined,
      googleDriveId: row[15] || undefined,
    };
  } catch {
    return null;
  }
}
