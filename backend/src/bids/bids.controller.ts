import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BidsService } from './bids.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  // Public: Get auction data for a listing (omits reserve_price)
  @Get('auction/:listingId')
  async getAuction(@Param('listingId') listingId: string) {
    return this.bidsService.getAuctionByListing(listingId);
  }

  // Public: Bid history (anonymized, no max_amount)
  @Get('auction/:auctionId/history')
  async getHistory(@Param('auctionId') auctionId: string) {
    return this.bidsService.getBidHistory(auctionId);
  }

  // Auth: Place a proxy bid (any logged-in user)
  @Post()
  @UseGuards(JwtAuthGuard)
  async placeBid(@Req() req: any, @Body() body: { auction_id: string; max_amount: number }) {
    return this.bidsService.placeBid(body.auction_id, req.user.id, body.max_amount);
  }

  // Auth: User's bids across all auctions (includes their max_amount)
  @Get('my-bids')
  @UseGuards(JwtAuthGuard)
  async myBids(@Req() req: any) {
    return this.bidsService.getMyBids(req.user.id);
  }
}
