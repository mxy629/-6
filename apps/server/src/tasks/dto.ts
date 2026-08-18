import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  Min,
  Max,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @IsPositive()
  @Max(100000)
  rewardPoints: number;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsString()
  repeatType?: string; // NONE | DAILY | WEEKLY

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '截止时间格式应为 HH:mm' })
  deadlineTime?: string;

  @IsOptional()
  @IsBoolean()
  requireTextProof?: boolean;

  @IsOptional()
  @IsBoolean()
  requireImageProof?: boolean;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(100000)
  rewardPoints?: number;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '截止时间格式应为 HH:mm' })
  deadlineTime?: string;

  @IsOptional()
  @IsBoolean()
  requireTextProof?: boolean;

  @IsOptional()
  @IsBoolean()
  requireImageProof?: boolean;
}
