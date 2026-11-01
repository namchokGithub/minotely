import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "./owner";

describe("isOwnerEmail", () => {
  it("accepts the owner email", () => {
    expect(isOwnerEmail("me@example.com", "me@example.com")).toBe(true);
  });

  it("ignores case and surrounding spaces", () => {
    expect(isOwnerEmail(" Me@Example.com ", "me@example.COM")).toBe(true);
  });

  it("rejects a different account", () => {
    expect(isOwnerEmail("other@example.com", "me@example.com")).toBe(false);
  });

  it("rejects when the email is missing", () => {
    expect(isOwnerEmail(null, "me@example.com")).toBe(false);
    expect(isOwnerEmail(undefined, "me@example.com")).toBe(false);
  });

  it("rejects everyone when the owner email is not configured", () => {
    expect(isOwnerEmail("me@example.com", "")).toBe(false);
    expect(isOwnerEmail("", "")).toBe(false);
    expect(isOwnerEmail("me@example.com", undefined)).toBe(false);
  });
});
