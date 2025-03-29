from flask import Blueprint
from flask_socketio import SocketIO, emit, disconnect , join_room
import chess
import time
import logging
import requests
import chess.pgn

import hashlib
import json
from data_access.strategy_cards_manager import AiPremadeManager
from data_access.material_manager import EvaluateMaterialManager
from evaluators.material_evaluator import MaterialEvaluator
from minimax import Minimax
from utils.socket_exception import exception_handler


socketio_routes = Blueprint('socketio_blueprint', __name__)

pvp_lobbies = {}
cloud_function_url = "https://us-central1-ramseychess.cloudfunctions.net/minimax_handler"

class GameLogger:
    """ Logger for execute_game() to keep debug logs structured and clean. """
    def __init__(self, debug: bool):
        self.debug = debug

    def log(self, message: str):
        """ Print logs only if debug mode is enabled. """
        if self.debug:
            logging.info(message)


def register_socketio_events(socketio):
    @socketio.on('connect')
    def test_connect():
        print('Client connected')
        emit('lobby_state', pvp_lobbies)

    @socketio.on('disconnect')
    def test_disconnect():
        print('Client disconnected')

    @socketio.on('execute_game')
    @exception_handler()
    def execute_game(data):
        socketio.sleep(0)

        # Extract game parameters from request
        white_strategy = data.get("white_strategy_id")
        black_strategy = data.get("black_strategy_id")
        lobby_id = data.get("lobbyId", None)

        # Initialize logger
        logger = GameLogger(True)

        logger.log("🔹 execute_game event received!")

        # Validate input parameters
        if not white_strategy or not black_strategy:
            logger.log("⚠️ Missing strategy parameters")
            emit('error', {'message': 'Missing required fields: white_strategy and black_strategy'})
            disconnect()
            return

        logger.log(f"🔹 White Strategy: {white_strategy}, Black Strategy: {black_strategy}")

        # Game setup
        board = chess.Board()  # Standard starting position
        depth = 2  # Fixed depth

        # Access database to get both AI strategy repositories
        ai_manager_white = AiPremadeManager()
        ai_manager_black = AiPremadeManager()

        # Load strategies by ID
        ai_manager_white.loadById(white_strategy)
        ai_manager_black.loadById(black_strategy)

        # Get the list of strategy types used by each player
        white_strategy_list = ai_manager_white.getCurrent()["strategy_list"]
        black_strategy_list = ai_manager_black.getCurrent()["strategy_list"]

        # Available manager classes mapped by type
        available_managers = {
            "evaluate_material": EvaluateMaterialManager
        }
        available_scorers = {
            "evaluate_material": MaterialEvaluator
        }

        def load_evaluators(strategy_list):
            loaded_evaluators = []
            for strategy in strategy_list:
                collection = strategy["collection"]
                evaluator_id = strategy["strat_id"]

                if collection in available_managers:
                    manager = available_managers[collection]()
                    manager.loadById(evaluator_id)
                    eval_manager = manager.getCurrent()

                    scoring_executor = available_scorers[collection](eval_manager=eval_manager, board=board)
                    loaded_evaluators.append(scoring_executor)

            return loaded_evaluators

        # Load evaluators for both White and Black
        white_evaluators = load_evaluators(white_strategy_list)
        black_evaluators = load_evaluators(black_strategy_list)

        # Initialize Minimax with correct evaluators
        move_count = 0
        max_moves = 300
        last_move_time = time.time()

        logger.log("🔹 Game loop starting...")
        

        while not board.is_game_over() and move_count < max_moves:
            is_white_turn = board.turn == chess.WHITE
            logger.log(f"🔹 Turn {move_count + 1}: {'White' if is_white_turn else 'Black'} to move.")

            # Set board for evaluators
            for evaluator in white_evaluators:
                evaluator.set_board(board)
            for evaluator in black_evaluators:
                evaluator.set_board(board)

            try:
                # Cloud Function API endpoint
                cloud_function_url = "https://us-central1-ramseychess.cloudfunctions.net/minimax_handler"
                # Prepare request payload
                data = {
                    "white_evaluators": [
                        {str(evaluator.__class__.__name__): {**evaluator.to_json(), "board_fen": board.fen()}}
                        for evaluator in white_evaluators
                    ],
                    "black_evaluators": [
                        {str(evaluator.__class__.__name__): {**evaluator.to_json(), "board_fen": board.fen()}}
                        for evaluator in black_evaluators
                    ],
                    "depth": depth,
                    "debug": False
                }

                # Make request to Cloud Function
                response = requests.post(cloud_function_url, json=data)
                response_data = response.json()

                # Extract best move
                best_move_uci = response_data.get("best_move")
                if not best_move_uci:
                    logger.log("⚠️ No move received from API! Breaking the loop.")
                    break

                best_move = chess.Move.from_uci(best_move_uci)
                logger.log(f"✅ Move found: {best_move_uci}")

                # Ensure at least 0.5s between moves
                time.sleep(max(0, last_move_time + 0.5 - time.time()))

                
                board.push(best_move)
                current_fen = board.fen()
                # Check if the game is over
                if board.is_checkmate():
                    winner_strategy_id = white_strategy if board.turn == chess.BLACK else black_strategy
                    loser_strategy_id  = black_strategy if board.turn == chess.BLACK else white_strategy
                    winner_color       = "white" if board.turn        == chess.BLACK else "black"
                    loser_color        = "black" if winner_color      == "white" else "white"
                    game_date          = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())  # current UTC time

                    # Generate PGN (Portable Game Notation)
                    game_obj = chess.pgn.Game()

                    node = game_obj
                    for move in board.move_stack:
                        node = node.add_variation(move)
                        
                    game_obj.headers["Result"] = "1-0" if winner_color == "white" else "0-1"
                    game_obj.headers["Date"]   = game_date
                    game_obj.headers["Event"]  = "RAMSEYCHESS.NET PVP GAME BETA"
                    game_obj.headers["White"]  = white_strategy
                    game_obj.headers["Black"]  = black_strategy
                    game_obj.headers["Site"]   = "HTTPS://RAMSEYCHESS.NET"
                    game_pgn = game_obj.accept(chess.pgn.StringExporter())

                    # Generate checksum
                    checksum = generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, current_fen)

                    # Emit game_end event with checksum
                    emit('game_end', {
                        'type': 'game_end',
                        'move': best_move_uci,
                        'current_fen': current_fen,
                        'turn': 'w' if board.turn == chess.WHITE else 'b',
                        'result': {
                            'result_type': '+' if winner_color == 'white' else '-',
                            'winner': {
                                'strategy_id': winner_strategy_id,
                                'color': winner_color
                            },
                            'loser': {
                                'strategy_id': loser_strategy_id,
                                'color': loser_color
                            },
                            'date': game_date,
                            'game_pgn': game_pgn,
                            'checksum': checksum
                        }
                    }, to=lobby_id)

                    logger.log(f"🏆 Checkmate! Winner Strategy ID: {winner_strategy_id}, Color: {winner_color}, Date: {game_date}")
                    logger.log(f"📜 Game PGN:\n{game_pgn}")
                    logger.log(f"🔐 Checksum: {checksum}")
                    try:
                        game_payload = {
                            "white_strategy_id": white_strategy if winner_color == "white" else black_strategy,
                            "black_strategy_id": black_strategy if winner_color == "white" else white_strategy,
                            "game_date"        : game_date,
                            "pgn"              : game_pgn,
                            "owner"            : "system"  
                        }
                        response = requests.post("http://localhost:5000/post_pvp_game", json=game_payload)
                    except Exception as e:
                        logger.log(f"❌ Exception during local request: {e}")

                    break  # Exit the game loop
                elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fifty_moves():
                    # Inline draw logic:
                    result_type        = "*"  # Indicates a draw
                    winner_strategy_id = None
                    loser_strategy_id  = None
                    winner_color       = "none"  # No winner in a draw
                    loser_color        = "none"   # No loser in a draw
                    game_date          = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())  # Current UTC time

                    # Generate PGN (Portable Game Notation)
                    game_obj = chess.pgn.Game()
                    
                    node = game_obj
                    for move in board.move_stack:
                        node = node.add_variation(move)
                    game_obj.headers["Result"] = "1/2-1/2"
                    game_obj.headers["Date"]   = game_date
                    game_obj.headers["Event"]  = "RAMSEYCHESS.NET PVP GAME BETA"
                    game_obj.headers["White"]  = white_strategy
                    game_obj.headers["Black"]  = black_strategy
                    game_obj.headers["Site"]   = "HTTPS://RAMSEYCHESS.NET"
                    game_pgn = game_obj.accept(chess.pgn.StringExporter())
                    

                    # Generate checksum using your checksum function
                    checksum = generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, current_fen)

                    # Emit game_end event with the draw result
                    emit('game_end', {
                        'type': 'game_end',
                        'move': best_move_uci,
                        'current_fen': current_fen,
                        'turn': 'w' if board.turn == chess.WHITE else 'b',
                        'result': {
                            'result_type': result_type,  
                            'winner': {
                                'strategy_id': winner_strategy_id,
                                'color': winner_color
                            } if result_type != '*' else None,  
                            'loser': {
                                'strategy_id': loser_strategy_id,
                                'color': loser_color
                            } if result_type != '*' else None,  
                            'date': game_date,
                            'game_pgn': game_pgn,
                            'checksum': checksum
                        }
                    }, to=lobby_id)

                    logger.log(f"⚖️ Draw! No winner, game ended in a draw. Date: {game_date}")
                    logger.log(f"📜 Game PGN:\n{game_pgn}")
                    logger.log(f"🔐 Checksum: {checksum}")
                    try:
                        game_payload = {
                            "white_strategy_id": white_strategy if winner_color == "white" else black_strategy,
                            "black_strategy_id": black_strategy if winner_color == "white" else white_strategy,
                            "game_date"        : game_date,
                            "pgn"              : game_pgn,
                            "owner"            : "system"  
                        }
                        response = requests.post("http://localhost:5000/post_pvp_game", json=game_payload)
                    except Exception as e:
                        logger.log(f"❌ Exception during local request: {e}")
                    break  # Exit the game loop

                # Continue emitting moves normally if the game isn't over
                emit('move', {
                    'type': 'move',
                    'move': best_move_uci,
                    'current_fen': current_fen,
                    'turn': 'w' if board.turn == chess.WHITE else 'b',
                    'result': 'ongoing'
                }, to=lobby_id)

                last_move_time = time.time()
                move_count += 1
            except Exception as e:
                logger.log(f"❌ Error calling Minimax API: {e}")
                break
        
        

        # End the game.
        socketio.sleep(0.25)
        disconnect()



    @socketio.on('playerjoin')
    def handle_player_join(data):
        lobby_id = data.get('lobbyId')
        name     = data.get('name')

        join_room(lobby_id)

        if lobby_id not in pvp_lobbies:
            pvp_lobbies[lobby_id] = {}

        if name not in pvp_lobbies[lobby_id]:
            player_count = len(pvp_lobbies[lobby_id])
            color = 'white' if player_count == 0 else 'black' if player_count == 1 else None

            if color:
                pvp_lobbies[lobby_id][name] = {'ready': False, 'color': color}

        player_data = [
            {"name": player_name, "color": info["color"]}
            for player_name, info in pvp_lobbies[lobby_id].items()
        ]

        emit('playerJoined', {'players': player_data}, to=lobby_id)

    @socketio.on('playerleft')
    def handle_player_left(data):
        lobby_id = data.get('lobbyId')
        name = data.get('name')

        if not lobby_id or not name:
            return

        if lobby_id in pvp_lobbies and name in pvp_lobbies[lobby_id]:
            del pvp_lobbies[lobby_id][name]

            if len(pvp_lobbies[lobby_id]) == 0:
                del pvp_lobbies[lobby_id]

        player_data = [
            {"name": player_name, "color": info["color"]}
            for player_name, info in pvp_lobbies.get(lobby_id, {}).items()
        ]

        emit('playerLeft', {'players': player_data}, to=lobby_id)


    @socketio.on('playerReady')
    def handle_player_ready(data):
        lobby_id    = data.get('lobbyId')
        name        = data.get('name')
        ready_state = data.get('ready')
        selected_strategy = data.get('selected_strategy')

        # Update the readiness state of the player
        if lobby_id in pvp_lobbies and name in pvp_lobbies[lobby_id]:
            pvp_lobbies[lobby_id][name]['ready']             = ready_state
            pvp_lobbies[lobby_id][name]['selected_strategy'] = selected_strategy

        # Prepare the list of players with readiness states
        players_with_ready = [
            {"name": player_name, "ready": info["ready"]}
            for player_name, info in pvp_lobbies[lobby_id].items()
        ]

        # Emit the updated readiness states and player names to the lobby
        emit('playerReadyUpdate', {'players': players_with_ready}, to=lobby_id)

    @socketio.on('forceGameStart')
    def handle_force_game_start(data):
        lobby_id       = data.get('lobbyId')
        player_started = data.get('player')

        player_data = pvp_lobbies[lobby_id]
        white_player = next((name for name, info in player_data.items() if info['color'] == 'white'), None)
        black_player = next((name for name, info in player_data.items() if info['color'] == 'black'), None)

        white_strategy = player_data[white_player]['selected_strategy']
        black_strategy = player_data[black_player]['selected_strategy']

        emit('gameStarted', {
            'message'       : 'Game is starting soon. No changes allowed',
            'player'        : player_started,
            'white_strategy': white_strategy,
            'black_strategy': black_strategy
        }, to=lobby_id)



