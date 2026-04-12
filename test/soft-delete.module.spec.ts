import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { SoftDeleteModule } from "../src/soft-delete.module";
import { SoftDeleteService } from "../src/soft-delete.service";
import { SOFT_DELETE_OPTIONS } from "../src/soft-delete.constants";

@Entity("test_posts")
class TestPost {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ name: "deleted_at", type: "datetime", nullable: true, default: null })
  deletedAt!: Date | null;
}

describe("SoftDeleteModule", () => {
  describe("forRoot()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
            synchronize: true,
          }),
          SoftDeleteModule.forRoot(),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide SoftDeleteService", () => {
      const service = module.get<SoftDeleteService>(SoftDeleteService);
      expect(service).toBeDefined();
    });

    it("should export SOFT_DELETE_OPTIONS", () => {
      const options = module.get(SOFT_DELETE_OPTIONS);
      expect(options).toEqual({});
    });
  });

  describe("forRoot() with options", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
            synchronize: true,
          }),
          SoftDeleteModule.forRoot({ columnName: "removed_at" }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should store options correctly", () => {
      const service = module.get<SoftDeleteService>(SoftDeleteService);
      const options = service.getOptions();
      expect(options.columnName).toBe("removed_at");
    });
  });

  describe("forRootAsync()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
            synchronize: true,
          }),
          SoftDeleteModule.forRootAsync({
            useFactory: () => ({
              columnName: "deleted_at",
            }),
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide SoftDeleteService", () => {
      const service = module.get<SoftDeleteService>(SoftDeleteService);
      expect(service).toBeDefined();
    });

    it("should resolve options from factory", () => {
      const service = module.get<SoftDeleteService>(SoftDeleteService);
      expect(service.getOptions().columnName).toBe("deleted_at");
    });
  });
});
