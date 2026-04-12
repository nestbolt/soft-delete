import { DynamicModule, Module, type Provider } from "@nestjs/common";
import { SOFT_DELETE_OPTIONS } from "./soft-delete.constants";
import { SoftDeleteService } from "./soft-delete.service";
import { SoftDeleteSubscriber } from "./soft-delete.subscriber";
import type {
  SoftDeleteModuleOptions,
  SoftDeleteAsyncOptions,
} from "./interfaces/soft-delete-options.interface";

@Module({})
export class SoftDeleteModule {
  static forRoot(options: SoftDeleteModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      { provide: SOFT_DELETE_OPTIONS, useValue: options },
      SoftDeleteService,
      SoftDeleteSubscriber,
    ];

    return {
      module: SoftDeleteModule,
      global: true,
      providers,
      exports: [SoftDeleteService, SOFT_DELETE_OPTIONS],
    };
  }

  static forRootAsync(asyncOptions: SoftDeleteAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: SOFT_DELETE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject ?? [],
      },
      SoftDeleteService,
      SoftDeleteSubscriber,
    ];

    return {
      module: SoftDeleteModule,
      global: true,
      imports: [...(asyncOptions.imports ?? [])],
      providers,
      exports: [SoftDeleteService, SOFT_DELETE_OPTIONS],
    };
  }
}
