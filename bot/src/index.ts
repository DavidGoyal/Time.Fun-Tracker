import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_URL } from "./constants/constant";
import { createClient } from "redis";

const client = createClient();
async function main() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    await client.connect();

    // The wallet address you want to track
    const WALLET_TO_TRACK = "HW2Cg9ZYRGZRzXfdgc1pgGxdYduyVvYrYkg1H2PVLo1H";

    console.log(`Starting to monitor transactions for ${WALLET_TO_TRACK}`);

    // Subscribe to account changes
    const subscriptionId = connection.onLogs(
      new PublicKey(WALLET_TO_TRACK),
      (logs, ctx) => {
        console.log("New transaction detected!");
        console.log("Signature:", logs.signature);

        // Get detailed transaction info
        connection
          .getParsedTransaction(logs.signature, {
            maxSupportedTransactionVersion: 0,
          })
          .then(async (tx) => {
            if (tx) {
              const allInstructions = tx.transaction.message.instructions;
              console.log(allInstructions);
              const instruction = allInstructions.filter((instruction: any) => {
                return instruction?.parsed?.type === "initializeMint";
              });

              if (instruction.length == 0) return;
              //@ts-ignore
              const tokenAddress = instruction[0]?.parsed?.info?.mint;

              await client.lPush(
                "timefun",
                JSON.stringify({
                  address: tokenAddress,
                })
              );
            }
          })
          .catch(console.error);
      },
      "confirmed"
    );

    // Keep the script running
    process.on("SIGINT", async () => {
      console.log("Removing subscription...");
      await connection.removeOnLogsListener(subscriptionId);
      process.exit();
    });
  } catch (error) {
    console.log(error);
    await client.disconnect();
    process.exit(1);
  }
}

main();
