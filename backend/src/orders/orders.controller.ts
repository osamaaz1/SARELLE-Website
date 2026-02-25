import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Req() req: any, @Body() body: {
    listing_id: string;
    shipping_address: Record<string, any>;
    idempotency_key: string;
    offer_id?: string;
  }) {
    return this.ordersService.create(req.user.id, body);
  }

  @Get()
  async list(@Req() req: any) {
    return this.ordersService.listByUser(req.user.id, req.user.role);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getById(id, req.user.id);
  }
}
