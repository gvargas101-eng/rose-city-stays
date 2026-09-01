import { syncAllHostawayGuests } from "../server/hostaway-guests";

async function main() {
  const summary = await syncAllHostawayGuests("historical");
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error("Guest import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
