import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';

@Controller('developer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('developer')
@UseInterceptors(AuditLogInterceptor)
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Get('dashboard')
  async dashboard() {
    return this.developerService.getDashboardStats();
  }

  @Get('users')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('disabled') disabled?: string,
  ) {
    return this.developerService.getUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role,
      search,
      disabled,
    });
  }

  @Patch('users/:id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Req() req: any,
  ) {
    return this.developerService.changeUserRole(id, body.role, req.user.id);
  }

  @Patch('users/:id/disable')
  async toggleDisable(
    @Param('id') id: string,
    @Body() body: { disable: boolean },
    @Req() req: any,
  ) {
    return this.developerService.toggleUserDisable(id, body.disable, req.user.id);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entity_type') entity_type?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.developerService.getAuditLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      entity_type,
      action,
      from,
      to,
    });
  }

  @Get('error-logs')
  async getErrorLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('error_type') error_type?: string,
    @Query('endpoint') endpoint?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.developerService.getErrorLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      error_type,
      endpoint,
      from,
      to,
    });
  }

  @Get('error-logs/:id')
  async getErrorLog(@Param('id') id: string) {
    return this.developerService.getErrorLog(id);
  }

  @Get('sessions')
  async getActiveSessions() {
    return this.developerService.getActiveSessions();
  }

  @Post('sessions/:userId/force-logout')
  async forceLogout(@Param('userId') userId: string, @Req() req: any) {
    return this.developerService.forceLogout(userId, req.user.id);
  }

  @Get('api-overview')
  async getApiOverview() {
    return this.developerService.getApiOverview();
  }
}
