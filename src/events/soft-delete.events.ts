export const SOFT_DELETE_EVENTS = {
  DELETED: "soft-delete.deleted",
  RESTORED: "soft-delete.restored",
  FORCE_DELETED: "soft-delete.force-deleted",
} as const;

export interface SoftDeleteDeletedEvent {
  entityType: string;
  entityId: string;
}

export interface SoftDeleteRestoredEvent {
  entityType: string;
  entityId: string;
}

export interface SoftDeleteForceDeletedEvent {
  entityType: string;
  entityId: string;
}
