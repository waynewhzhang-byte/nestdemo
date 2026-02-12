import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BorrowingsModule } from './borrowings/borrowings.module';
import { BooksModule } from './books/books.module';
import { ReservationsModule } from './reservations/reservations.module';
import { FinesModule } from './fines/fines.module';
import { StatisticsModule } from './statistics/statistics.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    BooksModule,
    BorrowingsModule,
    ReservationsModule,
    FinesModule,
    StatisticsModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
