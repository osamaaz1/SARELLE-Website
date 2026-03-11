import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DeveloperController],
  providers: [DeveloperService],
})
export class DeveloperModule {}
