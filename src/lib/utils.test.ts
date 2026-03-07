import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("clsx", () => ({
  clsx: vi.fn((..._args: unknown[]) => "clsx-result"),
}));

vi.mock("tailwind-merge", () => ({
  twMerge: vi.fn((_arg: string) => "tw-merge-result"),
}));

import { cn } from "./utils";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

describe("cn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("calls clsx with all inputs and passes result to twMerge", () => {
    const inputs = ["class1", { class2: true }, ["class3"]] as Parameters<typeof cn>;
    const result = cn(...inputs);

    expect(clsx).toHaveBeenCalled();
    expect(twMerge).toHaveBeenCalledWith("clsx-result");
    expect(result).toBe("tw-merge-result");
  });

  test("handles empty inputs", () => {
    cn();

    expect(clsx).toHaveBeenCalled();
    expect(twMerge).toHaveBeenCalledWith("clsx-result");
  });
});
