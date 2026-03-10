import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  async create(@Req() req: any, @Body() body: { listing_id: string; amount: number; idempotency_key: string }) {
    return this.offersService.create(req.user.id, body);
  }

  @Get('sent')
  async sent(@Req() req: any) {
    return this.offersService.getSent(req.user.id);
  }

  @Get('received')
  async received(@Req() req: any) {
    return this.offersService.getReceived(req.user.id);
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.offersService.accept(id, req.user.id);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Req() req: any) {
    return this.offersService.reject(id, req.user.id);
  }

  @Post(':id/withdraw')
  async withdraw(@Param('id') id: string, @Req() req: any) {
    return this.offersService.withdraw(id, req.user.id);
  }
}
