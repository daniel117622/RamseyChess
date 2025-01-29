from flask import Blueprint
from flask_socketio import SocketIO, emit, disconnect , join_room
import chess
import time

from data_access.strategy_cards_manager import AiPremadeManager
from data_access.material_manager import EvaluateMaterialManager
from evaluators.material_evaluator import MaterialEvaluator
from minimax import Minimax
from utils.socket_exception import exception_handler

socketio_routes = Blueprint('socketio_blueprint', __name__)

pvp_lobbies = {}

def register_socketio_events(socketio):
    @socketio.on('connect')
    def test_connect():
        print('Client connected')

    @socketio.on('disconnect')
    def test_disconnect():
        print('Client disconnected')

    @exception_handler()
    def execute_game(data):
        socketio.sleep(0)
        emit('hello', {'message': 'Hello! Connection to execute_game established.'})

        # Ensure required parameters are present
        if 'white_strategy' not in data or 'black_strategy' not in data:
            emit('error', {'message': 'Missing required fields: white_strategy and black_strategy'})
            disconnect()
            return

        # Extract game parameters from request
        white_strategy = data["white_strategy"]
        black_strategy = data["black_strategy"]
        debug = data.get("debug", False)

        # Use standard starting position for chess
        board = chess.Board()  # Standard starting position
        depth = 3  # Fixed depth

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
        max_moves = 128
        last_move_time = time.time()

        while not board.is_game_over() and move_count < max_moves:
            is_white_turn = board.turn == chess.WHITE
            current_evaluators = white_evaluators if is_white_turn else black_evaluators

            # Create Minimax instance using correct evaluators and fixed depth
            minimax = Minimax(white_evaluators=white_evaluators, black_evaluators=black_evaluators, depth=depth, debug=debug)
            best_move = minimax.find_best_move(board)

            if best_move:
                target_time = last_move_time + 0.5  # Ensure at least 0.5s between moves
                time_to_wait = target_time - time.time()
                if time_to_wait > 0:
                    time.sleep(time_to_wait)

                board.push(best_move)
                current_fen = board.fen()
                emit('move', {
                    'type': 'move',
                    'move': best_move.uci(),
                    'current_fen': current_fen,
                    'turn': 'w' if board.turn == chess.WHITE else 'b',  # Correct turn handling
                    'result': 'ongoing'
                }, to=data.get('lobbyId', None))

                last_move_time = time.time()
                move_count += 1
            else:
                break  # No move found, exit loop

        # Handle game end conditions
        result = board.result()
        game_end_payload = {
            'type': 'game_end',
            'result': 'checkmate' if board.is_checkmate() else 'draw' if board.is_stalemate() else 'ongoing',
            'current_fen': board.fen(),
            'winner': 'white' if result == '1-0' else 'black' if result == '0-1' else 'draw'
        }
        emit('game_end', game_end_payload, to=data.get('lobbyId', None))
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

        


    