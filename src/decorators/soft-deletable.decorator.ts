import "reflect-metadata";
import { SOFT_DELETABLE_METADATA_KEY } from "../soft-delete.constants";

export interface SoftDeletableOptions {
  /** Override column name for this entity. Default uses module option or 'deleted_at'. */
  columnName?: string;
}

export function SoftDeletable(options?: SoftDeletableOptions): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(
      SOFT_DELETABLE_METADATA_KEY,
      {
        columnName: options?.columnName,
      },
      target,
    );
  };
}
