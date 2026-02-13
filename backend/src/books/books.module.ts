import { Module } from "@nestjs/common";
import { BooksController } from "./books.controller";
import { BooksService } from "./books.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { BookDomainService } from "../domain/services/book.domain-service";

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [BooksController],
  providers: [BooksService, BookDomainService],
  exports: [BooksService],
})
export class BooksModule {}
