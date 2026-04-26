import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DataSource,
  RemoveEvent,
} from "typeorm";
import { SoftDeleteModule } from "../src/soft-delete.module";
import { SoftDeleteService } from "../src/soft-delete.service";
import { SoftDeleteSubscriber } from "../src/soft-delete.subscriber";
import { SoftDeletable } from "../src/decorators/soft-deletable.decorator";

@SoftDeletable()
@Entity("sub_posts")
class SubPost {
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

@Entity("sub_plain")
class PlainEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;
}

function clearStaticInstance() {
  (
    SoftDeleteService as unknown as { instance: SoftDeleteService | null }
  ).instance = null;
}

function makeRemoveEvent<T>(
  overrides: Partial<RemoveEvent<T>>,
): RemoveEvent<T> {
  return overrides as RemoveEvent<T>;
}

describe("SoftDeleteSubscriber", () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let subscriber: SoftDeleteSubscriber;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [SubPost, PlainEntity],
          synchronize: true,
        }),
        SoftDeleteModule.forRoot(),
      ],
    }).compile();

    await module.init();
    dataSource = module.get<DataSource>(DataSource);
    subscriber = module.get(SoftDeleteSubscriber);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("registers itself on the DataSource subscribers list", () => {
    expect(dataSource.subscribers).toContain(subscriber);
  });

  it("returns early when event has no entity", async () => {
    const save = vi.fn();
    await subscriber.beforeRemove(
      makeRemoveEvent({ entity: undefined, manager: { save } as never }),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("returns early when entity has no constructor (e.g. Object.create(null))", async () => {
    const save = vi.fn();
    const noCtor = Object.create(null);

    await subscriber.beforeRemove(
      makeRemoveEvent({ entity: noCtor, manager: { save } as never }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("returns early when entity has no @SoftDeletable metadata", async () => {
    const save = vi.fn();
    const plain = new PlainEntity();
    plain.id = "p";
    plain.name = "n";

    await subscriber.beforeRemove(
      makeRemoveEvent({ entity: plain, manager: { save } as never }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("returns early when SoftDeleteService is not initialized", async () => {
    clearStaticInstance();

    const save = vi.fn();
    const post = new SubPost();
    post.id = "p";
    post.title = "t";
    post.deletedAt = null;

    await subscriber.beforeRemove(
      makeRemoveEvent({ entity: post, manager: { save } as never }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("skips interception when entity is already soft-deleted (force-delete path)", async () => {
    const save = vi.fn();
    const post = new SubPost();
    post.id = "p";
    post.title = "t";
    post.deletedAt = new Date();

    await subscriber.beforeRemove(
      makeRemoveEvent({ entity: post, manager: { save } as never }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("sets deletedAt and saves the entity on a fresh remove", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const post = new SubPost();
    post.id = "p";
    post.title = "t";
    post.deletedAt = null;

    await subscriber.beforeRemove(
      makeRemoveEvent({
        entity: post,
        manager: { save } as never,
        queryRunner: {} as never,
      }),
    );

    expect(post.deletedAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledWith(post);
  });

  it("swallows save() errors silently", async () => {
    const save = vi.fn().mockRejectedValue(new Error("db down"));
    const post = new SubPost();
    post.id = "p";
    post.title = "t";
    post.deletedAt = null;

    await expect(
      subscriber.beforeRemove(
        makeRemoveEvent({ entity: post, manager: { save } as never }),
      ),
    ).resolves.toBeUndefined();
    expect(post.deletedAt).toBeInstanceOf(Date);
  });
});
