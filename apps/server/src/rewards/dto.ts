import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageUrl?: string;

  @IsInt()
  @IsPositive()
  @Max(1000000)
  pointsCost: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsString()
  childId?: string;
}

export class UpdateRewardDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  pointsCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
