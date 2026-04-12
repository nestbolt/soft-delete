import "reflect-metadata";
import { INCLUDE_DELETED_METADATA_KEY } from "../soft-delete.constants";

/**
 * When applied to a class or method, queries for this target will include
 * soft-deleted entities (bypasses the soft-delete filter).
 */
export function IncludeDeleted(): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      Reflect.defineMetadata(INCLUDE_DELETED_METADATA_KEY, true, target, propertyKey);
    } else {
      Reflect.defineMetadata(INCLUDE_DELETED_METADATA_KEY, true, target);
    }
    return descriptor ?? target;
  };
}
