import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { ReservationDomainService } from "../domain/services/reservation.domain-service";

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationDomainService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
