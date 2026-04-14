// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useBookmarkForm } from "./useBookmarkForm";

describe("useBookmarkForm", () => {
  it("syncs pinned to selectedFolder", () => {
    const folders = [{ id: "pinned-id", name: "Pinned", createdAt: "now" }];
    const { result } = renderHook(() =>
      useBookmarkForm({
        folders,
        isOpen: true,
        onSave: vi.fn(),
        onClose: vi.fn(),
        db: {},
      })
    );

    act(() => {
      result.current.formState.setPinned(true);
    });
    expect(result.current.formState.selectedFolder).toBe("pinned-id");
    expect(result.current.formState.pinned).toBe(true);

    act(() => {
      result.current.formState.setPinned(false);
    });
    expect(result.current.formState.selectedFolder).toBe("");
    expect(result.current.formState.pinned).toBe(false);
  });

  it("syncs selectedFolder to pinned", () => {
    const folders = [{ id: "pinned-id", name: "Pinned", createdAt: "now" }];
    const { result } = renderHook(() =>
      useBookmarkForm({
        folders,
        isOpen: true,
        onSave: vi.fn(),
        onClose: vi.fn(),
        db: {},
      })
    );

    act(() => {
      result.current.formState.setSelectedFolder("pinned-id");
    });
    expect(result.current.formState.pinned).toBe(true);

    act(() => {
      result.current.formState.setSelectedFolder("");
    });
    expect(result.current.formState.pinned).toBe(false);
  });
});
