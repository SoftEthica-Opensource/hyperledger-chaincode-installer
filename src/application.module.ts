import { Module } from '@nestjs/common';
import { ChainCodeController } from './chainCode.controller';

@Module({
  imports: [],
  controllers: [ChainCodeController],
  providers: [],
})
export class ApplicationModule {
}
