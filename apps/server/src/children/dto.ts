import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  nickname: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(32)
  loginName: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN 必须是 4-6 位数字' })
  pin: string;
}

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;
}

export class ResetPinDto {
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN 必须是 4-6 位数字' })
  pin: string;
}

export class SetGoalDto {
  @IsString()
  rewardId: string;
}
