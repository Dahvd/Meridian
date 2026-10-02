import { describe, it, expect } from 'vitest';
import { cleanNamedPlace, cleanSymbolText } from './factbookText';

describe('cleanNamedPlace', () => {
  it('passes a clean value through unchanged', () => {
    expect(cleanNamedPlace('Noshak 7,492 m')).toBe('Noshak 7,492 m');
  });

  it('strips a trailing parenthetical aside', () => {
    expect(cleanNamedPlace('Mount McKinley 6,190 m (highest point in North America)'))
      .toBe('Mount McKinley 6,190 m');
  });

  it('truncates a semicolon-separated run-on clause', () => {
    expect(cleanNamedPlace(
      "Mitspe Shlagim 2,224 m; note - this is the highest named point, the actual highest point is an unnamed dome...",
    )).toBe('Mitspe Shlagim 2,224 m');
  });

  it('returns undefined for an unnamed-elevation entry with no real name', () => {
    expect(cleanNamedPlace('unnamed elevation 675 m; located 2.5 km southeast of the town of Kotopounga'))
      .toBeUndefined();
  });

  it('strips stray HTML tags', () => {
    expect(cleanNamedPlace("Pik Khan-Tengri 7,010 m<br>note - the northern most 7,000 meter peak in the World"))
      .toBe('Pik Khan-Tengri 7,010 m');
  });

  it('decodes HTML entities', () => {
    expect(cleanNamedPlace("Laguna del Carb&oacute;n (located between Puerto San Juli&aacute;n and Comandante Luis Piedra Buena in the province of Santa Cruz) -105 m"))
      .toBe('Laguna del Carbón -105 m');
  });
});

describe('cleanSymbolText', () => {
  it('preserves semicolon-separated multi-symbol lists', () => {
    expect(cleanSymbolText('five-pointed star between the extended horns of a crescent moon; fennec fox'))
      .toBe('five-pointed star between the extended horns of a crescent moon; fennec fox');
  });

  it('preserves parenthetical scientific/alternate names', () => {
    expect(cleanSymbolText('golden wattle tree (Acacia pycnantha), kangaroo, emu'))
      .toBe('golden wattle tree (Acacia pycnantha), kangaroo, emu');
  });

  it('strips HTML tags but keeps the text content', () => {
    expect(cleanSymbolText("a <em>fue </em>(coconut fiber fly whisk that represents wisdom) crossed with a <em>to'oto'o</em> (staff that represents authority)"))
      .toBe("a fue (coconut fiber fly whisk that represents wisdom) crossed with a to'oto'o (staff that represents authority)");
  });
});
