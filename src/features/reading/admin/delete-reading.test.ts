import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { deleteReading } from "./delete-reading";
import { setReadingStatus } from "./set-reading-status";

describe("deleteReading", () => {
  it("xoá theo id", async () => {
    const del = vi.fn(async () => ({}));
    await deleteReading({ reading: { delete: del } } as never, "r1");
    expect(del).toHaveBeenCalledWith({ where: { id: "r1" } });
  });

  it("NOT_FOUND khi Prisma báo P2025", async () => {
    const del = vi.fn(async () => {
      throw new Prisma.PrismaClientKnownRequestError("no", { code: "P2025", clientVersion: "6" });
    });
    await expect(deleteReading({ reading: { delete: del } } as never, "r9")).rejects.toThrow("NOT_FOUND");
  });

  it("lỗi khác thì ném nguyên", async () => {
    const del = vi.fn(async () => {
      throw new Error("BOOM");
    });
    await expect(deleteReading({ reading: { delete: del } } as never, "r1")).rejects.toThrow("BOOM");
  });
});

describe("setReadingStatus", () => {
  it("cập nhật đúng trạng thái", async () => {
    const update = vi.fn(async () => ({}));
    await setReadingStatus({ reading: { update } } as never, { id: "r1", status: "PUBLISHED" });
    expect(update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { status: "PUBLISHED" } });
  });

  it("NOT_FOUND khi Prisma báo P2025", async () => {
    const update = vi.fn(async () => {
      throw new Prisma.PrismaClientKnownRequestError("no", { code: "P2025", clientVersion: "6" });
    });
    await expect(
      setReadingStatus({ reading: { update } } as never, { id: "r9", status: "PUBLISHED" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("lỗi khác thì ném nguyên", async () => {
    const update = vi.fn(async () => {
      throw new Error("BOOM");
    });
    await expect(setReadingStatus({ reading: { update } } as never, { id: "r1", status: "DRAFT" })).rejects.toThrow(
      "BOOM",
    );
  });
});
