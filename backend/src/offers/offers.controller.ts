import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('buyer')
  async create(@Req() req: any, @Body() body: { listing_id: string; amount: number; idempotency_key: string }) {
    return this.offersService.create(req.user.id, body);
  }

  @Get('sent')
  async sent(@Req() req: any) {
    return this.offersService.getSent(req.user.id);
  }

  @Get('received')
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async received(@Req() req: any) {
    return this.offersService.getReceived(req.user.id);
  }

  @Patch(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.offersService.accept(id, req.user.id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('seller', 'vip_seller')
  async reject(@Param('id') id: string, @Req() req: any) {
    return this.offersService.reject(id, req.user.id);
  }

  @Post(':id/withdraw')
  async withdraw(@Param('id') id: string, @Req() req: any) {
    return this.offersService.withdraw(id, req.user.id);
  }
}
