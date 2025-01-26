import socketio
import threading
import logging
import time
import json
import string
import random
import os
import argparse

logging.basicConfig(level=logging.DEBUG)

LOBBY_ID = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

PLAYER_ONE = {"name": "04b48562a5806299dd38739f08ba128f", "strategy": "6795b722952421428918ffa3"}
PLAYER_TWO = {"name": "72b3487269ec518a0d0294e382b612cb", "strategy": "6795cbb827b92dc18fc9a2a6"}

# Lists to store moves
player_one_moves = []
player_two_moves = []

def save_moves_to_file():
    try:
        data = {"p1": player_one_moves, "p2": player_two_moves}
        with open("game_moves.json", "w") as f:
            json.dump(data, f, indent=4)
        print("Game moves saved to game_moves.json")
    except Exception as e:
        print(f"Error saving moves to file: {e}")

def run_player_one():
    sio = socketio.Client(logger=True, engineio_logger=True)

    @sio.event
    def connect():
        print("Player One connected.")

    @sio.event
    def disconnect():
        print("Player One disconnected.")

    @sio.on('playerJoined')
    def on_player_joined(data):
        print(f"Player One received playerJoined event: {data}")

    @sio.on('playerReadyUpdate')
    def on_player_ready_update(data):
        print(f"Player One received playerReadyUpdate event: {data}")

    @sio.on('gameStarted')
    def on_game_started(data):
        print(f"Player One received gameStarted event: {data}")

    @sio.on('move')
    def on_move(data):
        print(f"Player One received move: {data}")
        player_one_moves.append(data)

    @sio.on('game_end')
    def on_game_end(data):
        print(f"Player One received game_end: {data}")
        sio.disconnect()

    try:
        sio.connect("wss://ramseychess.net/socket.io/", transports=["websocket"])
        sio.emit("playerjoin", {"lobbyId": LOBBY_ID, "name": PLAYER_ONE["name"]})
        time.sleep(1)
        sio.emit("playerReady", {
            "ready": True,
            "name": PLAYER_ONE["name"],
            "lobbyId": LOBBY_ID,
            "selected_strategy": PLAYER_ONE["strategy"]
        })
        sio.wait()
    except socketio.exceptions.ConnectionError as e:
        print(f"Player One failed to connect: {e}")

def run_player_two():
    sio = socketio.Client(logger=True, engineio_logger=True)

    @sio.event
    def connect():
        print("Player Two connected.")

    @sio.event
    def disconnect():
        print("Player Two disconnected.")
        save_moves_to_file()

    @sio.on('playerJoined')
    def on_player_joined(data):
        print(f"Player Two received playerJoined event: {data}")

    @sio.on('playerReadyUpdate')
    def on_player_ready_update(data):
        print(f"Player Two received playerReadyUpdate event: {data}")

    @sio.on('gameStarted')
    def on_game_started(data):
        print(f"Player Two received gameStarted event: {data}")

    @sio.on('move')
    def on_move(data):
        print(f"Player Two received move: {data}")
        player_two_moves.append(data)

    @sio.on('game_end')
    def on_game_end(data):
        print(f"Player Two received game_end: {data}")
        save_moves_to_file()
        sio.disconnect()

    try:
        sio.connect("wss://ramseychess.net/socket.io/", transports=["websocket"])
        sio.emit("playerjoin", {"lobbyId": LOBBY_ID, "name": PLAYER_TWO["name"]})
        time.sleep(2)
        sio.emit("playerReady", {
            "ready": True,
            "name": PLAYER_TWO["name"],
            "lobbyId": LOBBY_ID,
            "selected_strategy": PLAYER_TWO["strategy"]
        })
        sio.emit("execute_game", {
            "lobbyId": LOBBY_ID,
            "white_strategy_id": PLAYER_ONE["strategy"],
            "black_strategy_id": PLAYER_TWO["strategy"]
        })
        sio.wait()
    except socketio.exceptions.ConnectionError as e:
        print(f"Player Two failed to connect: {e}")
        save_moves_to_file()

import argparse

def parse_arguments():
    parser = argparse.ArgumentParser(description="Run a test game or analyze game moves.")
    parser.add_argument('--g', action='store_true', help="Run the test game protocol.")
    parser.add_argument('-r', action='store_true', help="Read and analyze game_moves.json.")
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()

    if args.g:
        player_one_thread = threading.Thread(target=run_player_one)
        player_two_thread = threading.Thread(target=run_player_two)

        player_one_thread.start()
        time.sleep(6)
        player_two_thread.start()

        player_one_thread.join()
        player_two_thread.join()

    elif args.r:
        with open("game_moves.json", "r") as f:
            game_moves = json.load(f)
            p1_moves = game_moves.get("p1", [])
            p2_moves = game_moves.get("p2", [])

            max_length = max(len(p1_moves), len(p2_moves))
            column_width = 12  # Fixed width for each field

            # Print the column headers
            print(f"{'P1 Move':<{column_width}}{'P2 Move':<{column_width}}"
                f"{'P1 Turn':<{column_width}}{'P2 Turn':<{column_width}}"
                f"{'P1 FEN':<{column_width}}{'P2 FEN':<{column_width}}"
                f"{'P1 Result':<{column_width}}{'P2 Result':<{column_width}}")

            print("-" * (column_width * 8))

            for i in range(max_length):
                p1_move = p1_moves[i]["move"][:6] if i < len(p1_moves) else ""
                p2_move = p2_moves[i]["move"][:6] if i < len(p2_moves) else ""
                p1_turn = p1_moves[i]["turn"][:6] if i < len(p1_moves) else ""
                p2_turn = p2_moves[i]["turn"][:6] if i < len(p2_moves) else ""
                p1_fen = p1_moves[i]["current_fen"][:6] if i < len(p1_moves) else ""
                p2_fen = p2_moves[i]["current_fen"][:6] if i < len(p2_moves) else ""
                p1_result = p1_moves[i]["result"][:6] if i < len(p1_moves) else ""
                p2_result = p2_moves[i]["result"][:6] if i < len(p2_moves) else ""

                print(f"{p1_move:<{column_width}}{p2_move:<{column_width}}"
                    f"{p1_turn:<{column_width}}{p2_turn:<{column_width}}"
                    f"{p1_fen:<{column_width}}{p2_fen:<{column_width}}"
                    f"{p1_result:<{column_width}}{p2_result:<{column_width}}")


