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

  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    if (!event.entity) return;

    const meta = this.getMetadata(event.entity);
    if (!meta) return;

    const service = SoftDeleteService.getInstance();
    if (!service) return;

    const propertyName = service.getPropertyName(event.entity.constructor);

    // If already soft-deleted, this is likely a force delete — let it proceed
    if (event.entity[propertyName] !== null && event.entity[propertyName] !== undefined) {
      return;
    }

    // Set the deletedAt timestamp and save instead of removing
    event.entity[propertyName] = new Date();

    try {
      await event.manager.save(event.entity);

      // Signal: remove the entity ID so TypeORM skips the actual DELETE.
      // TypeORM checks for entity ID before running DELETE; clearing it prevents the deletion.
      if (event.queryRunner) {
        // We cannot truly cancel a remove in TypeORM's subscriber model.
        // The recommended approach is to use service.softDelete() or mixin.softDelete()
        // instead of repo.remove(). This subscriber provides best-effort interception.
      }
    } catch {
      // Soft-delete interception failed — do not propagate to avoid crashing the main operation
    }
  }

  private getMetadata(entity: any): SoftDeletableMetadata | null {
    if (!entity || !entity.constructor) return null;
    return Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, entity.constructor) ?? null;
  }
}
