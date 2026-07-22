import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InstrumentsService } from './instruments.service';

@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'RF007 — Catálogo de instrumentos (ordem alfabética)' })
  list() {
    return this.instrumentsService.list();
  }
}
