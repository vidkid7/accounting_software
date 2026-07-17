import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';

@Module({
  providers: [CompanyService, BranchService],
  controllers: [CompanyController, BranchController],
  exports: [CompanyService, BranchService],
})
export class CompanyModule {}
