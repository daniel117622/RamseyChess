import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to server")
    
    # Emit the 'execute_game' event with required parameters
    sio.emit("execute_game", {
        "white_strategy_id": "671afaa69eb0593a9dea2024",
        "black_strategy_id": "671afaa69eb0593a9dea2024"
    })

@sio.event
def disconnect():
    print("Disconnected from server")

# Listen for 'move' events
@sio.on("move")
def on_move(data):
    print(f"Move received: {data}")

# Listen for 'game_end' events
@sio.on("game_end")
def on_game_end(data):
    print(f"Game ended: {data}")
    # Optionally disconnect after the game ends
    sio.disconnect()

# Handle errors
@sio.event
def error(data):
    print(f"Error: {data}")

@sio.event
def connect_error(data):
    print(f"Connection error: {data}")

# Connect to the Socket.IO server
sio.connect(
    "wss://ramseychess.net",
    transports=["websocket"],
    socketio_path="/socket.io"
)

sio.wait()
