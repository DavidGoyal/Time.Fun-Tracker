import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection } from "@solana/web3.js";
import axios from "axios";
import { createClient } from "redis";
import { RPC_URL, WEBHOOK_URL } from "./constants/constant";

const webhookUrl = WEBHOOK_URL;
const client = createClient();

export async function main() {
  await client.connect();
  const connection = new Connection(RPC_URL);
  const umi = createUmi(connection);

  while (true) {
    let mintAddress = null;
    try {
      const response = await client.brPop("timefun", 0);
      if (!response?.element) continue;
      const parsedResponse = JSON.parse(response?.element);
      mintAddress = parsedResponse.address;
      if (!mintAddress) continue;
      let name = null;

      // Fetch the metadata account

      const asset = await fetchDigitalAsset(umi, publicKey(mintAddress));
      console.log(asset.metadata.name);

      if (!asset.metadata.name) {
        throw new Error(`Failed to fetch metadata for ${mintAddress}`);
      }
      name = asset.metadata.name;

      const discordEmbedMessage = {
        username: "Time Fun Token Creation",
        embeds: [
          {
            title: "Time Fun Token Creation",
            description: `${name} has been created`,
            color: 5814783,
            fields: [
              {
                name: "Token Name",
                value: name,
              },
              {
                name: "Token Address",
                value: mintAddress,
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
        await new Promise((r) => setTimeout(r, 2000));
        await client.lPush("timefun", JSON.stringify({ address: mintAddress }));
      }
    }
  }
}

main();