def handle_checkmate(board, white_strategy, black_strategy, best_move_uci, current_fen, data, logger):
    """Handles checkmate event and sends the result with a cryptographic checksum."""
    winner_strategy_id = white_strategy if board.turn == chess.BLACK else black_strategy
    loser_strategy_id = black_strategy if board.turn == chess.BLACK else white_strategy
    winner_color = "white" if board.turn == chess.BLACK else "black"
    loser_color = "black" if winner_color == "white" else "white"
    game_date = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())  # Get current UTC time

    # Generate PGN (Portable Game Notation)
    game = chess.pgn.Game()
    node = game
    for move in board.move_stack:
        node = node.add_variation(move)

    game_pgn = str(game)  # Convert PGN object to string

    # Generate checksum
    checksum = generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, current_fen)

    # Emit game end event with checksum
    emit('game_end', {
        'type': 'move',
        'move': best_move_uci,
        'current_fen': current_fen,
        'turn': 'w' if board.turn == chess.WHITE else 'b',
        'result': {
            'winner': {
                'strategy_id': winner_strategy_id,
                'color': winner_color
            },
            'loser': {
                'strategy_id': loser_strategy_id,
                'color': loser_color
            },
            'date': game_date,
            'game_pgn': game_pgn,  
            'checksum': checksum  
        }
    }, to=data.get('lobbyId', None))

    # Log results
    logger.log(f"🏆 Checkmate! Winner Strategy ID: {winner_strategy_id}, Color: {winner_color}, Date: {game_date}")
    logger.log(f"📜 Game PGN:\n{game_pgn}")
    logger.log(f"🔐 Checksum: {checksum}")


