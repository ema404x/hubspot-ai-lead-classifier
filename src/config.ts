// Edit this file to adapt the classifier to a client's business.

export const SEGMENTS = [
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Company with 500+ employees, or a senior buyer (VP, Director, C-level) at a mid-size company.",
  },
  {
    value: "smb",
    label: "SMB",
    description: "Small or medium business, founder/owner or individual contributor with a real buying need.",
  },
  {
    value: "partner",
    label: "Partner",
    description: "Agency, consultant, reseller or integrator looking to partner rather than buy for themselves.",
  },
  {
    value: "spam",
    label: "Spam / not a lead",
    description: "Students, job seekers, vendors pitching services, test submissions, gibberish.",
  },
] as const;

export type Segment = (typeof SEGMENTS)[number]["value"];

// Contacts below this confidence get ai_needs_review = true.
export const REVIEW_THRESHOLD = 0.7;

// HubSpot contact properties sent to the model.
export const INPUT_PROPERTIES = ["firstname", "lastname", "email", "jobtitle", "company", "website", "message"];

export const OUTPUT_PROPERTIES = {
  segment: "ai_segment",
  reason: "ai_reason",
  confidence: "ai_confidence",
  needsReview: "ai_needs_review",
} as const;
