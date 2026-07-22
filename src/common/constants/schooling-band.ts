export const SCHOOLING_BAND_VALUES = [
  'analfabeto',
  '1_4_anos',
  '5_8_anos',
  '9_11_anos',
  'mais_11_anos',
] as const;

export type SchoolingBand = (typeof SCHOOLING_BAND_VALUES)[number];
