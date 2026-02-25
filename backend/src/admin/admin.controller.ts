import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ListingsService } from '../listings/listings.service';
import { OrdersService } from '../orders/orders.service';
import { PayoutsService } from '../payouts/payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly submissionsService: SubmissionsService,
    private readonly listingsService: ListingsService,
    private readonly ordersService: OrdersService,
    private readonly payoutsService: PayoutsService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [stats, pipeline] = await Promise.all([
      this.adminService.getDashboardStats(),
      this.adminService.getPipelineOverview(),
    ]);
    return { stats, pipeline };
  }

  // === Submissions ===
  @Get('submissions')
  async listSubmissions(@Query('stage') stage?: string) {
    const client = require('../supabase/supabase.service');
    // Use submissions service with admin access
    return this.submissionsService.listBySeller('*', stage);
  }

  @Get('submissions/:id')
  async getSubmission(@Param('id') id: string) {
    return this.submissionsService.getById(id, undefined, true);
  }

  @Patch('submissions/:id/review')
  async reviewSubmission(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { action: 'approve' | 'reject'; proposed_price?: number; rejection_reason?: string; admin_notes?: string },
  ) {
    return this.submissionsService.adminReview(id, req.user.id, body.action, body);
  }

  // === Pickups ===
  @Post('pickups')
  async schedulePickup(@Req() req: any, @Body() body: {
    submission_id: string;
    pickup_date: string;
    pickup_time: string;
    pickup_address: string;
    driver_phone: string;
    google_maps_link?: string;
  }) {
    return this.submissionsService.schedulePickup(body.submission_id, req.user.id, body);
  }

  @Patch('pickups/:id/dispatch')
  async dispatchDriver(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.dispatchDriver(id, req.user.id);
  }

  @Patch('pickups/:id/arrived')
  async arrivedAtOffice(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.arrivedAtOffice(id, req.user.id);
  }

  // === QC ===
  @Post('qc-reports')
  async qcReport(@Req() req: any, @Body() body: { submission_id: string; passed: boolean; notes?: string }) {
    return this.submissionsService.qcResult(body.submission_id, req.user.id, body.passed, body.notes);
  }

  // === Listings ===
  @Post('listings')
  async createListing(@Req() req: any, @Body() body: {
    submission_id: string;
    photos: string[];
    description?: string;
    price: number;
    featured?: boolean;
  }) {
    return this.listingsService.createFromSubmission(body.submission_id, req.user.id, body);
  }

  @Patch('listings/:id')
  async updateListing(@Param('id') id: string, @Body() body: { status: string }) {
    return this.listingsService.updateStatus(id, body.status);
  }

  // === Orders ===
  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { status: string; tracking_number?: string; reason?: string },
  ) {
    return this.ordersService.adminUpdateStatus(id, req.user.id, body.status, body);
  }

  // === Payouts ===
  @Get('payouts')
  async listPayouts(@Query('status') status?: string) {
    return this.payoutsService.adminList(status);
  }

  @Post('payouts/:orderId/trigger')
  async triggerPayout(@Param('orderId') orderId: string, @Req() req: any) {
    return this.payoutsService.trigger(orderId, req.user.id);
  }

  @Patch('payouts/:id/status')
  async updatePayoutStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.payoutsService.updateStatus(id, body.status);
  }

  // === Sellers ===
  @Get('sellers')
  async listSellers(@Query('page') page?: string) {
    return this.adminService.listSellers(page ? Number(page) : 1);
  }

  // === Celebrities ===
  @Get('celebrities')
  async listCelebrities() {
    return this.adminService.manageCelebrities();
  }

  @Post('celebrities')
  async createCelebrity(@Body() body: { name: string; bio: string; followers: string; avatar_url?: string; user_id?: string }) {
    return this.adminService.createCelebrity(body);
  }
}
