import { Body, Controller, Post } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { SimulatePostDto } from './dto/simulate-post.dto';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  // NOTE: dev/admin utility to exercise the pipeline without MTProto.
  // Protect with an admin guard or disable before production.
  @Post('simulate')
  simulate(@Body() dto: SimulatePostDto) {
    return this.ingest.simulate(dto.carrier, dto.text);
  }
}
