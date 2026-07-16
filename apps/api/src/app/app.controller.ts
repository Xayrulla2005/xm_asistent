import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  health() {
    const used = process.memoryUsage();
    return {
      status:    'ok',
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
      memory: {
        heapUsedMB:  Math.round(used.heapUsed  / 1024 / 1024),
        heapTotalMB: Math.round(used.heapTotal / 1024 / 1024),
        rssMB:       Math.round(used.rss       / 1024 / 1024),
      },
    };
  }
}
