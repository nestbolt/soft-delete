import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { SoftDeletable } from "../src/decorators/soft-deletable.decorator";
import { IncludeDeleted } from "../src/decorators/include-deleted.decorator";
import {
  SOFT_DELETABLE_METADATA_KEY,
  INCLUDE_DELETED_METADATA_KEY,
} from "../src/soft-delete.constants";

describe("@SoftDeletable()", () => {
  it("should set metadata on class", () => {
    @SoftDeletable()
    class TestEntity {}

    const meta = Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, TestEntity);
    expect(meta).toBeDefined();
    expect(meta.columnName).toBeUndefined();
  });

  it("should store custom column name", () => {
    @SoftDeletable({ columnName: "removed_at" })
    class TestEntity {}

    const meta = Reflect.getMetadata(SOFT_DELETABLE_METADATA_KEY, TestEntity);
    expect(meta.columnName).toBe("removed_at");
  });
});

describe("@IncludeDeleted()", () => {
  it("should set metadata on class", () => {
    @IncludeDeleted()
    class TestClass {}

    const meta = Reflect.getMetadata(INCLUDE_DELETED_METADATA_KEY, TestClass);
    expect(meta).toBe(true);
  });

  it("should set metadata on method", () => {
    class TestClass {
      @IncludeDeleted()
      findAll() {
        return [];
      }
    }

    const meta = Reflect.getMetadata(
      INCLUDE_DELETED_METADATA_KEY,
      TestClass.prototype,
      "findAll",
    );
    expect(meta).toBe(true);
  });
});
