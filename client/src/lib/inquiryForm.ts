export type InquiryDraft = {
  name: string;
  email: string;
  phone?: string;
  dates?: string;
  guests?: string;
  property?: string;
  message?: string;
};

const optionalTrimmed = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized || undefined;
};

/**
 * Normalize guest-entered text before submitting it to the public inquiry API.
 * This prevents an accidental leading/trailing space from making an otherwise
 * valid email or name fail server-side validation.
 */
export function normalizeInquiryDraft(form: InquiryDraft) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: optionalTrimmed(form.phone),
    dates: optionalTrimmed(form.dates),
    guests: optionalTrimmed(form.guests),
    property: optionalTrimmed(form.property),
    message: optionalTrimmed(form.message),
  };
}

/** Keep validation errors useful without exposing internal server details to guests. */
export function inquirySubmissionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("email") || message.includes("name") || message.includes("required")) {
    return "Please enter your full name and a valid email address, then try again.";
  }

  return "We couldn't send your inquiry right now. Please try again, or email us directly at gustavo@rosecitystays.com.";
}
