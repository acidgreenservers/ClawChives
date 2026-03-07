import { expect, test, describe } from "bun:test";
import { validateIdentityFile } from "./crypto";

describe("validateIdentityFile", () => {
  test("should return an empty array for a valid identity file", () => {
    const validData = {
      username: "testuser",
      uuid: "1234-5678-9012",
      token: "hu-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    };
    const result = validateIdentityFile(validData);
    expect(result).toEqual([]);
  });

  test("should return error for null or undefined data", () => {
    expect(validateIdentityFile(null)).toEqual(["file is not a valid JSON object"]);
    expect(validateIdentityFile(undefined)).toEqual(["file is not a valid JSON object"]);
  });

  test("should return error for non-object data", () => {
    expect(validateIdentityFile("not an object")).toEqual(["file is not a valid JSON object"]);
    expect(validateIdentityFile(123)).toEqual(["file is not a valid JSON object"]);
  });

  test("should detect missing or empty username", () => {
    const data = {
      uuid: "1234-5678-9012",
      token: "hu-abc",
    };
    expect(validateIdentityFile(data)).toContain("username");

    expect(validateIdentityFile({ ...data, username: "" })).toContain("username");
    expect(validateIdentityFile({ ...data, username: 123 })).toContain("username");
  });

  test("should detect missing or empty uuid", () => {
    const data = {
      username: "testuser",
      token: "hu-abc",
    };
    expect(validateIdentityFile(data)).toContain("uuid");

    expect(validateIdentityFile({ ...data, uuid: "" })).toContain("uuid");
    expect(validateIdentityFile({ ...data, uuid: 123 })).toContain("uuid");
  });

  test("should detect missing or invalid token", () => {
    const data = {
      username: "testuser",
      uuid: "1234-5678-9012",
    };
    expect(validateIdentityFile(data)).toContain("token (must start with hu-)");

    expect(validateIdentityFile({ ...data, token: "" })).toContain("token (must start with hu-)");
    expect(validateIdentityFile({ ...data, token: "invalid-token" })).toContain("token (must start with hu-)");
    expect(validateIdentityFile({ ...data, token: 123 })).toContain("token (must start with hu-)");
  });

  test("should return multiple errors if multiple fields are missing", () => {
    const data = {};
    const result = validateIdentityFile(data);
    expect(result).toContain("username");
    expect(result).toContain("uuid");
    expect(result).toContain("token (must start with hu-)");
    expect(result.length).toBe(3);
  });
});
