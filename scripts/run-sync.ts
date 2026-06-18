import "dotenv/config";
import { syncHostawayListings } from "../server/hostaway-sync";

const result = await syncHostawayListings();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
