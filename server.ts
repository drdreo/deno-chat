import { serve } from 'https://deno.land/std/http/server.ts';
import {
    acceptWebSocket,
    isWebSocketCloseEvent,
    isWebSocketPingEvent,
    WebSocket,
} from './mod.ts';

let clients = [];

async function main(): Promise<void> {
    console.log('WebSocket listening on 0.0.0.0:3000');

    for await (const req of serve(':3000')) {
        const {headers, conn, url} = req;
        console.log('Request ', url);

        acceptWebSocket({
            conn,
            headers,
            bufReader: req.r,
            bufWriter: req.w,
        }).then(async (sock: WebSocket): Promise<void> => {
            console.log('Socket connected!');
            clients.push(sock);

            const it = sock.receive();
            while (true) {
                try {
                    const {done, value} = await it.next();
                    if (done) {
                        break;
                    }
                    const ev = value;
                    if (typeof ev === 'string') {
                        // text message
                        console.log('ws:Text', ev);

                        // text message
                        for (const client of clients) {
                            await client.send(ev);
                            console.log('message sent to client');
                        }
                    } else if (ev instanceof Uint8Array) {
                        // binary message
                        console.log('ws:Binary', ev);
                    } else if (isWebSocketPingEvent(ev)) {
                        const [, body] = ev;
                        // ping
                        console.log('ws:Ping', body);
                    } else if (isWebSocketCloseEvent(ev)) {
                        // close
                        const {code, reason} = ev;
                        console.log('ws:Close', code, reason);

                        //remove socket from clients
                        clients = clients.filter(s => s.conn.rid !== sock.conn.rid);
                    }
                } catch (e) {
                    console.error(`failed to receive frame: ${e}`);
                    await sock.close(1000).catch(console.error);
                }
            }
        }).catch((err: Error): void => {
            console.error(`failed to accept websocket: ${err}`);
        });
    }
}

if (import.meta.main) {
    main();
}
