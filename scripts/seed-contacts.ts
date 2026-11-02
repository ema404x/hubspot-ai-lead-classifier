// Creates 30 fictional demo leads in a HubSpot TEST account. Each creation fires the webhook.
// Usage: npm run seed   (reads HUBSPOT_ACCESS_TOKEN from .dev.vars). Never run against a real client portal.

import { HubSpotClient } from "../src/hubspot";

const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (!token) throw new Error("Set HUBSPOT_ACCESS_TOKEN in .dev.vars");

type Lead = [firstname: string, lastname: string, jobtitle: string, company: string, message: string];

const LEADS: Lead[] = [
  // Enterprise-looking
  ["Laura", "Bennett", "VP of Sales Operations", "Halvorsen Logistics (4,000 employees)", "We need to consolidate 3 regional CRMs into one HubSpot portal before Q1. Looking for a partner for the integration work."],
  ["Marcus", "Okafor", "Director of IT", "Brightline Insurance Group", "Evaluating options to sync our policy system with HubSpot. 200 sales seats."],
  ["Ingrid", "Solberg", "Chief Revenue Officer", "Northpeak Manufacturing", "Our reps waste hours on data entry. Want to understand what automation is possible at our scale."],
  ["David", "Chen", "Head of Marketing Ops", "Meridian Health Systems", "Need lead routing across 12 hospitals, compliant with our data policies."],
  ["Sophie", "Laurent", "VP Digital", "Castellan Retail Group", "Planning a migration from Salesforce for 1,500 users. Timeline: next 6 months."],
  ["Rajesh", "Iyer", "Enterprise Architect", "Vantora Bank", "Interested in your API integration capabilities for our onboarding platform."],
  ["Emily", "Hart", "Director of Revenue Operations", "Corvid Software (900 employees)", "Looking for help building custom objects and syncing usage data from our product."],
  // SMB-looking
  ["Tom", "Riley", "Owner", "Riley & Sons Plumbing", "We just started using HubSpot free. Can you connect it to our booking tool?"],
  ["Ana", "Ferreira", "Founder", "Bloom Skincare (8 people)", "Want new Shopify customers to land in HubSpot automatically with their order total."],
  ["Kevin", "Murphy", "Office Manager", "Murphy Dental Clinic", "Our appointment software exports CSVs. Could that sync to HubSpot every night?"],
  ["Priya", "Nair", "Co-founder", "Tidewater Yoga Studios", "Need forms from our website to create deals with the class package selected."],
  ["Jonas", "Weber", "Marketing Lead", "Kleinhaus Furniture", "Small team, 3 users. Want to score leads based on catalog downloads."],
  ["Chloe", "Martin", "CEO", "Pathfinder Tutoring", "Parents fill a form, we call them back. Want HubSpot to assign them to tutors by subject."],
  ["Diego", "Ramos", "Sales Manager", "Ramos Solar Install", "We get leads from 2 ad platforms; duplicates everywhere. Need cleanup + dedupe."],
  ["Hannah", "Cole", "Operations", "Cole Family Bakery", "Wholesale orders come by email. Can they become HubSpot deals?"],
  // Partner-looking
  ["Oliver", "Grant", "Managing Partner", "Signal Growth Agency", "We're a HubSpot agency with too much integration work. Looking for a dev to white-label projects."],
  ["Mia", "Kowalski", "Founder", "Kowalski RevOps Consulting", "I implement HubSpot for clients and need a technical partner for custom code."],
  ["Lucas", "Moreau", "Partnerships Manager", "Stackwise Integrations", "We resell integration platforms and want to discuss a referral partnership."],
  ["Ava", "Thompson", "Agency Owner", "Brightside Digital", "Our clients keep asking for AI in their CRM. Could we partner on delivery?"],
  ["Noah", "Fischer", "Solutions Consultant", "CloudBridge Partners", "Exploring a reseller agreement for your services in the DACH region."],
  // Spam / not a lead
  ["Test", "Test", "", "", "test test 123"],
  ["Jake", "Miller", "Student", "State University", "Hi, I'm doing a school project on CRMs, can you answer some questions?"],
  ["Sarah", "Lee", "SEO Specialist", "RankBoost Services", "We can get your website to #1 on Google in 30 days! Reply for a free audit."],
  ["Ben", "Adams", "", "", "Are you hiring? I'd like to send my CV for a developer position."],
  ["asdf", "qwer", "", "", "asdfasdf"],
  ["Lena", "Park", "Lead Generation Expert", "LeadFlood", "Buy 10,000 verified B2B emails for only $99."],
  // Ambiguous (should produce lower confidence)
  ["Chris", "Morgan", "", "Gmail", "Interested, please send info."],
  ["Alex", "Taylor", "Consultant", "", "Do you work with HubSpot?"],
  ["Sam", "Rivera", "Manager", "Rivera Group", "Pricing?"],
  ["Jordan", "Blake", "Product Manager", "", "Curious how this works for a mid-size team."],
];

const hubspot = new HubSpotClient(token);
const runId = Date.now().toString(36);
let created = 0;

for (const [i, [firstname, lastname, jobtitle, company, message]] of LEADS.entries()) {
  const properties: Record<string, string> = {
    firstname,
    lastname,
    email: `demo-${runId}-${i}@example.com`,
    message,
  };
  if (jobtitle) properties.jobtitle = jobtitle;
  if (company) properties.company = company;

  const contact = await hubspot.createContact(properties);
  created++;
  console.log(`+ ${contact.id}  ${firstname} ${lastname} (${company || "no company"})`);
}

console.log(`\nCreated ${created} demo contacts. Check the "AI segment" column in HubSpot in ~30 seconds.`);
