// Creates the ai_* contact properties in HubSpot (safe to run more than once).
// Usage: npm run setup:properties   (reads HUBSPOT_ACCESS_TOKEN from .dev.vars)

import { OUTPUT_PROPERTIES, SEGMENTS } from "../src/config";
import { HubSpotClient } from "../src/hubspot";

const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (!token) throw new Error("Set HUBSPOT_ACCESS_TOKEN in .dev.vars");

const groupName = "contactinformation";

const definitions = [
  {
    name: OUTPUT_PROPERTIES.segment,
    label: "AI segment",
    type: "enumeration",
    fieldType: "select",
    groupName,
    options: SEGMENTS.map((s, i) => ({ label: s.label, value: s.value, displayOrder: i })),
  },
  { name: OUTPUT_PROPERTIES.reason, label: "AI reason", type: "string", fieldType: "textarea", groupName },
  { name: OUTPUT_PROPERTIES.confidence, label: "AI confidence", type: "number", fieldType: "number", groupName },
  {
    name: OUTPUT_PROPERTIES.needsReview,
    label: "AI needs review",
    type: "bool",
    fieldType: "booleancheckbox",
    groupName,
    options: [
      { label: "Yes", value: "true", displayOrder: 0 },
      { label: "No", value: "false", displayOrder: 1 },
    ],
  },
];

const hubspot = new HubSpotClient(token);
for (const def of definitions) {
  if (await hubspot.propertyExists(def.name)) {
    console.log(`= ${def.name} already exists`);
    continue;
  }
  await hubspot.createProperty(def);
  console.log(`+ created ${def.name}`);
}
