import { Module } from "@nestjs/common";
import { BorrowingsController } from "./borrowings.controller";
import { BorrowingsService } from "./borrowings.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { BorrowingDomainService } from "../domain/services/borrowing.domain-service";

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [BorrowingsController],
  providers: [
    BorrowingsService,
    BorrowingDomainService,
  ],
  exports: [BorrowingsService],
})
export class BorrowingsModule {}
