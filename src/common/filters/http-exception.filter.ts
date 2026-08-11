import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      response.status(status).json(exceptionResponse);
      return;
    }

    response.status(status).json({
      statusCode: status,
      message: exceptionResponse,
    });
  }
}

@Catch()
export class FallbackExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const payloadTooLarge =
      typeof error === 'object' &&
      error !== null &&
      (('type' in error && (error as { type?: string }).type === 'entity.too.large') ||
        ('status' in error && (error as { status?: number }).status === 413) ||
        (error instanceof Error && /request entity too large/i.test(error.message)));

    if (payloadTooLarge) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Imagem muito grande. Use uma foto menor (máx. ~250 KB).',
      });
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- diagnóstico em dev (evita 500 opaco)
      console.error('[FallbackExceptionFilter]', error);
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
    });
  }
}
