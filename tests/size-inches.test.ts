import { describe, expect, it } from "vitest";
import { cmToInches, formatInches, inchesToCm } from "@/lib/size-inches";

describe("size-inches", () => {
  it("formats to the nearest eighth", () => {
    expect(formatInches(0.25)).toBe("1/4″");
    expect(formatInches(1.125)).toBe("1 1/8″");
    expect(formatInches(3)).toBe("3″");
    expect(formatInches(0)).toBe("—");
  });
  it("round-trips cm and inches", () => {
    expect(inchesToCm(cmToInches(7.62))).toBeCloseTo(7.62, 6);
    expect(cmToInches(2.54)).toBe(1);
  });
});
