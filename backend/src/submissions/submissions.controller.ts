import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProposePickupDto } from './dto/pickup.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  async create(@Req() req: any, @Body() body: {
    brand: string;
    name: string;
    category: string;
    condition: string;
    color?: string;
    description: string;
    user_photos: string[];
  }) {
    // Any authenticated user can submit — auto-upgrade to seller if needed
    await this.submissionsService.ensureSellerProfile(req.user.id);
    return this.submissionsService.create(req.user.id, body);
  }

  @Get()
  async list(@Req() req: any, @Query('stage') stage?: string) {
    return this.submissionsService.listBySeller(req.user.id, stage);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user.role === 'admin';
    return this.submissionsService.getById(id, req.user.id, isAdmin);
  }

  @Post(':id/accept-price')
  async acceptPrice(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.acceptPrice(id, req.user.id);
  }

  @Post(':id/reject-price')
  async rejectPrice(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.rejectPrice(id, req.user.id);
  }

  @Post(':id/propose-pickup')
  async proposePickup(@Param('id') id: string, @Req() req: any, @Body() body: ProposePickupDto) {
    return this.submissionsService.proposePickup(id, req.user.id, body);
  }

  @Post(':id/accept-admin-time')
  async acceptAdminTime(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.acceptAdminPickupTime(id, req.user.id);
  }

  @Post(':id/counter-pickup')
  async counterPickup(@Param('id') id: string, @Req() req: any, @Body() body: ProposePickupDto) {
    return this.submissionsService.counterPickup(id, req.user.id, body);
  }
}
