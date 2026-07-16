import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateProductDto) {
    dto.tenantId = user.tenantId;
    return this.productsService.create(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @CurrentUser() user: { tenantId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.importExcel(user.tenantId, file.buffer);
  }

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.productsService.findAll(user.tenantId);
  }

  @Get('export')
  async exportExcel(
    @CurrentUser() user: { tenantId: string },
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.productsService.exportExcel(user.tenantId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('categories')
  getCategories(@CurrentUser() user: { tenantId: string }) {
    return this.productsService.getCategories(user.tenantId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(id, user.tenantId);
  }
}
