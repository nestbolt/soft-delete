<p align="center">
    <h1 align="center">@nestbolt/soft-delete</h1>
    <p align="center">Soft delete for NestJS with TypeORM — mark entities as deleted instead of removing them.</p>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@nestbolt/soft-delete"><img src="https://img.shields.io/npm/v/@nestbolt/soft-delete.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nestbolt/soft-delete"><img src="https://img.shields.io/npm/dt/@nestbolt/soft-delete.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/nestbolt/soft-delete/actions"><img src="https://img.shields.io/github/actions/workflow/status/nestbolt/soft-delete/tests.yml?branch=main&style=flat-square&label=tests" alt="tests"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="license"></a>
</p>

<hr>

This package provides **soft delete functionality** for [NestJS](https://nestjs.com) with TypeORM that lets you mark entities as deleted instead of permanently removing them, with restore, force delete, and query helpers.

Once installed, using it is as simple as:

```typescript
@SoftDeletable()
@Entity()
class Post extends SoftDeletableMixin(BaseEntity) {
  @Column({ name: 'deleted_at', nullable: true }) deletedAt: Date | null;
}

await post.softDelete();   // Marks as deleted
await post.restore();      // Restores
await post.forceDelete();  // Permanently removes
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Configuration](#module-configuration)
  - [Static Configuration (forRoot)](#static-configuration-forroot)
  - [Async Configuration (forRootAsync)](#async-configuration-forrootasync)
- [Using the Decorator](#using-the-decorator)
- [Using the Mixin](#using-the-mixin)
- [Using the Service Directly](#using-the-service-directly)
- [Query Helpers](#query-helpers)
- [Custom Column Name](#custom-column-name)
- [Events](#events)
- [Configuration Options](#configuration-options)
- [Testing](#testing)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Installation

Install the package via npm:

```bash
npm install @nestbolt/soft-delete
```

Or via yarn:

```bash
yarn add @nestbolt/soft-delete
```

Or via pnpm:

```bash
pnpm add @nestbolt/soft-delete
```

### Peer Dependencies

This package requires the following peer dependencies:

```
@nestjs/common    ^10.0.0 || ^11.0.0
@nestjs/core      ^10.0.0 || ^11.0.0
typeorm           ^0.3.0
reflect-metadata  ^0.1.13 || ^0.2.0
```

Optional:

```
@nestjs/event-emitter  ^2.0.0 || ^3.0.0
```

## Quick Start

1. Register the module in your `AppModule`:

```typescript
import { SoftDeleteModule } from '@nestbolt/soft-delete';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    SoftDeleteModule.forRoot(),
  ],
})
export class AppModule {}
```

2. Add the decorator and mixin to your entity:

```typescript
import { SoftDeletable, SoftDeletableMixin } from '@nestbolt/soft-delete';
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';

@SoftDeletable()
@Entity('posts')
export class Post extends SoftDeletableMixin(BaseEntity) {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true, default: null })
  deletedAt: Date | null;
}
```

3. Use soft delete in your service:

```typescript
// Via mixin methods
await post.softDelete();
await post.restore();
console.log(post.isDeleted()); // true/false

// Via service
await softDeleteService.softDelete(Post, postId);
await softDeleteService.restore(Post, postId);
await softDeleteService.forceDelete(Post, postId);
```

## Module Configuration

### Static Configuration (forRoot)

```typescript
SoftDeleteModule.forRoot({
  columnName: 'deleted_at',  // Default column name
})
```

### Async Configuration (forRootAsync)

```typescript
SoftDeleteModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    columnName: config.get('SOFT_DELETE_COLUMN', 'deleted_at'),
  }),
})
```

The module is registered as **global** — `SoftDeleteService` is available everywhere without re-importing.

## Using the Decorator

The `@SoftDeletable()` class decorator marks an entity as soft-deletable:

```typescript
@SoftDeletable()                           // Uses default column 'deleted_at'
@SoftDeletable({ columnName: 'removed_at' }) // Custom column name
```

## Using the Mixin

The `SoftDeletableMixin()` adds instance methods to your entity:

| Method | Returns | Description |
|--------|---------|-------------|
| `softDelete()` | `Promise<void>` | Soft-delete this entity |
| `restore()` | `Promise<void>` | Restore this entity |
| `forceDelete()` | `Promise<void>` | Permanently delete from DB |
| `isDeleted()` | `boolean` | Check if soft-deleted |
| `isTrashed()` | `boolean` | Alias for `isDeleted()` |
| `getDeletedAt()` | `Date \| null` | Get deletion timestamp |

## Using the Service Directly

Inject `SoftDeleteService` for programmatic control:

| Method | Returns | Description |
|--------|---------|-------------|
| `softDelete<T>(Entity, id)` | `Promise<void>` | Set deletedAt to now |
| `restore<T>(Entity, id)` | `Promise<void>` | Set deletedAt to null |
| `forceDelete<T>(Entity, id)` | `Promise<void>` | Permanently DELETE |
| `withTrashed<T>(Entity, alias?)` | `SelectQueryBuilder<T>` | Query including deleted |
| `onlyTrashed<T>(Entity, alias?)` | `SelectQueryBuilder<T>` | Query only deleted |
| `isSoftDeletable(Entity)` | `boolean` | Check if decorated |
| `getColumnName(Entity?)` | `string` | Resolve column name |

## Query Helpers

```typescript
// Get all posts including soft-deleted
const all = await softDeleteService.withTrashed(Post).getMany();

// Get only soft-deleted posts
const trashed = await softDeleteService.onlyTrashed(Post).getMany();

// Add conditions to trashed query
const old = await softDeleteService
  .onlyTrashed(Post, 'post')
  .andWhere('post.createdAt < :date', { date: someDate })
  .getMany();
```

## Custom Column Name

Override the column name per entity or globally:

```typescript
// Per entity
@SoftDeletable({ columnName: 'removed_at' })

// Globally
SoftDeleteModule.forRoot({ columnName: 'removed_at' })
```

Entity-level options take priority over module-level options.

## Events

When `@nestjs/event-emitter` is installed, the following events are emitted:

| Event | Payload |
|-------|---------|
| `soft-delete.deleted` | `{ entityType, entityId }` |
| `soft-delete.restored` | `{ entityType, entityId }` |
| `soft-delete.force-deleted` | `{ entityType, entityId }` |

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columnName` | `string` | `'deleted_at'` | Default column name for soft-delete timestamp |

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security-related issues, please report them via [GitHub Issues](https://github.com/nestbolt/soft-delete/issues) with the **security** label instead of using the public issue tracker.

## Credits

- Inspired by [spatie/laravel-model-cleanup](https://github.com/spatie/laravel-model-cleanup) and Laravel's built-in `SoftDeletes` trait

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
