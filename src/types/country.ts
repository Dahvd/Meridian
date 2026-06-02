export type Country = {
  name: {
    common: string;
    official: string;
  };
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  cca2: string;
  region: string;
  capital: string[];
  population: number;
  currencies: Record<string, { name: string; symbol: string }>;
  languages: Record<string, string>;
  tld: string[];
  idd: {
    root: string;
    suffixes: string[];
  };
  area: number | null;
  latlng: [number, number] | null;
  borders: string[];
  demonyms?: { eng?: { f: string; m: string } };
  coatOfArms?: { png?: string; svg?: string };
  car?: { side: 'left' | 'right'; signs: string[] };
};
