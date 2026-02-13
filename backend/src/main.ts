import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const apiPrefix = process.env.API_PREFIX || "api/v1";
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const isProduction = process.env.NODE_ENV === "production";
  const swaggerEnabled = process.env.SWAGGER_ENABLED === "true";
  if (!isProduction || swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("School Library Management System API")
      .setDescription("API documentation for the Library Management System")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
    logger.log(`📚 Swagger docs: http://localhost:${process.env.PORT || 3000}/docs`);
  } else {
    logger.log("📚 Swagger disabled in production");
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`🏥 Health check: http://localhost:${port}/${apiPrefix}/health`);
}

bootstrap();
