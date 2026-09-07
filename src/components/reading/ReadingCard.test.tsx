import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingCard } from "./ReadingCard";

describe("ReadingCard", () => {
  it("hiện nhãn thể loại tiếng Việt và số phút đọc", () => {
    render(
      <ReadingCard
        item={{
          id: "r1",
          title: "The Tortoise and the Hare",
          genre: "FAIRY_TALE",
          level: "A2",
          wordCount: 300,
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
        }}
      />,
    );
    expect(screen.getByText("The Tortoise and the Hare")).toBeInTheDocument();
    expect(screen.getByText(/Cổ tích/)).toBeInTheDocument();
    expect(screen.getByText(/~2 phút/)).toBeInTheDocument();
  });

  it("bài rất ngắn thì số phút đọc tối thiểu là 1", () => {
    render(
      <ReadingCard
        item={{
          id: "r2",
          title: "Short",
          genre: "NEWS",
          level: "B2",
          wordCount: 10,
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
        }}
      />,
    );
    expect(screen.getByText(/~1 phút/)).toBeInTheDocument();
  });
});
