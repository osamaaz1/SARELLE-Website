import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ListingsModule } from './listings/listings.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  controllers: [AppController],
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    SupabaseModule,
    AuthModule,
    UsersModule,
    SubmissionsModule,
    ListingsModule,
    OffersModule,
    OrdersModule,
    PayoutsModule,
    NotificationsModule,
    AdminModule,
    GatewayModule,
  ],
})
export class AppModule {}
