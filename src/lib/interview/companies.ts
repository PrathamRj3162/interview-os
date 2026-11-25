/**
 * Company style map — for STYLE PRACTICE ONLY. These are broad, commonly reported characteristics of each
 * company's SDE interview loop (from public candidate write-ups and company career pages), summarised in our
 * own words. They are NOT actual interview questions, not insider information, and loops change over time
 * and by team. The interviewer is told the same and never claims a question was asked at the company.
 */
export type CompanyStyle = {
  name: string;
  segment: "Big tech" | "Product (India)" | "Fintech" | "Enterprise" | "Services";
  /** Commonly reported loop shape, briefly. */
  loop: string;
  /** Topic tags from our problem bank to emphasise in DSA practice. */
  dsaTopics: string[];
  /** Other areas to emphasise. */
  focus: string[];
  /** Themes for behavioural questions. */
  values: string[];
};

export const COMPANY_STYLES: CompanyStyle[] = [
  { name: "Google", segment: "Big tech", loop: "Online assessment, then several coding rounds with a strong algorithms focus, and a behavioural ('Googleyness') round; design for experienced roles.", dsaTopics: ["Graph", "Dynamic programming", "Tree", "Binary search", "String"], focus: ["clean, optimal code", "complexity analysis", "edge cases"], values: ["collaboration", "handling ambiguity", "user focus"] },
  { name: "Amazon", segment: "Big tech", loop: "Online assessment, then coding rounds where each also probes Leadership Principles, plus a bar-raiser round.", dsaTopics: ["Array", "Hash map", "Tree", "Graph", "Heap"], focus: ["STAR stories for every round", "practical problem solving", "ownership"], values: ["customer obsession", "ownership", "bias for action", "dive deep"] },
  { name: "Microsoft", segment: "Big tech", loop: "Coding rounds (often whiteboard-style reasoning), some design, and an 'as appropriate' final round.", dsaTopics: ["Linked list", "Tree", "String", "Array", "Dynamic programming"], focus: ["explaining your thinking", "testing your code", "OOP basics"], values: ["growth mindset", "collaboration", "customer empathy"] },
  { name: "Meta", segment: "Big tech", loop: "Fast-paced coding rounds (often two problems each), a behavioural round, and system design for experienced roles.", dsaTopics: ["Array", "String", "Tree", "Graph", "Two pointers"], focus: ["speed with correctness", "two problems per round", "talking while coding"], values: ["moving fast", "impact", "conflict resolution"] },
  { name: "Apple", segment: "Big tech", loop: "Team-specific loops: coding, domain depth for the team, and detailed discussion of past projects.", dsaTopics: ["Array", "String", "Linked list", "Tree"], focus: ["depth in your own projects", "attention to detail", "domain fundamentals"], values: ["craftsmanship", "privacy", "cross-team collaboration"] },
  { name: "Netflix", segment: "Big tech", loop: "Mostly experienced hires: practical coding, system design, and a strong culture-fit conversation.", dsaTopics: ["Hash map", "Graph", "Intervals"], focus: ["system design trade-offs", "practical code", "judgement"], values: ["freedom and responsibility", "candour", "context not control"] },
  { name: "Uber", segment: "Big tech", loop: "Coding rounds with practical problems, a design round, and a collaboration/values round.", dsaTopics: ["Graph", "Heap", "Hash map", "Intervals"], focus: ["real-world modelling", "scalability", "clear code"], values: ["ownership", "customer focus", "doing the right thing"] },
  { name: "Adobe", segment: "Big tech", loop: "Online test, coding and problem-solving rounds, CS fundamentals, and a hiring-manager round.", dsaTopics: ["Array", "String", "Tree", "Dynamic programming"], focus: ["OOP and OS basics", "puzzles and reasoning", "project discussion"], values: ["creativity", "ownership", "customer impact"] },
  { name: "Atlassian", segment: "Big tech", loop: "Coding (often practical, code-quality focused), system design, and a values interview.", dsaTopics: ["Hash map", "String", "Intervals", "Graph"], focus: ["readable, extensible code", "testing", "design trade-offs"], values: ["open company, no BS", "play as a team", "don't #@!% the customer"] },
  { name: "Salesforce", segment: "Enterprise", loop: "Coding rounds, a design or architecture round, and a values/behavioural round.", dsaTopics: ["Array", "Hash map", "Tree", "String"], focus: ["OOP design", "APIs and data modelling", "communication"], values: ["trust", "customer success", "equality"] },
  { name: "Oracle", segment: "Enterprise", loop: "Coding and CS fundamentals rounds (DBMS and OS feature often), then managerial rounds.", dsaTopics: ["Array", "Linked list", "Tree", "String"], focus: ["DBMS and SQL", "OS concepts", "OOP"], values: ["ownership", "learning", "teamwork"] },
  { name: "Walmart", segment: "Product (India)", loop: "Online assessment, coding rounds, a design round, and a hiring-manager round (Walmart Global Tech).", dsaTopics: ["Array", "Tree", "Dynamic programming", "Graph"], focus: ["scale and reliability", "data modelling", "projects"], values: ["customer focus", "integrity", "teamwork"] },
  { name: "Flipkart", segment: "Product (India)", loop: "Online coding test, problem-solving/DSA rounds, a machine-coding or design round, and a hiring-manager round.", dsaTopics: ["Dynamic programming", "Graph", "Tree", "Binary search", "Heap"], focus: ["machine coding (working code in ~90 min)", "LLD", "optimal solutions"], values: ["customer first", "bias for action", "ownership"] },
  { name: "Swiggy", segment: "Product (India)", loop: "DSA rounds, a machine-coding or LLD round, system design for experienced roles, and a culture round.", dsaTopics: ["Graph", "Heap", "Hash map", "Intervals"], focus: ["LLD and machine coding", "real-time systems", "trade-offs"], values: ["customer obsession", "ownership", "speed"] },
  { name: "Zomato", segment: "Product (India)", loop: "Problem-solving rounds, practical coding/design, and a founder- or manager-style culture discussion.", dsaTopics: ["Array", "Hash map", "Graph", "String"], focus: ["product thinking", "practical design", "projects"], values: ["ownership", "resilience", "customer focus"] },
  { name: "PhonePe", segment: "Fintech", loop: "DSA rounds, machine coding / LLD, system design, and a hiring-manager round.", dsaTopics: ["Graph", "Dynamic programming", "Heap", "Tree"], focus: ["concurrency basics", "LLD", "reliability for payments"], values: ["ownership", "integrity", "customer first"] },
  { name: "Razorpay", segment: "Fintech", loop: "Coding and problem-solving, machine coding or LLD, system design, and a culture round.", dsaTopics: ["Hash map", "Intervals", "Graph", "String"], focus: ["API design", "idempotency and consistency", "clean code"], values: ["transparency", "customer obsession", "agility"] },
  { name: "CRED", segment: "Fintech", loop: "Coding and problem-solving, a design/craft round, and a high-bar culture conversation.", dsaTopics: ["Array", "Graph", "Dynamic programming"], focus: ["code quality and craft", "design depth", "product sense"], values: ["craftsmanship", "ownership", "high standards"] },
  { name: "Paytm", segment: "Fintech", loop: "Online test, DSA rounds, CS fundamentals or design, and a managerial round.", dsaTopics: ["Array", "String", "Linked list", "Dynamic programming"], focus: ["DBMS and OS basics", "projects", "payments reliability"], values: ["ownership", "speed", "integrity"] },
  { name: "Goldman Sachs", segment: "Fintech", loop: "Online assessment (coding plus aptitude), then technical rounds on DSA and CS fundamentals, and a behavioural/fit round.", dsaTopics: ["Array", "Dynamic programming", "String", "Linked list"], focus: ["CS fundamentals", "math and probability basics", "clean reasoning"], values: ["teamwork", "integrity", "client service"] },
  { name: "Zoho", segment: "Product (India)", loop: "Written/programming tests, an advanced programming round (often application-style), and technical plus HR rounds.", dsaTopics: ["String", "Array", "Matrix"], focus: ["writing complete programs", "logic without libraries", "C/Java fundamentals"], values: ["long-term commitment", "learning", "frugality"] },
  { name: "Freshworks", segment: "Product (India)", loop: "Coding test, DSA and practical coding rounds, design for experienced roles, and a culture round.", dsaTopics: ["Array", "Hash map", "Tree", "String"], focus: ["practical coding", "OOP", "projects"], values: ["customer delight", "teamwork", "ownership"] },
  { name: "TCS", segment: "Services", loop: "National-level aptitude and coding test, then technical, managerial and HR interviews (track depends on the score).", dsaTopics: ["Array", "String", "Sorting"], focus: ["programming basics", "OOP and DBMS concepts", "your final-year project"], values: ["adaptability", "communication", "learning attitude"] },
  { name: "Infosys", segment: "Services", loop: "Online aptitude and coding test, then a technical interview and HR; higher tracks add harder coding.", dsaTopics: ["Array", "String", "Sorting"], focus: ["basics in your chosen language", "DBMS and OOP", "projects"], values: ["learnability", "communication", "teamwork"] },
  { name: "Accenture", segment: "Services", loop: "Cognitive and technical assessment, coding test, communication assessment, then an interview.", dsaTopics: ["Array", "String"], focus: ["communication", "programming basics", "cloud and agile awareness"], values: ["client value", "teamwork", "adaptability"] },
];

export const COMPANY_BY_NAME: Record<string, CompanyStyle> = Object.fromEntries(COMPANY_STYLES.map((c) => [c.name, c]));
export const COMPANY_DISCLAIMER = "Style practice — not actual company questions. Based on commonly reported interview formats; loops vary by team and change over time.";

/** Prompt lines for the interviewer when a target company is set. */
export function companyPrompt(name: string | null): string {
  const c = name ? COMPANY_BY_NAME[name] : null;
  if (!c) return "";
  return [
    `Company style practice for ${c.name} (${COMPANY_DISCLAIMER}).`,
    `Commonly reported loop: ${c.loop}`,
    `Emphasise: ${c.focus.join("; ")}. DSA topics to favour: ${c.dsaTopics.join(", ")}. Behavioural themes: ${c.values.join(", ")}.`,
    `Never say or imply that a question was actually asked at ${c.name}.`,
  ].join("\n");
}
