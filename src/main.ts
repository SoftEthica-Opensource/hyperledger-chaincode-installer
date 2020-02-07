import * as dotenv from 'dotenv';
import { ApplicationModule } from './application.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {

  dotenv.config();

  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3000);
}

bootstrap();
