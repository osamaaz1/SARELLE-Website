import { Module } from '@nestjs/common';
import { WimcGateway } from './wimc.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [WimcGateway],
  exports: [WimcGateway],
})
export class GatewayModule {}
