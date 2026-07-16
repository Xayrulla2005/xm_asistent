import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';

@Controller('portal')
export class ClientPortalPublicController {
  constructor(private readonly service: ClientPortalService) {}

  @Get(':slug')
  getPublicPage(@Param('slug') slug: string) {
    return this.service.getPublicPage(slug);
  }

  @Post(':slug/login')
  login(
    @Param('slug') slug: string,
    @Body() body: { phone: string; password: string },
  ) {
    return this.service.customerLogin(slug, body.phone, body.password);
  }

  @Get(':slug/services')
  getServiceCatalog(@Param('slug') slug: string) {
    return this.service.getPublicServiceCatalog(slug);
  }

  @Get(':slug/gym-plans')
  getGymPlans(@Param('slug') slug: string) {
    return this.service.getGymPublicPlans(slug);
  }
}
