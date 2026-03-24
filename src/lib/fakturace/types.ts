export interface Polozka {
  popis: string;
  mnozstvi: number;
  jednotka: string;
  cenaJednotka: number;
  celkem: number;
}

export interface Faktura {
  id: string;
  cislo: string;           // např. "2024001"
  datum: string;           // ISO date
  datumSplatnosti: string; // ISO date
  klient: {
    nazev: string;
    ico: string;
    dic?: string;
    adresa: string;
    email?: string;
  };
  polozky: Polozka[];
  celkemBezDph: number;
  dph: number;             // sazba v %, 0 pokud neplátce
  celkemSDph: number;
  zaplaceno: boolean;
  datumZaplaceni?: string;
  poznamka?: string;
  googleDriveId?: string;  // ID souboru v Google Drive
  googleSheetsRow?: number;
}
