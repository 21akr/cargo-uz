import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

// Trim strings; turn "" into undefined so @IsOptional treats blanks as absent.
const trimOrUndef = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? undefined : t;
};

export class AddParcelDto {
  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-_/]*$/, {
    message: 'trackCode: letters, digits and - _ / only',
  })
  trackCode?: string;

  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  cost?: number;
}
