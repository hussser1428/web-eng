// @vitest-environment node
import { describe, it, expect } from "vitest";
import { errorToResponse } from "./api-errors";

describe("errorToResponse", () => {
  it.each([
    ["UNAUTHORIZED", 401], ["FORBIDDEN", 403], ["NOT_FOUND", 404], ["ALREADY_SUBMITTED", 409],
    ["NOT_ENOUGH_QUESTIONS", 409], ["NOT_SUBMITTED", 409], ["INVALID", 400], ["WRONG_TYPE", 400],
  ])("%s → %i", async (code, status) => {
    const r = errorToResponse(new Error(code));
    expect(r?.status).toBe(status);
    expect(await r!.json()).toEqual({ error: code });
  });

  it("lỗi lạ → null", () => {
    expect(errorToResponse(new Error("boom"))).toBeNull();
    expect(errorToResponse("x")).toBeNull();
  });
});
