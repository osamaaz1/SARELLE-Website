import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() body: { display_name?: string; phone?: string; avatar_url?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get(':id/closet')
  async getCloset(@Param('id') id: string) {
    return this.usersService.getSellerCloset(id);
  }
}
