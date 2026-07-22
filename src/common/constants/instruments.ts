export const INSTRUMENT_CODES = ['TUG', 'KATZ', 'BERG', 'TINETTI', 'MEEM'] as const;

export type InstrumentCode = (typeof INSTRUMENT_CODES)[number];

export const IMPLEMENTED_INSTRUMENT_CODES = INSTRUMENT_CODES;

export type ImplementedInstrumentCode = InstrumentCode;

export function normalizeInstrumentCode(value: string): InstrumentCode | null {
  const upper = value.trim().toUpperCase();
  return INSTRUMENT_CODES.includes(upper as InstrumentCode) ? (upper as InstrumentCode) : null;
}

export function isImplementedInstrumentCode(code: InstrumentCode): code is ImplementedInstrumentCode {
  return (IMPLEMENTED_INSTRUMENT_CODES as readonly string[]).includes(code);
}
