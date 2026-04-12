# Changelog

All notable changes to `@nestbolt/soft-delete` will be documented in this file.

## v0.1.0 — Initial Release

### Features

- **Soft delete** — Mark entities as deleted instead of removing them from the database
- **@SoftDeletable decorator** — Class decorator to mark entities as soft-deletable with configurable column name
- **Entity mixin** — `SoftDeletableMixin()` adds `softDelete()`, `restore()`, `forceDelete()`, `isDeleted()`, `isTrashed()`, `getDeletedAt()` to entities
- **Query helpers** — `withTrashed()` and `onlyTrashed()` query builders for querying soft-deleted records
- **Force delete** — Permanently remove soft-deleted entities when needed
- **Restore** — Restore soft-deleted entities back to active state
- **Events** — Emits `soft-delete.deleted`, `soft-delete.restored`, `soft-delete.force-deleted` events via optional `@nestjs/event-emitter`
- **Module configuration** — `forRoot()` and `forRootAsync()` with configurable column name
