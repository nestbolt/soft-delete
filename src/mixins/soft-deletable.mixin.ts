import "reflect-metadata";
import { SoftDeleteService } from "../soft-delete.service";
import { SoftDeleteNotInitializedException } from "../exceptions/soft-delete-not-initialized.exception";

type Constructor<T = object> = new (...args: any[]) => T;

export interface SoftDeletableMixinEntity {
  softDelete(): Promise<void>;
  restore(): Promise<void>;
  forceDelete(): Promise<void>;
  isDeleted(): boolean;
  isTrashed(): boolean;
  getDeletedAt(): Date | null;
}

function getService(): SoftDeleteService {
  const service = SoftDeleteService.getInstance();
  if (!service) {
    throw new SoftDeleteNotInitializedException();
  }
  return service;
}

export function SoftDeletableMixin<TBase extends Constructor>(Base: TBase) {
  class SoftDeletableEntityClass extends Base implements SoftDeletableMixinEntity {
    async softDelete(): Promise<void> {
      const service = getService();
      const id = (this as any).id;
      await service.softDelete(this.constructor as any, String(id));
      const propertyName = service.getPropertyName(this.constructor);
      (this as any)[propertyName] = new Date();
    }

    async restore(): Promise<void> {
      const service = getService();
      const id = (this as any).id;
      await service.restore(this.constructor as any, String(id));
      const propertyName = service.getPropertyName(this.constructor);
      (this as any)[propertyName] = null;
    }

    async forceDelete(): Promise<void> {
      const service = getService();
      const id = (this as any).id;
      await service.forceDelete(this.constructor as any, String(id));
    }

    isDeleted(): boolean {
      return this.getDeletedAt() !== null;
    }

    isTrashed(): boolean {
      return this.isDeleted();
    }

    getDeletedAt(): Date | null {
      const service = SoftDeleteService.getInstance();
      if (service) {
        const propertyName = service.getPropertyName(this.constructor);
        const val = (this as any)[propertyName];
        if (val instanceof Date) return val;
        if (val === null || val === undefined) return null;
        return new Date(val);
      }
      // Fallback: try common property names
      const val = (this as any).deletedAt ?? (this as any).deleted_at;
      if (val instanceof Date) return val;
      if (val === null || val === undefined) return null;
      return new Date(val);
    }
  }

  return SoftDeletableEntityClass;
}
