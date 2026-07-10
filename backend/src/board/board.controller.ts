import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BoardService } from './board.service';

// Public, read-only. No user auth: this is shared batch status, not personal data.
@ApiTags('board')
@Controller('board')
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get('latest')
  latest(@Query('limit') limit?: string) {
    const n = Number(limit);
    return this.board.latest(Number.isFinite(n) && n > 0 ? n : 15);
  }
}
