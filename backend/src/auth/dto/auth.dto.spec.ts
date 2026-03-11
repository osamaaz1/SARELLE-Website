import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto, LoginDto } from './auth.dto';

describe('Auth DTOs', () => {
  describe('RegisterDto', () => {
    const validData = {
      email: 'user@example.com',
      password: 'Password1',
      role: 'buyer',
      displayName: 'Test User',
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToInstance(RegisterDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when email is invalid', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        email: 'not-an-email',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError!.constraints).toHaveProperty('isEmail');
    });

    it('should fail when password is too short', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'Ab1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError!.constraints).toHaveProperty('minLength');
    });

    it('should fail when password is missing an uppercase letter', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'password1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError!.constraints).toHaveProperty('matches');
    });

    it('should fail when password is missing a digit', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'Passwordx',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError!.constraints).toHaveProperty('matches');
    });

    it('should fail when role is not buyer or seller', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        role: 'admin',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const roleError = errors.find((e) => e.property === 'role');
      expect(roleError).toBeDefined();
      expect(roleError!.constraints).toHaveProperty('isIn');
    });

    it('should fail when displayName is too short', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        displayName: 'A',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const nameError = errors.find((e) => e.property === 'displayName');
      expect(nameError).toBeDefined();
      expect(nameError!.constraints).toHaveProperty('minLength');
    });
  });

  describe('LoginDto', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'user@example.com',
        password: 'anyPassword',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
