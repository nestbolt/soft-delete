import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SoftDeleteModule } from "../src/soft-delete.module";
import { SoftDeleteService } from "../src/soft-delete.service";
import { SoftDeletable } from "../src/decorators/soft-deletable.decorator";
import { SoftDeletableMixin } from "../src/mixins/soft-deletable.mixin";
import { SoftDeleteNotInitializedException } from "../src/exceptions/soft-delete-not-initialized.exception";

@SoftDeletable()
@Entity("mixin_posts")
class Post extends SoftDeletableMixin(
  class {
    id!: string;
  },
) {
  @PrimaryGeneratedColumn("uuid")
  declare id: string;

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

function clearStaticInstance() {
  (
    SoftDeleteService as unknown as { instance: SoftDeleteService | null }
  ).instance = null;
}

describe("SoftDeletableMixin (initialized module)", () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [Post],
          synchronize: true,
        }),
        SoftDeleteModule.forRoot(),
      ],
    }).compile();

    await module.init();
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  describe("softDelete()", () => {
    it("persists deletedAt and updates entity local state", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "P" }));

      await post.softDelete();

      expect(post.deletedAt).toBeInstanceOf(Date);
      const fresh = await repo.findOne({ where: { id: post.id } });
      expect(fresh!.deletedAt).not.toBeNull();
    });
  });

  describe("restore()", () => {
    it("clears deletedAt locally and in DB", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "P" }));

      await post.softDelete();
      await post.restore();

      expect(post.deletedAt).toBeNull();
      const fresh = await repo.findOne({ where: { id: post.id } });
      expect(fresh!.deletedAt).toBeNull();
    });
  });

  describe("forceDelete()", () => {
    it("removes the row from the table", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "P" }));

      await post.forceDelete();

      const fresh = await repo.findOne({ where: { id: post.id } });
      expect(fresh).toBeNull();
    });
  });

  describe("isDeleted() / isTrashed()", () => {
    it("returns true after softDelete()", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "P" }));
      await post.softDelete();

      expect(post.isDeleted()).toBe(true);
      expect(post.isTrashed()).toBe(true);
    });

    it("returns false when entity has no deletedAt", () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "P" });
      post.deletedAt = null;

      expect(post.isDeleted()).toBe(false);
      expect(post.isTrashed()).toBe(false);
    });
  });

  describe("getDeletedAt()", () => {
    it("returns the Date instance when set", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "P" }));
      await post.softDelete();

      expect(post.getDeletedAt()).toBeInstanceOf(Date);
    });

    it("returns null when deletedAt is null", () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "P" });
      post.deletedAt = null;

      expect(post.getDeletedAt()).toBeNull();
    });

    it("parses an ISO string into a Date", () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "P" });
      (post as unknown as { deletedAt: unknown }).deletedAt =
        "2024-01-01T00:00:00.000Z";

      const result = post.getDeletedAt();
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    });
  });
});

describe("SoftDeletableMixin (uninitialized module)", () => {
  beforeEach(() => {
    clearStaticInstance();
  });

  class StandalonePost extends SoftDeletableMixin(
    class {
      id!: string;
    },
  ) {
    declare id: string;
    title!: string;
    deletedAt!: Date | null;
    deleted_at?: unknown;
  }

  it("softDelete() throws SoftDeleteNotInitializedException", async () => {
    const post = new StandalonePost();
    post.id = "x";
    await expect(post.softDelete()).rejects.toBeInstanceOf(
      SoftDeleteNotInitializedException,
    );
  });

  it("restore() throws SoftDeleteNotInitializedException", async () => {
    const post = new StandalonePost();
    post.id = "x";
    await expect(post.restore()).rejects.toBeInstanceOf(
      SoftDeleteNotInitializedException,
    );
  });

  it("forceDelete() throws SoftDeleteNotInitializedException", async () => {
    const post = new StandalonePost();
    post.id = "x";
    await expect(post.forceDelete()).rejects.toBeInstanceOf(
      SoftDeleteNotInitializedException,
    );
  });

  describe("getDeletedAt() fallback (no service)", () => {
    it("reads a Date from the deletedAt field", () => {
      const post = new StandalonePost();
      const when = new Date();
      post.deletedAt = when;
      expect(post.getDeletedAt()).toBe(when);
    });

    it("falls back to deleted_at when deletedAt is missing", () => {
      const post = new StandalonePost();
      post.deleted_at = "2024-06-01T00:00:00.000Z";

      const result = post.getDeletedAt();
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe("2024-06-01T00:00:00.000Z");
    });

    it("returns null when both fields are undefined", () => {
      const post = new StandalonePost();
      expect(post.getDeletedAt()).toBeNull();
    });

    it("returns null when deletedAt is explicitly null", () => {
      const post = new StandalonePost();
      post.deletedAt = null;
      expect(post.getDeletedAt()).toBeNull();
    });
  });
});
