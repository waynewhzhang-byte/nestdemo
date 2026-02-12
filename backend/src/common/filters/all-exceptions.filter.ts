import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

interface PrismaError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const err = error as Record<string, unknown>;
  return (
    'code' in err &&
    typeof err.code === 'string' &&
    err.code.toString().startsWith('P')
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || error;
        details = responseObj.details as Record<string, unknown>;
      }
    } else if (isPrismaError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          if (exception.meta?.target) {
            const target = exception.meta.target as string[];
            message = `Duplicate value for field: ${target.join(', ')}`;
          }
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed';
          break;
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid relation';
          break;
        case 'P2001':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid input data';
          break;
        default:
          message = 'Database operation failed';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details) {
      errorResponse.details = details;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
