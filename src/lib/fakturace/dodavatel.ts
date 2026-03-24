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

export function ibanZUctu(ucet: string): string {
  // Základní převod CZ IBAN z čísla účtu/kód banky
  const [cislo, kod] = ucet.split('/');
  if (!cislo || !kod) return '';
  const predcisli = '000000';
  const jistina = cislo.padStart(10, '0');
  const bban = `${kod}${predcisli}${jistina}`;
  const numericIBAN = bban.split('').map(c => isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c).join('');
  const mod = `${numericIBAN}123500` // CZ = 12 35
    .split('')
    .reduce((acc, d) => (Number(acc + d) % 97).toString(), '');
  const check = String(98 - Number(mod)).padStart(2, '0');
  return `CZ${check}${bban}`;
}
