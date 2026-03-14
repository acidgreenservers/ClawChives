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

    // Verify clsx was called with all inputs
    expect(clsx).toHaveBeenCalledWith(inputs);

    // Verify twMerge was called with the result from clsx
    expect(twMerge).toHaveBeenCalledWith("clsx-result");

    // Verify final result is what twMerge returned
    expect(result).toBe("tw-merge-result");
  });

  test("handles empty inputs", () => {
    cn();

    expect(clsx).toHaveBeenCalledWith([]);
    expect(twMerge).toHaveBeenCalledWith("clsx-result");
  });
});
