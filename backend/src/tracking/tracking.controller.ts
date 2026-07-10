import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { TelegramAuthGuard } from '../common/telegram-auth.guard';
import { TgUser } from '../common/tg-user.decorator';
import type { TmaUser } from '../common/telegram-auth.util';
import { TrackingService } from './tracking.service';
import { RegisterBatchDto } from './dto/register-batch.dto';
import { AddParcelDto } from './dto/add-parcel.dto';

@ApiTags('tracking')
@ApiSecurity('tma')
@UseGuards(TelegramAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post('batches')
  register(@TgUser() user: TmaUser, @Body() dto: RegisterBatchDto) {
    return this.tracking.registerBatch(user.id, dto.carrier, dto.batchNo);
  }

  @Get('batches')
  list(@TgUser() user: TmaUser) {
    return this.tracking.listBatches(user.id);
  }

  @Delete('batches/:id')
  removeBatch(@TgUser() user: TmaUser, @Param('id') id: string) {
    return this.tracking.deleteBatch(user.id, id);
  }

  @Post('batches/:id/parcels')
  addParcel(@TgUser() user: TmaUser, @Param('id') id: string, @Body() dto: AddParcelDto) {
    return this.tracking.addParcel(user.id, id, dto);
  }

  @Delete('parcels/:id')
  removeParcel(@TgUser() user: TmaUser, @Param('id') id: string) {
    return this.tracking.deleteParcel(user.id, id);
  }
}
