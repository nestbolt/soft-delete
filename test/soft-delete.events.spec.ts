import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SoftDeleteModule } from "../src/soft-delete.module";
import { SoftDeleteService } from "../src/soft-delete.service";
import { SoftDeletable } from "../src/decorators/soft-deletable.decorator";
import { SOFT_DELETE_EVENTS } from "../src/events/soft-delete.events";

@SoftDeletable()
@Entity("evt_posts")
class EvtPost {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({
    name: "deleted_at",
    type: "datetime",
    nullable: true,
    default: null,
  })
  deletedAt!: Date | null;
}

describe("SoftDeleteService events (with EventEmitterModule registered)", () => {
  let module: TestingModule;
  let service: SoftDeleteService;
  let emitter: EventEmitter2;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [EvtPost],
          synchronize: true,
        }),
        EventEmitterModule.forRoot(),
        SoftDeleteModule.forRoot(),
      ],
    }).compile();

    await module.init();
    service = module.get(SoftDeleteService);
    emitter = module.get(EventEmitter2);
    dataSource = module.get(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("emits soft-delete.deleted on softDelete()", async () => {
    const repo = dataSource.getRepository(EvtPost);
    const post = await repo.save(repo.create({ title: "P" }));

    const events: unknown[] = [];
    emitter.on(SOFT_DELETE_EVENTS.DELETED, (payload) => events.push(payload));

    await service.softDelete(EvtPost, post.id);

    expect(events).toEqual([{ entityType: "EvtPost", entityId: post.id }]);
  });

  it("emits soft-delete.restored on restore()", async () => {
    const repo = dataSource.getRepository(EvtPost);
    const post = await repo.save(repo.create({ title: "P" }));
    await service.softDelete(EvtPost, post.id);

    const events: unknown[] = [];
    emitter.on(SOFT_DELETE_EVENTS.RESTORED, (payload) => events.push(payload));

    await service.restore(EvtPost, post.id);

    expect(events).toEqual([{ entityType: "EvtPost", entityId: post.id }]);
  });

  it("emits soft-delete.force-deleted on forceDelete()", async () => {
    const repo = dataSource.getRepository(EvtPost);
    const post = await repo.save(repo.create({ title: "P" }));

    const events: unknown[] = [];
    emitter.on(SOFT_DELETE_EVENTS.FORCE_DELETED, (payload) =>
      events.push(payload),
    );

    await service.forceDelete(EvtPost, post.id);

    expect(events).toEqual([{ entityType: "EvtPost", entityId: post.id }]);
  });
});

describe("SoftDeleteService events (without EventEmitterModule)", () => {
  let module: TestingModule;
  let service: SoftDeleteService;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [EvtPost],
          synchronize: true,
        }),
        SoftDeleteModule.forRoot(),
      ],
    }).compile();

    await module.init();
    service = module.get(SoftDeleteService);
    dataSource = module.get(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("does not throw when no event emitter is registered", async () => {
    const repo = dataSource.getRepository(EvtPost);
    const post = await repo.save(repo.create({ title: "P" }));

    await expect(service.softDelete(EvtPost, post.id)).resolves.toBeUndefined();
    await expect(service.restore(EvtPost, post.id)).resolves.toBeUndefined();
    await expect(
      service.forceDelete(EvtPost, post.id),
    ).resolves.toBeUndefined();
  });
});
