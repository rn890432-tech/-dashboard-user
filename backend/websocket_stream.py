# websocket_stream.py
# Pushes new nodes and edges to InvestigationGraph in real time
import asyncio
import websockets
import json

clients = set()

async def handler(websocket, path):
    clients.add(websocket)
    try:
        async for message in websocket:
            # Broadcast received message to all clients
            for client in clients:
                if client != websocket:
                    await client.send(message)
    finally:
        clients.remove(websocket)

async def push_update(data):
    msg = json.dumps(data)
    for client in clients:
        await client.send(msg)

start_server = websockets.serve(handler, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
