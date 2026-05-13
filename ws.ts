import WebSocket, { WebSocketServer } from "ws"
import { createClient } from "redis";

const client = createClient();

const activeSubscriptions: Record<string, WebSocket[]> = {};

async function poll() {
    while(1) {
        const data = await client.brPop("engine-outgoing", 1)
        const parsedData = JSON.parse(data?.element);
        /// stream: "trade.SOL_USDC", value: 
        activeSubscriptions[parsedData.stream].forEach(ws => ws.send(parsedData.value));
    }
}
poll();

const wss = new WebSocketServer();

wss.on("connection", (socket) => {

    socket.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());
    
        // {"method":"SUBSCRIBE","params":["trade.SOL_USDC"],"id":1}
        // {"method":"SUBSCRIBE","params":["depth.SOL_USDC"],"id":1}
        if (parsedData.method === "SUBSCRIBE") {
            parsedData.params.forEach(param => {
                if (!activeSubscriptions[param]) {
                    activeSubscriptions[param] = [];
                }
                activeSubscriptions[param]!?.push(socket);
            })
        }
        if (parsedData.method === "UNSUBSCRIBE") {
            parsedData.params.forEach(param => {
                if (!activeSubscriptions[param]) {
                    activeSubscriptions[param] = [];
                }
                activeSubscriptions[param] = activeSubscriptions[param].filter(x => x == socket);
            })
        }
    })
    
    
})
