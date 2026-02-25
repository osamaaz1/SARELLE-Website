import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async create(@Req() req: any, @Body() body: {
    brand: string;
    name: string;
    category: string;
    condition: string;
    color?: string;
    description: string;
    user_photos: string[];
  }) {
    return this.submissionsService.create(req.user.id, body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async list(@Req() req: any, @Query('stage') stage?: string) {
    return this.submissionsService.listBySeller(req.user.id, stage);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user.role === 'admin';
    return this.submissionsService.getById(id, req.user.id, isAdmin);
  }

  @Post(':id/accept-price')
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async acceptPrice(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.acceptPrice(id, req.user.id);
  }

  @Post(':id/reject-price')
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async rejectPrice(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.rejectPrice(id, req.user.id);
  }
}
