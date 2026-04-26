import { describe, it, expect } from "vitest";
import { SoftDeleteNotInitializedException } from "../src/exceptions/soft-delete-not-initialized.exception";

describe("SoftDeleteNotInitializedException", () => {
  it("has the right name and message", () => {
    const err = new SoftDeleteNotInitializedException();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SoftDeleteNotInitializedException");
    expect(err.message).toContain("SoftDeleteModule has not been initialized");
  });
});
