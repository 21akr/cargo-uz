import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { CARRIERS } from '../../common/status';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterBatchDto {
  @IsString()
  @IsIn(CARRIERS as unknown as string[])
  carrier: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  // No angle brackets / quotes / ampersand — blocks HTML/attribute injection at the edge.
  @Matches(/^[^<>&"']+$/, { message: 'batchNo contains invalid characters' })
  batchNo: string;
}
