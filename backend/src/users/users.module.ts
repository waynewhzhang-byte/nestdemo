import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { UserDomainService } from "../domain/services/user.domain-service";

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [UsersController],
  providers: [UsersService, UserDomainService],
  exports: [UsersService],
})
export class UsersModule {}
