import { describe, expect, it } from "vitest";
import { inquirySubmissionErrorMessage, normalizeInquiryDraft } from "./inquiryForm";

describe("normalizeInquiryDraft", () => {
  it("trims required fields and converts blank optional values to undefined", () => {
    expect(normalizeInquiryDraft({
      name: "  Jane Smith  ",
      email: "  jane@example.com  ",
      phone: "   ",
      dates: " April 15 – April 20 ",
      guests: " 2 ",
      property: " The Briar ",
      message: " Looking forward to our stay! ",
    })).toEqual({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: undefined,
      dates: "April 15 – April 20",
      guests: "2",
      property: "The Briar",
      message: "Looking forward to our stay!",
    });
  });
});

describe("inquirySubmissionErrorMessage", () => {
  it("gives guests a clear validation message for name and email errors", () => {
    expect(inquirySubmissionErrorMessage(new Error("Invalid email"))).toBe(
      "Please enter your full name and a valid email address, then try again."
    );
  });

  it("does not expose internal server errors", () => {
    expect(inquirySubmissionErrorMessage(new Error("Failed query: select ..."))).toBe(
      "We couldn't send your inquiry right now. Please try again, or email us directly at gustavo@rosecitystays.com."
    );
  });
});
