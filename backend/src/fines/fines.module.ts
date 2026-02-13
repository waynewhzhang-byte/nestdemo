import { Module } from "@nestjs/common";
import { FinesController } from "./fines.controller";
import { FinesService } from "./fines.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { FineDomainService } from "../domain/services/fine.domain-service";

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [FinesController],
  providers: [FinesService, FineDomainService],
  exports: [FinesService],
})
export class FinesModule {}
