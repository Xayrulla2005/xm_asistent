import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigureWizardDto } from './dto/configure-wizard.dto';
import { UpdateWizardDto } from './dto/update-wizard.dto';
import { WizardService } from './wizard.service';

@Controller('wizard')
@UseGuards(JwtAuthGuard)
export class WizardController {
  constructor(private readonly wizardService: WizardService) {}

  @Post('configure')
  configure(@Body() dto: ConfigureWizardDto) {
    return this.wizardService.configure(dto);
  }

  @Get(':tenantId')
  findOne(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.wizardService.findByTenant(tenantId);
  }

  @Patch(':tenantId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateWizardDto,
  ) {
    return this.wizardService.update(tenantId, dto);
  }

  @Post('complete/:tenantId')
  complete(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.wizardService.complete(tenantId);
  }
}
