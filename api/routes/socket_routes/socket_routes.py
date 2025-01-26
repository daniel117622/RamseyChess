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

    @socketio.on('execute_game')
    @exception_handler()
    def execute_game(data):
        socketio.sleep(0)
        emit('hello', {'message': 'Hello! Connection to execute_game established.'})
        # Ensure the required parameters are present
        if 'white_strategy_id' not in data or 'black_strategy_id' not in data:
            emit('error', {'message': 'Missing required fields: white_strategy_id and black_strategy_id'})
            disconnect()
            return
        
        white_strategy_id = data['white_strategy_id']
        black_strategy_id = data['black_strategy_id']
        board = chess.Board()

        ai_manager_white = AiPremadeManager()
        ai_manager_white.loadById(white_strategy_id)
        white_strategy_list = ai_manager_white.getCurrent()["strategy_list"]

        ai_manager_black = AiPremadeManager()
        ai_manager_black.loadById(black_strategy_id)
        black_strategy_list = ai_manager_black.getCurrent()["strategy_list"]

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

                manager = available_managers[collection]()
                manager.loadById(evaluator_id)
                eval_manager = manager.getCurrent()

                scoring_executor = available_scorers[collection](eval_manager=eval_manager, board=board)
                loaded_evaluators.append(scoring_executor)
            return loaded_evaluators

        white_evaluators = load_evaluators(white_strategy_list)
        black_evaluators = load_evaluators(black_strategy_list)

        full_game = []
        move_count = 0
        max_moves = 128
        current_evaluators = white_evaluators
        last_move_time = time.time()

        while not board.is_game_over() and move_count < max_moves:
            minimax = Minimax(evaluator=current_evaluators, depth=2)
            best_move = minimax.find_best_move(board)

            if best_move:
                target_time = last_move_time + 0.5
                time_to_wait = target_time - time.time()
                if time_to_wait > 0:
                    time.sleep(time_to_wait)

                board.push(best_move)
                current_fen = board.fen()
                emit('move', {
                    'type': 'move',
                    'move': best_move.uci(),
                    'current_fen': current_fen,
                    'turn': 'b' if move_count % 2 == 0 else 'w',
                    'result': 'ongoing'
                })

                last_move_time = time.time()
                move_count += 1
                current_evaluators = black_evaluators if move_count % 2 == 0 else white_evaluators
            else:
                break

        result = board.result()
        game_end_payload = {
            'type': 'game_end',
            'result': 'checkmate' if board.is_checkmate() else 'draw' if board.is_stalemate() else 'ongoing',
            'current_fen': board.fen(),
            'winner': 'white' if board.result() == '1-0' else 'black' if board.result() == '0-1' else 'draw'
        }
        emit('game_end', game_end_payload)
        disconnect()


    @socketio.on('ping_socket')
    def handle_ping_socket(message):
        print(f"Received message: {message}")

        if message == "exit":
            emit('response', {'message': 'Goodbye! Disconnecting...'})
            disconnect()
        else:
            emit('response', {'message': f"Echo: {message}"})

    @socketio.on('playerjoin')
    def handle_player_join(data):
        lobby_id = data.get('lobbyId')
        name     = data.get('name')
        
        join_room(lobby_id)

        if lobby_id not in pvp_lobbies:
            pvp_lobbies[lobby_id] = []
        if name not in pvp_lobbies[lobby_id]:
            pvp_lobbies[lobby_id].append(name)

        emit('playerJoined', {'players': pvp_lobbies[lobby_id]}, to=lobby_id)
