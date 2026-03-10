import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { BidsModule } from './bids/bids.module';
import { GatewayModule } from './gateway/gateway.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';

@Module({
  controllers: [AppController],
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    SupabaseModule,
    EmailModule,
    AuthModule,
    UsersModule,
    SubmissionsModule,
    ListingsModule,
    OffersModule,
    BidsModule,
    OrdersModule,
    PayoutsModule,
    NotificationsModule,
    AdminModule,
    GatewayModule,
    StorageModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
