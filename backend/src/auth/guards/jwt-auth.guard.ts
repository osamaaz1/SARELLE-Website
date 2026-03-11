import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const token = authHeader.split(' ')[1];
    try {
      const user = await this.authService.validateToken(token);
      const profile = await this.authService.getProfile(user.id);
      if (profile.disabled_at) {
        throw new UnauthorizedException('Account is disabled');
      }
      request.user = { ...user, ...profile };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
