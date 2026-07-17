import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  twoFactorToken?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  companyName: string;

  @IsString()
  companyAddress: string;

  @IsString()
  companyTaxId: string;
}

export class EnableTwoFactorDto {
  @IsString()
  token: string;
}
