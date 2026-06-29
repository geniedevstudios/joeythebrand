import { getShippingRates } from "./src/lib/dhl";
import { config } from "dotenv";

config({ path: "./.env.local" });

async function test() {
  try {
    const res = await getShippingRates({
      destination: {
        city: "London",
        postalCode: "WC2N 5DU",
        countryCode: "GB"
      },
      weightKg: 1
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
