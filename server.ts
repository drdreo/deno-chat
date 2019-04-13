import { serve } from "https://deno.land/x/http/server.ts";
// import { acceptWebSocket, isWebSocketCloseEvent, isWebSocketPingEvent } from "https://deno.land/x/ws/mod.ts";
import { acceptWebSocket, isWebSocketCloseEvent } from "./ws.ts";

let clients = [];

async function main() {
    console.log("WebSocket listening on 0.0.0.0:3000");

    for await (const req of serve("0.0.0.0:3000")) {

        console.log("Request ", req.url);

        if (req.url === "/ws") {
            (async () => {
                const sock = await acceptWebSocket(req);
                clients.push(sock);
                console.log("Socket connected!");

                for await (const ev of sock.receive()) {
                    console.log("Socket received an event", ev);
                    if (typeof ev === "string") {
                        // text message
                        for (const client of clients) {
                            await client.send(ev);
                            console.log("message sent to client");
                        }
                    } else if (isWebSocketCloseEvent(ev)) {
                        // close
                        const { code, reason } = ev;
                        console.log("Disconnected", code, reason);
                        sock.close(code, reason);
                        //  clients = clients.filter(s => s.conn.rid === sock.conn.rid);
                    }
                }
            })().catch(e => {
                console.error(e);
            });
        } else {
            req.respond({ body: new TextEncoder().encode("Hello World\n") });
        }
    }
}

main();
