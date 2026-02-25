import { Controller, Get, Patch, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.listByUser(
      req.user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.markRead(id, req.user.id);
    return { success: true };
  }

  @Post('read-all')
  async readAll(@Req() req: any) {
    await this.notificationsService.markAllRead(req.user.id);
    return { success: true };
  }
}
