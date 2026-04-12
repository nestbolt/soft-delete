import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SoftDeleteService } from "../src/soft-delete.service";
import { SoftDeletable } from "../src/decorators/soft-deletable.decorator";
import { SOFT_DELETE_OPTIONS } from "../src/soft-delete.constants";

@SoftDeletable()
@Entity("posts")
class Post {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ name: "deleted_at", type: "datetime", nullable: true, default: null })
  deletedAt!: Date | null;
}

@SoftDeletable({ columnName: "removed_at" })
@Entity("articles")
class Article {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ name: "removed_at", type: "datetime", nullable: true, default: null })
  removedAt!: Date | null;
}

describe("SoftDeleteService", () => {
  let module: TestingModule;
  let service: SoftDeleteService;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [Post, Article],
          synchronize: true,
        }),
      ],
      providers: [{ provide: SOFT_DELETE_OPTIONS, useValue: {} }, SoftDeleteService],
    }).compile();

    await module.init();
    service = module.get<SoftDeleteService>(SoftDeleteService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have static instance after init", () => {
    expect(SoftDeleteService.getInstance()).toBe(service);
  });

  describe("isSoftDeletable()", () => {
    it("should return true for decorated entity", () => {
      expect(service.isSoftDeletable(Post)).toBe(true);
    });

    it("should return false for non-decorated entity", () => {
      class PlainEntity {}
      expect(service.isSoftDeletable(PlainEntity)).toBe(false);
    });
  });

  describe("getColumnName()", () => {
    it("should return default column name", () => {
      expect(service.getColumnName()).toBe("deleted_at");
    });

    it("should return entity-level override", () => {
      expect(service.getColumnName(Article)).toBe("removed_at");
    });

    it("should return default for entity without override", () => {
      expect(service.getColumnName(Post)).toBe("deleted_at");
    });
  });

  describe("softDelete()", () => {
    it("should set deletedAt on entity", async () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "Test Post" });
      const saved = await repo.save(post);

      await service.softDelete(Post, saved.id);

      const found = await repo.findOne({ where: { id: saved.id } });
      expect(found).not.toBeNull();
      expect(found!.deletedAt).not.toBeNull();
    });
  });

  describe("restore()", () => {
    it("should clear deletedAt on entity", async () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "Test Post" });
      const saved = await repo.save(post);

      await service.softDelete(Post, saved.id);
      await service.restore(Post, saved.id);

      const found = await repo.findOne({ where: { id: saved.id } });
      expect(found).not.toBeNull();
      expect(found!.deletedAt).toBeNull();
    });
  });

  describe("forceDelete()", () => {
    it("should permanently delete entity", async () => {
      const repo = dataSource.getRepository(Post);
      const post = repo.create({ title: "Test Post" });
      const saved = await repo.save(post);

      await service.forceDelete(Post, saved.id);

      const found = await repo.findOne({ where: { id: saved.id } });
      expect(found).toBeNull();
    });
  });

  describe("withTrashed()", () => {
    it("should return query builder that includes all entities", async () => {
      const repo = dataSource.getRepository(Post);
      const post1 = await repo.save(repo.create({ title: "Active" }));
      const post2 = await repo.save(repo.create({ title: "Deleted" }));
      await service.softDelete(Post, post2.id);

      const all = await service.withTrashed(Post).getMany();
      expect(all).toHaveLength(2);
    });
  });

  describe("onlyTrashed()", () => {
    it("should return only soft-deleted entities", async () => {
      const repo = dataSource.getRepository(Post);
      const post1 = await repo.save(repo.create({ title: "Active" }));
      const post2 = await repo.save(repo.create({ title: "Deleted" }));
      await service.softDelete(Post, post2.id);

      const trashed = await service.onlyTrashed(Post).getMany();
      expect(trashed).toHaveLength(1);
      expect(trashed[0].title).toBe("Deleted");
    });
  });

  describe("custom column name", () => {
    it("should soft-delete with custom column", async () => {
      const repo = dataSource.getRepository(Article);
      const article = await repo.save(repo.create({ title: "Test Article" }));

      await service.softDelete(Article, article.id);

      const found = await repo.findOne({ where: { id: article.id } });
      expect(found).not.toBeNull();
      expect(found!.removedAt).not.toBeNull();
    });

    it("should restore with custom column", async () => {
      const repo = dataSource.getRepository(Article);
      const article = await repo.save(repo.create({ title: "Test Article" }));

      await service.softDelete(Article, article.id);
      await service.restore(Article, article.id);

      const found = await repo.findOne({ where: { id: article.id } });
      expect(found!.removedAt).toBeNull();
    });
  });
});
