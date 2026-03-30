export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

export const PILOT_COUNTRIES: CountryInfo[] = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩' },
];

export const OTHER_COUNTRY: CountryInfo = { code: 'OTHER', name: 'Other', flag: '🌐' };

const COUNTRY_MAP = new Map<string, CountryInfo>(
  [...PILOT_COUNTRIES, OTHER_COUNTRY].map((c) => [c.code, c]),
);

export function getCountryByCode(code: string): CountryInfo {
  return COUNTRY_MAP.get(code) || OTHER_COUNTRY;
}

export function getCountryFlag(code: string): string {
  return getCountryByCode(code).flag;
}

export function getCountryName(code: string): string {
  return getCountryByCode(code).name;
}

/** Consistent colors for country-based charts (used in PR 2 and PR 3) */
export const COUNTRY_COLORS: Record<string, string> = {
  KE: '#006600',  // Kenya green
  NG: '#008751',  // Nigeria green
  MW: '#ce1126',  // Malawi red
  CD: '#007fff',  // DRC blue
  OTHER: '#6b7280', // gray
};
