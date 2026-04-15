import { describe, test, expect } from "vitest";
import { aggregateTags } from "../../src/shared/lib/utils";

function generateBookmarks(count: number, tagsPerBookmark: number, totalUniqueTags: number): any[] {
  const bookmarks = [];
  for (let i = 0; i < count; i++) {
    const tags = [];
    for (let j = 0; j < tagsPerBookmark; j++) {
      tags.push(`tag-${Math.floor(Math.random() * totalUniqueTags)}`);
    }
    bookmarks.push({ tags });
  }
  return bookmarks;
}

describe("aggregateTags performance", () => {
  test("aggregates tags efficiently for large libraries", () => {
    // Generate a library of 5000 bookmarks, each with 10 tags, from a pool of 100 unique tags
    const bookmarks = generateBookmarks(5000, 10, 100);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      aggregateTags(bookmarks as any);
    }
    const end = performance.now();

    // We mainly want to ensure this runs fast enough, but vitest will just run it.
    // The benchmark value is just for us to see.
    console.log(`Time taken for 100 runs on 5000 bookmarks: ${end - start} ms`);

    // Just ensure it's not terribly slow (e.g. less than 1000ms for 100 iterations of 5000 items)
    expect(end - start).toBeLessThan(1000);
  });
});
