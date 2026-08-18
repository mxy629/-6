import { IsOptional, IsString, IsArray, IsUrl, MaxLength } from 'class-validator';

export class SubmitTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  textProof?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class RejectTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
