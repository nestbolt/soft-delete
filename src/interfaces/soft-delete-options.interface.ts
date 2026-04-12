export interface SoftDeleteModuleOptions {
  /** Column name for the deleted_at timestamp. Default: 'deleted_at' */
  columnName?: string;
}

export interface SoftDeleteAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<SoftDeleteModuleOptions> | SoftDeleteModuleOptions;
}
