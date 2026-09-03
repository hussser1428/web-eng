import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hash rồi verify đúng", async () => {
    const hash = await hashPassword("abc12345");
    expect(hash).not.toBe("abc12345");
    expect(await verifyPassword("abc12345", hash)).toBe(true);
    expect(await verifyPassword("sai", hash)).toBe(false);
  });
});
