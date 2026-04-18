import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryClient } from "@/services/queryClient";

function mockSessionStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => Object.keys(store).forEach(k => delete store[k])),
  };
}

describe("clearUserSession", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", mockSessionStorage());
    vi.restoreAllMocks();
  });

  it("removes all cc_* keys from sessionStorage", async () => {
    sessionStorage.setItem("cc_api_token", "api-test123");
    sessionStorage.setItem("cc_user_uuid", "uuid-123");
    sessionStorage.setItem("cc_username", "testuser");
    sessionStorage.setItem("cc_key_type", "human");
    sessionStorage.setItem("cc_view", "dashboard");
    sessionStorage.setItem("unrelated_key", "keep-me");

    const { clearUserSession } = await import("@/services/auth/clearUserSession");
    clearUserSession();

    expect(sessionStorage.removeItem).toHaveBeenCalledWith("cc_api_token");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("cc_user_uuid");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("cc_username");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("cc_key_type");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("cc_view");
    expect(sessionStorage.removeItem).not.toHaveBeenCalledWith("unrelated_key");
  });

  it("calls queryClient.clear()", async () => {
    const spy = vi.spyOn(queryClient, "clear");

    const { clearUserSession } = await import("@/services/auth/clearUserSession");
    clearUserSession();

    expect(spy).toHaveBeenCalledOnce();
  });

  it("clears cached query data", async () => {
    queryClient.setQueryData(["bookmarks"], { items: ["a", "b"] });
    expect(queryClient.getQueryData(["bookmarks"])).toEqual({ items: ["a", "b"] });

    const { clearUserSession } = await import("@/services/auth/clearUserSession");
    clearUserSession();

    expect(queryClient.getQueryData(["bookmarks"])).toBeUndefined();
  });
});
