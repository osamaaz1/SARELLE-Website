import { IsEmail, IsString, MinLength, IsIn, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  password: string;

  @IsOptional()
  @IsIn(['buyer', 'seller'])
  role?: 'buyer' | 'seller' = 'buyer';

  @IsString()
  @MinLength(2)
  displayName: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
