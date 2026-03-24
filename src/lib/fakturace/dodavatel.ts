import type { Dodavatel } from './types';

export function getDodavatel(): Dodavatel {
  return {
    jmeno: import.meta.env.DODAVATEL_JMENO ?? 'Kateřina Vondráková',
    adresa: import.meta.env.DODAVATEL_ADRESA ?? 'Na Kopci 2\n586 01 Jihlava',
    ico: import.meta.env.DODAVATEL_ICO ?? '04219775',
    dic: import.meta.env.DODAVATEL_DIC ?? '',
    bankovniUcet: import.meta.env.DODAVATEL_UCET ?? '1136558016/3030',
    iban: import.meta.env.DODAVATEL_IBAN ?? '',
    poznamkaFaktura: import.meta.env.DODAVATEL_POZNAMKA ?? 'Fyzická osoba zapsaná v živnostenském rejstříku.',
  };
}

/** Vypočítá český IBAN z čísla účtu ve formátu "číslo/kód" nebo "předčíslí-číslo/kód" */
export function ibanZUctu(ucet: string): string {
  const match = ucet.match(/^(?:(\d+)-)?(\d+)\/(\d{4})$/);
  if (!match) return '';
  const predcisli = (match[1] ?? '0').padStart(6, '0');
  const cislo = match[2].padStart(10, '0');
  const banka = match[3];
  const bban = `${banka}${predcisli}${cislo}`;
  // Přesunout "CZ00" na konec a převést na čísla: CZ = 1235
  const numStr = `${bban}123500`;
  // Mod97 po kouscích (BigInt kvůli velikosti čísla)
  const remainder = BigInt(numStr) % 97n;
  const check = String(98n - remainder).padStart(2, '0');
  return `CZ${check}${bban}`;
}
