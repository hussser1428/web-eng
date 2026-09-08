import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioOnce } from "./AudioOnce";

describe("AudioOnce", () => {
  it("played=true thì nút phát bị vô hiệu và ghi Đã phát", () => {
    render(<AudioOnce src="https://example.com/a.mp3" played />);
    expect(screen.getByRole("button", { name: "Phát audio" })).toBeDisabled();
    expect(screen.getByText("Đã phát")).toBeInTheDocument();
  });

  it("gọi onPlayed với src khi bấm phát", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const onPlayed = vi.fn();
    render(<AudioOnce src="https://example.com/a.mp3" onPlayed={onPlayed} />);
    await userEvent.click(screen.getByRole("button", { name: "Phát audio" }));
    expect(onPlayed).toHaveBeenCalledWith("https://example.com/a.mp3");
  });
});
