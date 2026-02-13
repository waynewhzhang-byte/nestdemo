import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaBookRepository } from "./repositories/prisma-book.repository";
import { PrismaBorrowingRepository } from "./repositories/prisma-borrowing.repository";
import { PrismaUserRepository } from "./repositories/prisma-user.repository";
import { PrismaFineRepository } from "./repositories/prisma-fine.repository";
import { PrismaReservationRepository } from "./repositories/prisma-reservation.repository";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
    PrismaFineRepository,
    PrismaReservationRepository,
  ],
  exports: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
    PrismaFineRepository,
    PrismaReservationRepository,
  ],
})
export class InfrastructureModule {}
