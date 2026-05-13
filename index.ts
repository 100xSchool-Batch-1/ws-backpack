import axios from "axios";

type Orderbook = {
    bids: Record<string, string>,
    asks: Record<string, string>
}

const orderbook: Orderbook = {bids: {}, asks: {}};
let orderbookInitialised = false;
const ws = new WebSocket("wss://ws.backpack.exchange/");
const buffer: {updatedBids: [[string, string]], updatedAsks: [[string, string]], startOffset: number, endOffset: number}[] = [];

function updateOrderbook(updatedAsks: [[string, string]], updatedBids: [[string, string]]) {
    updatedAsks.forEach(([price, qty]: [string, string]) => {
        orderbook.asks[price] = qty;
    });

    updatedBids.forEach(([price, qty]: [string, string]) => {
        orderbook.bids[price] = qty;
    });
}

ws.onmessage = (msg) => {
    const parsedMessage = JSON.parse(msg.data);
    const updatedBids = parsedMessage.data.b
    const updatedAsks = parsedMessage.data.a;
    const startOffset = parsedMessage.data.U
    const endOffset = parsedMessage.data.u;
    
    if (!orderbookInitialised) {
        buffer.push({updatedAsks, updatedBids, startOffset, endOffset});
    } else {
         updateOrderbook(updatedAsks, updatedBids);
    }
};

ws.onopen =  async () => {
    ws.send(JSON.stringify({"method":"SUBSCRIBE","params":["depth.200ms.SOL_USDC"],"id":3}));

    const res = await axios.get("https://api.backpack.exchange/api/v1/depth?symbol=SOL_USDC")
    const {bids, asks, lastUpdateId} = res.data;

    bids.forEach(([price, qty]: [string, string]) => orderbook.bids[price] = qty)
    asks.forEach(([price, qty]: [string, string]) => orderbook.asks[price] = qty)
    orderbookInitialised = true;
    buffer.forEach(msg => {
        if (lastUpdateId > msg.endOffset) {
            
        } else {
            updateOrderbook(asks, bids);
        }
    })
};

setInterval(() => {

    const bestBid = Object.keys(orderbook.bids).sort((a, b) => Number(b) - Number(a))[0];
    const bestAsk = Object.keys(orderbook.asks).sort((a, b) => Number(a) - Number(b))[0];
    console.log(bestBid)
    console.log(bestAsk)
}, 1000)