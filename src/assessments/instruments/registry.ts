import type { ImplementedInstrumentCode } from '../../common/constants/instruments';
import { bergHandler } from './berg';
import { katzHandler } from './katz';
import { meemHandler } from './meem';
import { tinettiHandler } from './tinetti';
import { tugHandler } from './tug';
import type { InstrumentHandler } from './types';

const HANDLERS: Record<ImplementedInstrumentCode, InstrumentHandler> = {
  TUG: tugHandler,
  KATZ: katzHandler,
  BERG: bergHandler,
  TINETTI: tinettiHandler,
  MEEM: meemHandler,
};

export function getInstrumentHandler(code: ImplementedInstrumentCode): InstrumentHandler {
  return HANDLERS[code];
}

export { InstrumentPayloadError } from './types';
