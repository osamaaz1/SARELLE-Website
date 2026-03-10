import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  async browse(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('condition') condition?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.browse({
      search, category, brand, condition,
      minPrice: minPrice ? Math.max(Number(minPrice) || 0, 0) : undefined,
      maxPrice: maxPrice ? Math.max(Number(maxPrice) || 0, 0) : undefined,
      sort,
      page: Math.max(Number(page) || 1, 1),
      limit: Math.min(Math.max(Number(limit) || 20, 1), 100),
    });
  }

  @Get('featured')
  async featured() {
    return this.listingsService.getFeatured();
  }

  @Get('celebrities')
  async celebrities() {
    return this.listingsService.getCelebrityListings();
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  async saved(@Req() req: any) {
    return this.listingsService.getSaved(req.user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.listingsService.getById(id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async toggleSave(@Param('id') id: string, @Req() req: any) {
    return this.listingsService.toggleSave(req.user.id, id);
  }
}
