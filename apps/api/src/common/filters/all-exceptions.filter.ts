import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BugsService } from '../../modules/bugs/bugs.service';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly bugsService: BugsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const req      = ctx.getRequest<Request & { user?: { id?: string; email?: string } }>();
    const res      = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? String(exception.message)
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const stack =
      exception instanceof Error ? exception.stack : undefined;

    // Only auto-report unexpected server errors (not 404, 401, 400, 422, etc.)
    if (status >= 500) {
      void this.bugsService.createFromException({
        tenantId:   req.headers['x-tenant-id'] as string | undefined,
        userEmail:  req.user?.email,
        method:     req.method,
        url:        req.url,
        statusCode: status,
        error:      message,
        stack,
      });
    }

    res.status(status).json({
      statusCode: status,
      message,
      timestamp:  new Date().toISOString(),
      path:       req.url,
    });
  }
}
