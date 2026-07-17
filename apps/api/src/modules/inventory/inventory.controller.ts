import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateProductDto,
  CreateWarehouseDto,
  StockAdjustDto,
  StockTransferDto,
  CreateBatchDto,
  CreateStockTakeDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role, ValuationMethod } from '@acc/shared-types';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // Products
  @Post('products')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.inventory.createProduct(user.companyId, dto, user.id);
  }

  @Get('products')
  listProducts(@CurrentUser() user: AuthUser) {
    return this.inventory.listProducts(user.companyId);
  }

  @Get('products/:id')
  getProduct(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.getProduct(user.companyId, id);
  }

  @Put('products/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  updateProduct(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProductDto) {
    return this.inventory.updateProduct(user.companyId, id, dto, user.id);
  }

  @Delete('products/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  deleteProduct(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.deleteProduct(user.companyId, id, user.id);
  }

  // Warehouses
  @Post('warehouses')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  createWarehouse(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.inventory.createWarehouse(user.companyId, dto, user.id);
  }

  @Put('warehouses/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  updateWarehouse(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateWarehouseDto) {
    return this.inventory.updateWarehouse(user.companyId, id, dto, user.id);
  }

  @Delete('warehouses/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  deleteWarehouse(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.deleteWarehouse(user.companyId, id, user.id);
  }

  @Get('warehouses')
  listWarehouses(@CurrentUser() user: AuthUser) {
    return this.inventory.listWarehouses(user.companyId);
  }

  // Stock — static routes MUST be declared before the parameterized one
  @Get('stock/low')
  lowStock(@CurrentUser() user: AuthUser) {
    return this.inventory.getLowStock(user.companyId);
  }

  @Get('stock/:productId')
  getStock(@CurrentUser() user: AuthUser, @Param('productId', ParseUUIDPipe) productId: string, @Query('warehouseId') warehouseId?: string) {
    return this.inventory.getStockLevel(productId, warehouseId);
  }

  @Post('stock/adjust')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  adjust(@CurrentUser() user: AuthUser, @Body() dto: StockAdjustDto, @Tx() tx: TransactionClient) {
    return this.inventory.adjustStock(user.companyId, dto, user.id, tx);
  }

  @Post('stock/transfer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  transfer(@CurrentUser() user: AuthUser, @Body() dto: StockTransferDto, @Tx() tx: TransactionClient) {
    return this.inventory.transferStock(user.companyId, dto, user.id, tx);
  }

  // ---------- Phase 2: advanced inventory ----------
  @Post('batches')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  addBatch(@CurrentUser() user: AuthUser, @Body() dto: CreateBatchDto, @Tx() tx: TransactionClient) {
    return this.inventory.addBatch(user.companyId, dto, user.id, tx);
  }

  @Get('batches')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF, Role.AUDITOR)
  listBatches(@CurrentUser() user: AuthUser, @Query('productId') productId?: string) {
    return this.inventory.listBatches(user.companyId, productId);
  }

  @Get('batches/expiring')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF, Role.AUDITOR)
  expiring(@CurrentUser() user: AuthUser, @Query('withinDays') withinDays = '0') {
    return this.inventory.expiredOrNear(user.companyId, Number(withinDays));
  }

  @Get('valuation')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  valuation(@CurrentUser() user: AuthUser, @Query('method') method = 'WEIGHTED_AVG') {
    return this.inventory.valuation(user.companyId, method as ValuationMethod);
  }

  @Post('stock-takes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  createStockTake(@CurrentUser() user: AuthUser, @Body() dto: CreateStockTakeDto, @Tx() tx: TransactionClient) {
    return this.inventory.createStockTake(user.companyId, dto, user.id, tx);
  }

  @Post('stock-takes/:id/complete')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  completeStockTake(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Tx() tx: TransactionClient) {
    return this.inventory.completeStockTake(user.companyId, id, user.id, tx);
  }

  @Get('stock-takes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF, Role.AUDITOR)
  listStockTakes(@CurrentUser() user: AuthUser) {
    return this.inventory.listStockTakes(user.companyId);
  }
}
