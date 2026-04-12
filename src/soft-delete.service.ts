import "reflect-metadata";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { DataSource, ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { SOFT_DELETE_OPTIONS, SOFT_DELETABLE_METADATA_KEY } from "./soft-delete.constants";
import { SOFT_DELETE_EVENTS } from "./events/soft-delete.events";
import type { SoftDeleteModuleOptions } from "./interfaces";

interface EventEmitterLike {
  emit(event: string, ...args: any[]): boolean;
}

@Injectable()
export class SoftDeleteService implements OnModuleInit, OnModuleDestroy {
  private static instance: SoftDeleteService | null = null;
  private readonly logger = new Logger(SoftDeleteService.name);

  constructor(
    @Inject(SOFT_DELETE_OPTIONS) private readonly options: SoftDeleteModuleOptions,
    private readonly dataSource: DataSource,
    @Optional() @Inject("EventEmitter2") private readonly eventEmitter?: EventEmitterLike,
  ) {}

  onModuleInit(): void {
    SoftDeleteService.instance = this;
    this.logger.log("SoftDeleteService initialized");
  }

  onModuleDestroy(): void {
    if (SoftDeleteService.instance === this) {
      SoftDeleteService.instance = null;
    }
  }

  static getInstance(): SoftDeleteService | null {
    return SoftDeleteService.instance;
  }

  // --- Options ---

  getOptions(): SoftDeleteModuleOptions {
    return this.options;
  }

  // --- Column Resolution ---

  getColumnName(entityConstructor?: Function): string {
    if (entityConstructor) {
      const meta = Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, entityConstructor);
      if (meta?.columnName) return meta.columnName;
    }
    return this.options.columnName ?? "deleted_at";
  }

  getPropertyName(entityConstructor: Function): string {
    const columnName = this.getColumnName(entityConstructor);
    try {
      const entityMetadata = this.dataSource.getMetadata(entityConstructor);
      const col = entityMetadata.columns.find((c) => c.databaseName === columnName);
      return col?.propertyName ?? "deletedAt";
    } catch {
      return "deletedAt";
    }
  }

  // --- Soft Delete ---

  async softDelete<T>(entityConstructor: new (...args: any[]) => T, id: string): Promise<void> {
    const repo = this.dataSource.getRepository(entityConstructor);
    const propertyName = this.getPropertyName(entityConstructor);

    await repo
      .createQueryBuilder()
      .update(entityConstructor)
      .set({ [propertyName]: new Date() } as any)
      .where("id = :id", { id })
      .execute();

    this.emit(SOFT_DELETE_EVENTS.DELETED, {
      entityType: entityConstructor.name,
      entityId: id,
    });
  }

  // --- Restore ---

  async restore<T>(entityConstructor: new (...args: any[]) => T, id: string): Promise<void> {
    const repo = this.dataSource.getRepository(entityConstructor);
    const propertyName = this.getPropertyName(entityConstructor);

    await repo
      .createQueryBuilder()
      .update(entityConstructor)
      .set({ [propertyName]: null } as any)
      .where("id = :id", { id })
      .execute();

    this.emit(SOFT_DELETE_EVENTS.RESTORED, {
      entityType: entityConstructor.name,
      entityId: id,
    });
  }

  // --- Force Delete ---

  async forceDelete<T>(entityConstructor: new (...args: any[]) => T, id: string): Promise<void> {
    const repo = this.dataSource.getRepository(entityConstructor);

    await repo.createQueryBuilder().delete().from(entityConstructor).where("id = :id", { id }).execute();

    this.emit(SOFT_DELETE_EVENTS.FORCE_DELETED, {
      entityType: entityConstructor.name,
      entityId: id,
    });
  }

  // --- Query Helpers ---

  withTrashed<T extends ObjectLiteral>(
    entityConstructor: new (...args: any[]) => T,
    alias?: string,
  ): SelectQueryBuilder<T> {
    const repo = this.dataSource.getRepository(entityConstructor);
    return repo.createQueryBuilder(alias ?? entityConstructor.name.toLowerCase());
  }

  onlyTrashed<T extends ObjectLiteral>(
    entityConstructor: new (...args: any[]) => T,
    alias?: string,
  ): SelectQueryBuilder<T> {
    const repo = this.dataSource.getRepository(entityConstructor);
    const al = alias ?? entityConstructor.name.toLowerCase();
    const propertyName = this.getPropertyName(entityConstructor);
    return repo.createQueryBuilder(al).where(`${al}.${propertyName} IS NOT NULL`);
  }

  // --- Check ---

  isSoftDeletable(entityConstructor: Function): boolean {
    return !!Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, entityConstructor);
  }

  // --- Private ---

  private emit(event: string, payload: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(event, payload);
    }
  }
}
