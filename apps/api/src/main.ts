import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppModule } from './app.module'
import { ConfigService } from './config/config.service'
import { seedCatalog } from './catalog/catalog.seed'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const dataSource = app.get(DataSource)
  await seedCatalog(dataSource)

  const port = configService.get('PORT')
  await app.listen(port)
  console.log(`API running on http://localhost:${port}`)
}

bootstrap()