import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaBookRepository } from "./repositories/prisma-book.repository";
import { PrismaBorrowingRepository } from "./repositories/prisma-borrowing.repository";
import { PrismaUserRepository } from "./repositories/prisma-user.repository";
import { PrismaFineRepository } from "./repositories/prisma-fine.repository";
import { PrismaReservationRepository } from "./repositories/prisma-reservation.repository";
import {
  BOOK_REPOSITORY,
  BORROWING_REPOSITORY,
  USER_REPOSITORY,
  FINE_REPOSITORY,
  RESERVATION_REPOSITORY,
} from "../domain/repositories/tokens";

const repositoryProviders = [
  { provide: BOOK_REPOSITORY, useClass: PrismaBookRepository },
  { provide: BORROWING_REPOSITORY, useClass: PrismaBorrowingRepository },
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: FINE_REPOSITORY, useClass: PrismaFineRepository },
  { provide: RESERVATION_REPOSITORY, useClass: PrismaReservationRepository },
];

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
    PrismaFineRepository,
    PrismaReservationRepository,
    ...repositoryProviders,
  ],
  exports: [
    PrismaBookRepository,
    PrismaBorrowingRepository,
    PrismaUserRepository,
    PrismaFineRepository,
    PrismaReservationRepository,
    ...repositoryProviders,
  ],
})
export class InfrastructureModule {}
