import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { BatchPostParser } from './parser/batch-post.parser';

@Module({
  controllers: [IngestController],
  providers: [IngestService, BatchPostParser],
  exports: [IngestService],
})
export class IngestModule {}
