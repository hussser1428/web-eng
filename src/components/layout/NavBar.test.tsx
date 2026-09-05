import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavBar } from "./NavBar";

const pathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

const signOut = vi.fn(async () => {});

describe("NavBar", () => {
  beforeEach(() => pathname.mockReturnValue("/"));

  it("khách thấy Đăng nhập và Đăng ký, không thấy Đăng xuất", () => {
    render(<NavBar user={null} signOutAction={signOut} />);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Đăng ký" })).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("button", { name: "Đăng xuất" })).toBeNull();
  });

  it("có 4 mục chính trỏ đúng đường dẫn", () => {
    render(<NavBar user={null} signOutAction={signOut} />);
    expect(screen.getByRole("link", { name: "Thi thử" })).toHaveAttribute("href", "/exam");
    expect(screen.getByRole("link", { name: "Luyện tập" })).toHaveAttribute("href", "/drill");
    expect(screen.getByRole("link", { name: "Từ vựng" })).toHaveAttribute("href", "/vocab");
    expect(screen.getByRole("link", { name: "Đọc" })).toHaveAttribute("href", "/reading");
    expect(screen.queryByRole("link", { name: "Quản trị" })).toBeNull();
  });

  it("người dùng thấy tên và nút Đăng xuất", () => {
    render(<NavBar user={{ name: "Thắng", email: "a@b.c", role: "USER" }} signOutAction={signOut} />);
    expect(screen.getByText("Thắng")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Đăng nhập" })).toBeNull();
  });

  it("không có tên thì hiện email", () => {
    render(<NavBar user={{ name: null, email: "a@b.c", role: "USER" }} signOutAction={signOut} />);
    expect(screen.getByText("a@b.c")).toBeInTheDocument();
  });

  it("admin thấy mục Quản trị", () => {
    render(<NavBar user={{ name: "Ad", email: "ad@b.c", role: "ADMIN" }} signOutAction={signOut} />);
    expect(screen.getByRole("link", { name: "Quản trị" })).toHaveAttribute("href", "/admin");
  });

  it("đánh dấu aria-current cho mục đang mở, kể cả trang con", () => {
    pathname.mockReturnValue("/vocab/quiz");
    render(<NavBar user={null} signOutAction={signOut} />);
    expect(screen.getByRole("link", { name: "Từ vựng" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Thi thử" })).not.toHaveAttribute("aria-current");
  });

  it("nút menu trên di động mở và đóng danh sách", async () => {
    render(<NavBar user={null} signOutAction={signOut} />);
    const btn = screen.getByRole("button", { name: "Mở menu" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(btn);
    expect(screen.getByRole("button", { name: "Đóng menu" })).toHaveAttribute("aria-expanded", "true");
  });
});
