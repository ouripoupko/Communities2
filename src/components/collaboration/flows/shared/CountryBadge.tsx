import React from 'react';
import { getCountryByCode } from '../../../../utils/countries';

interface CountryBadgeProps {
  countryCode: string | undefined;
}

/** Renders flag emoji + country code. Returns null if no code provided. */
const CountryBadge: React.FC<CountryBadgeProps> = ({ countryCode }) => {
  if (!countryCode) return null;
  const country = getCountryByCode(countryCode);
  return (
    <span title={country.name} style={{ fontSize: '0.8em', marginLeft: 4 }}>
      {country.flag}
    </span>
  );
};

export default CountryBadge;
