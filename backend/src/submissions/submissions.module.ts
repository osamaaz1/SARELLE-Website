import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuthModule, GatewayModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
