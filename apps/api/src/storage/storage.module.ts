import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '../config';
import { StorageAdapter } from './storage-adapter.interface';
import { FsStorageAdapter } from './fs-storage.adapter';

const storageAdapterProvider: Provider = {
  provide: StorageAdapter,
  useFactory: (configService: ConfigService) => {
    const storagePath = configService.get('STORAGE_PATH') ?? './storage';
    return new FsStorageAdapter(storagePath);
  },
  inject: [ConfigService],
};

@Module({
  providers: [storageAdapterProvider],
  exports: [StorageAdapter],
})
export class StorageModule {
  // Kept for backward compatibility with `StorageModule.forRoot()` call sites;
  // the adapter is now registered statically so bare `StorageModule` imports work.
  static forRoot(): DynamicModule {
    return { module: StorageModule };
  }
}
