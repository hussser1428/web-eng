import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingFilters } from "./ReadingFilters";

describe("ReadingFilters", () => {
  it("giữ giá trị thể loại và độ khó đã chọn", () => {
    render(<ReadingFilters genre="ANIME" level="B1" />);
    expect(screen.getByLabelText("Thể loại")).toHaveValue("ANIME");
    expect(screen.getByLabelText("Độ khó")).toHaveValue("B1");
  });

  it("đang lọc thì có link Bỏ lọc trỏ về /reading", () => {
    render(<ReadingFilters genre="ANIME" />);
    expect(screen.getByRole("link", { name: "Bỏ lọc" })).toHaveAttribute("href", "/reading");
  });

  it("không lọc gì thì không có link Bỏ lọc", () => {
    render(<ReadingFilters />);
    expect(screen.queryByRole("link", { name: "Bỏ lọc" })).not.toBeInTheDocument();
  });
});