def handle_draw(board, white_strategy, black_strategy, best_move_uci, current_fen, data, logger):
    """Handles draw event and sends the result with a cryptographic checksum."""
    # Since it's a draw, there is no winner or loser
    result_type = "*"
    winner_strategy_id = None
    loser_strategy_id = None
    winner_color = "none"  # No winner in a draw
    loser_color = "none"   # No loser in a draw
    
    # Game date in UTC
    game_date = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())  # Get current UTC time

    # Generate PGN (Portable Game Notation)
    game = chess.pgn.Game()
    node = game
    for move in board.move_stack:
        node = node.add_variation(move)

    game_pgn = str(game)  # Convert PGN object to string

    # Generate checksum
    checksum = generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, current_fen)

    # Emit game end event with checksum
    emit('game_end', {
        'type': 'move',
        'move': best_move_uci,
        'current_fen': current_fen,
        'turn': 'w' if board.turn == chess.WHITE else 'b',
        'result': {
            'result_type': result_type,  # "*" for draw
            'winner': {
                'strategy_id': winner_strategy_id,
                'color': winner_color
            },
            'loser': {
                'strategy_id': loser_strategy_id,
                'color': loser_color
            },
            'date': game_date,
            'game_pgn': game_pgn,  
            'checksum': checksum  
        }
    }, to=data.get('lobbyId', None))

    # Log results
    logger.log(f"⚖️ Draw! No winner, game ended in a draw. Date: {game_date}")
    logger.log(f"📜 Game PGN:\n{game_pgn}")
    logger.log(f"🔐 Checksum: {checksum}")



def generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, final_fen):
    """Generates a SHA-256 checksum for game validation."""
    game_data = json.dumps({
        "winner_strategy_id": winner_strategy_id,
        "loser_strategy_id" : loser_strategy_id,
        "game_pgn"          : game_pgn,
        "game_date"         : game_date,
        "final_fen"         : final_fen
    }, sort_keys=True)  # Sort keys for consistency

    return hashlib.sha256(game_data.encode()).hexdigest()

def verify_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, final_fen, received_checksum):
    """Verifies if the checksum matches the computed game data."""
    expected_checksum = generate_checksum(winner_strategy_id, loser_strategy_id, game_pgn, game_date, final_fen)
    return expected_checksum == received_checksum
