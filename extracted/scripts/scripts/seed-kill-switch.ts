import { db } from "../src/lib/db";

async function main() {
  const flags = [
    { key: "KILL_SWITCH_ALL_AI", label: "Kill Switch — All AI", description: "When DISABLED, blocks every AI gateway operation immediately. Use only in emergencies.", enabled: true, rolloutPct: 100 },
    { key: "ENABLE_COMMUNITY_QA", label: "Community Q&A", description: "Public Q&A community page (/community)", enabled: true, rolloutPct: 100 },
    { key: "ENABLE_EXPERT_CONSULT", label: "Expert Consultation", description: "Allow buyers to request expert consultation on listings", enabled: true, rolloutPct: 100 },
    { key: "ENABLE_USER_SEARCH_MEMORY", label: "User Search Memory", description: "Track per-user search history for personalisation", enabled: true, rolloutPct: 100 },
    { key: "ENABLE_PARTNER_NETWORK", label: "Partner Network", description: "Show partner directory", enabled: true, rolloutPct: 100 },
  ];
  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: f,
      update: { label: f.label, description: f.description },
    });
    console.log("Upserted flag:", f.key);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
