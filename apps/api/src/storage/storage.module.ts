import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigService } from '../config';
import { StorageAdapter } from './storage-adapter.interface';
import { FsStorageAdapter } from './fs-storage.adapter';

@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    const storageAdapterProvider: Provider = {
      provide: StorageAdapter,
      useFactory: (configService: ConfigService) => {
        const storagePath = configService.get('STORAGE_PATH') ?? './storage';
        return new FsStorageAdapter(storagePath);
      },
      inject: [ConfigService],
    };

    return {
      module: StorageModule,
      providers: [storageAdapterProvider],
      exports: [StorageAdapter],
    };
  }
}