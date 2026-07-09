import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CARRIERS } from '../../common/status';

export class RegisterBatchDto {
  @IsString()
  @IsIn(CARRIERS as unknown as string[])
  carrier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  batchNo: string;
}
