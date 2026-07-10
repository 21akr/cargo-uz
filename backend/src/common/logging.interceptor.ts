import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Logs one line per request: METHOD path status +duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const url: string = req.originalUrl || req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.write(context, method, url, start),
        error: (err) => this.write(context, method, url, start, err),
      }),
    );
  }

  private write(context: ExecutionContext, method: string, url: string, start: number, err?: any) {
    const res = context.switchToHttp().getResponse();
    const status: number = err?.status ?? res.statusCode ?? 0;
    const line = `${method} ${url} ${status} +${Date.now() - start}ms`;
    if (status >= 500) this.logger.error(line);
    else if (status >= 400) this.logger.warn(line);
    else this.logger.log(line);
  }
}
