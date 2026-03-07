import { expect, test, describe, vi } from "vitest";

// Mock the modules that are missing in the environment

vi.mock("clsx", () => ({
  clsx: vi.fn((...args: any[]) => "clsx-result"),
}));

vi.mock("tailwind-merge", () => ({
  twMerge: vi.fn((arg: string) => "tw-merge-result"),
}));

// Import the function after mocking
import { cn } from "./utils";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

describe("cn", () => {
  test("calls clsx with all inputs and passes result to twMerge", () => {
    const inputs = ["class1", { class2: true }, ["class3"]];
    const result = cn(...inputs);

    // Verify clsx was called with all inputs
    expect(clsx).toHaveBeenCalledWith(inputs);

    // Verify twMerge was called with the result from clsx
    expect(twMerge).toHaveBeenCalledWith("clsx-result");

    // Verify final result is what twMerge returned
    expect(result).toBe("tw-merge-result");
  });

  test("handles empty inputs", () => {
    vi.mocked(clsx).mockClear();
    vi.mocked(twMerge).mockClear();

    cn();

    expect(clsx).toHaveBeenCalledWith([]);
    expect(twMerge).toHaveBeenCalledWith("clsx-result");
  });
});
