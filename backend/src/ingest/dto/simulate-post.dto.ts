import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { CARRIERS } from '../../common/status';

export class SimulatePostDto {
  @IsString()
  @IsIn(CARRIERS as unknown as string[])
  carrier: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
