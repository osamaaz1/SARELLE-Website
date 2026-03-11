import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { RespondToPickupDto } from '../submissions/dto/pickup.dto';
import { ListingsService } from '../listings/listings.service';
import { OrdersService } from '../orders/orders.service';
import { PayoutsService } from '../payouts/payouts.service';
import { BidsService } from '../bids/bids.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { Audit } from '../decorators/audit.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@UseInterceptors(AuditLogInterceptor)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly submissionsService: SubmissionsService,
    private readonly listingsService: ListingsService,
    private readonly ordersService: OrdersService,
    private readonly payoutsService: PayoutsService,
    private readonly bidsService: BidsService,
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
    return this.submissionsService.listAll(stage);
  }

  @Get('submissions/:id')
  async getSubmission(@Param('id') id: string) {
    return this.submissionsService.getById(id, undefined, true);
  }

  @Audit('submission', 'admin_review')
  @Patch('submissions/:id/review')
  async reviewSubmission(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { action: 'approve' | 'reject'; proposed_price?: number; rejection_reason?: string; admin_notes?: string },
  ) {
    return this.submissionsService.adminReview(id, req.user.id, body.action, body);
  }

  // === Pickups ===
  @Audit('submission', 'pickup_respond')
  @Post('pickups/:id/respond')
  async respondToPickup(@Param('id') id: string, @Req() req: any, @Body() body: RespondToPickupDto) {
    return this.submissionsService.respondToPickup(id, req.user.id, body.action, body);
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
  @Audit('submission', 'qc_report')
  @Post('qc-reports')
  async qcReport(@Req() req: any, @Body() body: { submission_id: string; passed: boolean; notes?: string }) {
    return this.submissionsService.qcResult(body.submission_id, req.user.id, body.passed, body.notes);
  }

  // === Photoshoot ===
  @Patch('submissions/:id/photoshoot')
  async photoshootDone(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { pro_photos?: string[]; pro_description?: string },
  ) {
    return this.submissionsService.photoshootDone(id, req.user.id, body.pro_photos || [], body.pro_description);
  }

  // === Listings ===
  @Audit('listing', 'create')
  @Post('listings')
  async createListing(@Req() req: any, @Body() body: {
    submission_id: string;
    photos: string[];
    description?: string;
    price: number;
    original_price?: number | null;
    featured?: boolean;
  }) {
    return this.listingsService.createFromSubmission(body.submission_id, req.user.id, body);
  }

  @Patch('listings/:id')
  async updateListing(@Param('id') id: string, @Body() body: { status: string }) {
    return this.listingsService.updateStatus(id, body.status);
  }

  // === Orders ===
  @Audit('order', 'status_update')
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

  @Audit('payout', 'status_update')
  @Patch('payouts/:id/status')
  async updatePayoutStatus(@Param('id') id: string, @Req() req: any, @Body() body: { status: string }) {
    return this.payoutsService.updateStatus(id, body.status, req.user.id);
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

  // === Auctions ===
  @Post('auctions')
  async createAuction(@Body() body: {
    listing_id: string;
    starting_price: number;
    starts_at: string;
    ends_at: string;
    reserve_price?: number;
  }) {
    return this.bidsService.createAuction(body);
  }

  @Get('auctions')
  async listAuctions() {
    return this.bidsService.adminListAuctions();
  }

  @Post('auctions/:id/end')
  async endAuction(@Param('id') id: string) {
    return this.bidsService.endAuction(id);
  }
}
