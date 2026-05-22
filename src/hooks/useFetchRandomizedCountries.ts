import { useMemo } from 'react';
import type { Country } from '../types/country';
import { shuffle } from '../helpers/countryHelpers';
import countriesData from '../data/countries.json';

export function useFetchRandomizedCountries() {
  const countries = useMemo(() => shuffle(countriesData as unknown as Country[]), []);
  return { countries };
}
