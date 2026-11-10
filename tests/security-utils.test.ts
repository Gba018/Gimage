import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import { readImageSize, sniffImageType } from "@/lib/server/image-sniff";
import { safeNext } from "@/lib/safe-redirect";

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("uses a random salt", async () => {
    expect(await hashPassword("same")).not.toEqual(await hashPassword("same"));
  });
});

describe("image sniffing", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0x90, 0, 0, 0, 0xc8]);
  it("detects types from magic bytes, not names", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("GIF89a......"))).toBe("image/gif");
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
  it("reads PNG dimensions", () => {
    expect(readImageSize(png, "image/png")).toEqual({ width: 400, height: 200 });
  });
});

describe("safeNext", () => {
  it("allows only local paths", () => {
    expect(safeNext("/design/abc")).toBe("/design/abc");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
