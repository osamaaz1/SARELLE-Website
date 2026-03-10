import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ListingsModule } from '../listings/listings.module';
import { OrdersModule } from '../orders/orders.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BidsModule } from '../bids/bids.module';

@Module({
  imports: [AuthModule, SubmissionsModule, ListingsModule, OrdersModule, PayoutsModule, NotificationsModule, BidsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
