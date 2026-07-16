import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class RequestTrackingMiddleware implements NestMiddleware {
  constructor(private readonly analytics: AnalyticsService) {}

  use(_req: Request, res: Response, next: NextFunction): void {
    this.analytics.trackRequest();
    this.analytics.incrementConnections();
    res.on('finish', () => this.analytics.decrementConnections());
    next();
  }
}
