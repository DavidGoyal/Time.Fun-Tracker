import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection } from "@solana/web3.js";
import axios from "axios";
import { createClient } from "redis";
import { RPC_URL, WEBHOOK_URL } from "./constants/constant";

const client = createClient();
const webhookUrl = WEBHOOK_URL;

export async function main() {
  const connection = new Connection(RPC_URL);
  const umi = createUmi(connection);

  await client.connect();
  while (true) {
    let mintAddress = null;
    try {
      const response = await client.brPop("timefun", 0);
      if (!response?.element) continue;
      const parsedResponse = JSON.parse(response?.element);
      const mintAddress = parsedResponse.address;
      if (!mintAddress) continue;

      // Fetch the metadata account
      const asset = await fetchDigitalAsset(umi, publicKey(mintAddress));
      console.log(asset.metadata.name);

      const discordEmbedMessage = {
        username: "Time Fun Token Creation",
        embeds: [
          {
            title: "Time Fun Token Creation",
            description: `${asset.metadata.name} has been created`,
            color: 5814783,
            fields: [
              {
                name: "Token Name",
                value: asset.metadata.name,
              },
            ],
          },
        ],
      };

      await axios.post(webhookUrl, discordEmbedMessage, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.log(error);
      if (mintAddress) {
        await client.lPush("timefun", JSON.stringify({ address: mintAddress }));
      }
    }
  }
}

main();
