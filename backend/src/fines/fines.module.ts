import { Module } from '@nestjs/common';
import { FinesController } from './fines.controller';
import { FinesService } from './fines.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinesController],
  providers: [FinesService],
  exports: [FinesService],
})
export class FinesModule {}
