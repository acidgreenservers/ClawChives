import { expect, test, describe, vi } from "vitest";
import { apiClient } from "./api";

describe("apiClient", () => {
  test("addBookmark should call mockRequest and return success", async () => {
    // We need to set an API key first
    apiClient.setApiKey("api-12345678901234567890123456789012");

    const bookmark = {
      url: "https://example.com",
      title: "Example",
      description: "An example bookmark",
      favicon: "https://example.com/favicon.ico",
      tags: ["test"],
      starred: false,
      archived: false
    };

    const spy = vi.spyOn(console, 'log');

    const response = await apiClient.addBookmark(bookmark);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(bookmark);

    // Verify console.log was NOT called (which is our change)
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("[API Mock]"));

    spy.mockRestore();
  });
});
