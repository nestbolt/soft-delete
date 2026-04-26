import "reflect-metadata";
import {
  EventSubscriber,
  EntitySubscriberInterface,
  RemoveEvent,
  DataSource,
} from "typeorm";
import { SOFT_DELETABLE_METADATA_KEY } from "./soft-delete.constants";
import { SoftDeleteService } from "./soft-delete.service";

interface SoftDeletableMetadata {
  columnName?: string;
}

@EventSubscriber()
export class SoftDeleteSubscriber implements EntitySubscriberInterface {
  constructor(private readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  // Best-effort interception only. TypeORM's subscriber model cannot truly
  // cancel a remove, so the underlying DELETE may still run after this hook.
  // For reliable soft-delete behavior, use service.softDelete() or
  // mixin.softDelete() instead of repo.remove().
  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    if (!event.entity) return;

    const meta = this.getMetadata(event.entity);
    if (!meta) return;

    const service = SoftDeleteService.getInstance();
    if (!service) return;

    const propertyName = service.getPropertyName(event.entity.constructor);

    // Already soft-deleted — treat as a force delete and let it proceed.
    if (
      event.entity[propertyName] !== null &&
      event.entity[propertyName] !== undefined
    ) {
      return;
    }

    event.entity[propertyName] = new Date();

    try {
      await event.manager.save(event.entity);
    } catch {
      // Swallow so the original remove path is not crashed by interception.
    }
  }

  private getMetadata(entity: any): SoftDeletableMetadata | null {
    if (!entity || !entity.constructor) return null;
    return (
      Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, entity.constructor) ??
      null
    );
  }
}
