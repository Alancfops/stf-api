import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const INSTRUMENT_SEED = [
  {
    code: 'BERG',
    displayName: 'Escala de Equilíbrio de Berg',
    authorsJson: JSON.stringify(['Berg K.O. et al.']),
    sortHint: 1,
  },
  {
    code: 'KATZ',
    displayName: 'Índice de Katz',
    authorsJson: JSON.stringify(['Katz S. et al., JAMA 1963']),
    sortHint: 2,
  },
  {
    code: 'MEEM',
    displayName: 'Mini Exame do Estado Mental (MEEM)',
    authorsJson: JSON.stringify(['Folstein M.F. et al., 1975']),
    sortHint: 3,
  },
  {
    code: 'TINETTI',
    displayName: 'Escala de Tinetti (POMA)',
    authorsJson: JSON.stringify(['Tinetti M.E., 1986']),
    sortHint: 4,
  },
  {
    code: 'TUG',
    displayName: 'TUG (Timed Up and Go)',
    authorsJson: JSON.stringify(['Podsiadlo D. & Richardson S., 1991']),
    sortHint: 5,
  },
] as const;

export type InstrumentListItem = {
  code: string;
  displayName: string;
  authors: string[];
  sortHint: number;
};

@Injectable()
export class InstrumentsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await Promise.all(
      INSTRUMENT_SEED.map((item) =>
        this.prisma.instrument.upsert({
          where: { code: item.code },
          create: item,
          update: {
            displayName: item.displayName,
            authorsJson: item.authorsJson,
            sortHint: item.sortHint,
          },
        }),
      ),
    );
  }

  async list(): Promise<InstrumentListItem[]> {
    const instruments = await this.prisma.instrument.findMany({
      orderBy: { displayName: 'asc' },
    });

    return instruments.map((item) => ({
      code: item.code,
      displayName: item.displayName,
      authors: JSON.parse(item.authorsJson) as string[],
      sortHint: item.sortHint,
    }));
  }
}
