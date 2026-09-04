export interface Polozka {
  popis: string;
  mnozstvi: number;
  jednotka: string;
  cenaJednotka: number;
  celkem: number;
}

export interface Faktura {
  id: string;
  cislo: string;           // např. "2026-0008"
  variabilniSymbol: string; // např. "20260008"
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
}

export interface Dodavatel {
  jmeno: string;
  adresa: string;
  ico: string;
  dic?: string;
  bankovniUcet: string;    // ve formátu číslo/kód
  iban?: string;
  poznamkaFaktura?: string; // např. "Fyzická osoba zapsaná v živnostenském rejstříku."
}
