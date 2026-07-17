import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  IsInt,
  IsArray,
} from 'class-validator';
import { ValuationMethod, TxType } from '@acc/shared-types';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsString()
  unit: string;

  @IsString()
  taxCode: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @IsEnum(ValuationMethod)
  valuation?: ValuationMethod;
}

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class StockAdjustDto {
  @IsString()
  productId: string;

  @IsString()
  warehouseId: string;

  @IsNumber()
  quantity: number; // signed: + to add, - to remove

  @IsString()
  reason: string; // damage, theft, count_correction
}

export class StockTransferDto {
  @IsString()
  productId: string;

  @IsString()
  fromWarehouseId: string;

  @IsString()
  toWarehouseId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

// ---------- Phase 2: advanced inventory ----------

export class CreateBatchDto {
  @IsString()
  productId: string;

  @IsString()
  warehouseId: string;

  @IsString()
  batchNo: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsOptional()
  expiryDate?: string;
}

export class StockTakeLineDto {
  @IsString()
  productId: string;

  @IsString()
  warehouseId: string;

  @IsNumber()
  countedQty: number;
}

export class CreateStockTakeDto {
  @IsArray()
  lines: StockTakeLineDto[];
}
