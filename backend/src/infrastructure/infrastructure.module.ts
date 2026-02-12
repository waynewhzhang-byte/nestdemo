import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaBookRepository } from './repositories/prisma-book.repository';
import { PrismaBorrowingRepository } from './repositories/prisma-borrowing.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
  ],
  exports: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
  ],
})
export class InfrastructureModule {}
