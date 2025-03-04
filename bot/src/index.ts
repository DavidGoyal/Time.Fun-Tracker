import { createClient } from "redis";
import WebSocket from "ws";
import { WS_URL } from "./constants/constant";

const client = createClient();
async function main() {
  try {
    // Create a WebSocket connection
    const ws = new WebSocket(WS_URL);

    // Function to send a request to the WebSocket server
    function sendRequest(ws: WebSocket) {
      const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
          {
            accountInclude: ["HW2Cg9ZYRGZRzXfdgc1pgGxdYduyVvYrYkg1H2PVLo1H"],
          },
          {
            commitment: "processed",
            encoding: "jsonParsed",
            transactionDetails: "full",
            showRewards: true,
            maxSupportedTransactionVersion: 0,
          },
        ],
      };
      ws.send(JSON.stringify(request));
    }

    // Function to send a ping to the WebSocket server
    function startPing(ws: WebSocket) {
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
          console.log("Ping sent");
        }
      }, 30000); // Ping every 30 seconds
    }

    // Define WebSocket event handlers

    ws.on("open", async function open() {
      console.log("WebSocket is open");
      await client.connect();
      sendRequest(ws); // Send a request once the WebSocket is open
      startPing(ws); // Start sending pings
    });

    ws.on("message", async function incoming(data) {
      const messageStr = data.toString("utf8");
      try {
        const messageObj = JSON.parse(messageStr);
        const allInstructions =
          messageObj?.params?.result?.transaction?.meta?.innerInstructions[0]
            ?.instructions || [];
        const instruction = allInstructions.filter((instruction: any) => {
          return instruction?.parsed?.type === "initializeMint";
        });

        if (instruction.length == 0) return;
        console.log(instruction[0]?.parsed?.info);
        const tokenAddress = instruction[0]?.parsed?.info?.mint;

        await client.lPush(
          "timefun",
          JSON.stringify({
            address: tokenAddress,
          })
        );
        console.log(instruction);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
      }
    });

    ws.on("error", function error(err) {
      console.error("WebSocket error:", err);
    });

    ws.on("close", function close() {
      console.log("WebSocket is closed");
      main();
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
