import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.payoutsService.listBySeller(req.user.id);
  }
}
