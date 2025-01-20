import eventlet
import eventlet.wsgi

eventlet.monkey_patch()

from data_access.elo_service import EloService
from flask import Flask, request, jsonify
import chess
from flasgger import Swagger
from flask_cors import CORS
from flask_socketio import SocketIO, emit, disconnect


from routes.public_routes.public_routes import public_routes
from routes.profile_routes.profile_routes import profile_routes

from data_access.strategy_cards_manager import AiPremadeManager
from data_access.material_manager import EvaluateMaterialManager


from evaluators.material_evaluator import MaterialEvaluator


import json
from bson.json_util import dumps , loads
from bson import ObjectId
from minimax import Minimax


app      = Flask(__name__)
cors     = CORS(app, resources={r"/*": {"origins": "*"}})
swagger  = Swagger(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

app.register_blueprint(public_routes)
app.register_blueprint(profile_routes)



@app.route('/mat_eval', methods=['POST'])
def material_eval():
    data = request.get_json()
    fen = data.get("fen", None)
    eval_name = data.get("eval_name", None)
    depth = data.get("depth", 1)
    
    board = chess.Board(fen)
    
    # Load material evaluation parameters
    em = EvaluateMaterialManager()
    em.loadOne(eval_name)
    material_scoring = em.getCurrent()
    
    matEval = MaterialEvaluator(eval_manager=material_scoring, board=board)
    matEval.set_board(board)
    minimax = Minimax(evaluator=[matEval], depth=depth)
    
    best_move = minimax.find_best_move(board)
    
    return jsonify({
        "best_move": board.san(best_move),
        "material_score": matEval.calculate()
    })


@app.route('/mat_eval_debug', methods=['POST'])
def material_eval_debug():
    data = request.get_json()
    fen = data.get("fen", None)
    eval_name = data.get("eval_name", None)
    depth = data.get("depth", 1)
    debug = data.get("debug", False)
    
    board = chess.Board(fen)
    
    # Load material evaluation parameters
    em = EvaluateMaterialManager()
    em.loadOne(eval_name)
    material_scoring = em.getCurrent()
    
    matEval = MaterialEvaluator(eval_manager=material_scoring, board=board)
    minimax = Minimax(evaluator=[matEval], depth=depth, debug=debug)
    
    best_move = minimax.find_best_move(board)
    
    response = {
        "best_move": board.san(best_move),
        "material_score": matEval.calculate()
    }
    
    if debug:
        response["debug_info"] = [
            f"After move {board.san(move)}: {board.fen()}" for move in board.legal_moves
        ]
    
    return jsonify(response)

@app.route('/submit_exec', methods=['POST'])
def submit_exec():
   req = request.get_json()
   eval_manager = req.get("model", None)
   fen = req.get("fen", None)
   depth = req.get("depth", 1)
   # Dont crash the server
   depth = min(depth, 4)

   board = chess.Board(fen)
   
   matEval = MaterialEvaluator(eval_manager=eval_manager,board=board)
   minimax = Minimax(evaluator=[matEval], depth=depth)
   
   best_move = minimax.find_best_move(board)
   
   return jsonify({
       "best_move" : best_move.uci(),
       "best_move_readable": board.san(best_move),
       "material_score": matEval.calculate()
   })

@app.route('/request_move_by_strategy', methods=['POST'])
def request_move_by_strategy():
  req         = request.get_json()
  strategy_id = req["strategy_id"]
  fen         = req["fen"]
  depth       = req["depth"]
  board = chess.Board(fen)
  # Accesso a la BD 
  ai_manager = AiPremadeManager()
  ai_manager.loadById(strategy_id)
  load_managers = ai_manager.getCurrent()["strategy_list"]

  available_managers = {
    "evaluate_material": EvaluateMaterialManager
  }
  available_scorers = {
     "evaluate_material": MaterialEvaluator
  }
  loaded_evaluators = []
  for strategy in load_managers:
    collection   = strategy["collection"]
    evaluator_id = strategy["strat_id"]
    manager = available_managers[collection]()

    manager.loadById(evaluator_id)
    eval_manager = manager.getCurrent()

    # if board.turn == chess.WHITE:
    scoring_executor = available_scorers[collection](eval_manager=eval_manager, board=board)
    
    loaded_evaluators.append(scoring_executor)

  
  
  minimax = Minimax(evaluator=loaded_evaluators,depth=depth)
  best_move = minimax.find_best_move(board)
  if best_move:
    return jsonify({
      "best_move" : best_move.uci(),
    })
  else:
     return jsonify({})
  
@socketio.on('execute_game')
def execute_game(data):
    # Ensure the required parameters are present
    if 'white_strategy_id' not in data or 'black_strategy_id' not in data:
        emit('error', {'message': 'Missing required fields: white_strategy_id and black_strategy_id'})
        disconnect()
        return

    # Retrieve parameters
    white_strategy_id = data['white_strategy_id']
    black_strategy_id = data['black_strategy_id']

    # Initialize the chess board
    board = chess.Board()

    # Set up AI for both strategies
    ai_manager_white = AiPremadeManager()
    ai_manager_white.loadById(white_strategy_id)
    white_strategy_list = ai_manager_white.getCurrent()["strategy_list"]

    ai_manager_black = AiPremadeManager()
    ai_manager_black.loadById(black_strategy_id)
    black_strategy_list = ai_manager_black.getCurrent()["strategy_list"]

    # Define evaluator logic
    available_managers = {
        "evaluate_material": EvaluateMaterialManager
    }
    available_scorers = {
        "evaluate_material": MaterialEvaluator
    }

    def load_evaluators(strategy_list):
        loaded_evaluators = []
        for strategy in strategy_list:
            collection   = strategy["collection"]
            evaluator_id = strategy["strat_id"]

            manager = available_managers[collection]()
            manager.loadById(evaluator_id)
            eval_manager = manager.getCurrent()

            scoring_executor = available_scorers[collection](eval_manager=eval_manager, board=board)
            loaded_evaluators.append(scoring_executor)
        return loaded_evaluators

    white_evaluators = load_evaluators(white_strategy_list)
    black_evaluators = load_evaluators(black_strategy_list)

    # Game logic
    full_game          = []
    move_count         = 0
    max_moves          = 128
    current_evaluators = white_evaluators

    while not board.is_game_over() and move_count < max_moves:
        minimax = Minimax(evaluator=current_evaluators, depth=2) 
        best_move = minimax.find_best_move(board)

        if best_move:
            board.push(best_move)
            current_fen = board.fen()
            emit('move', {
                'type'       : 'move',
                'move'       : best_move.uci(),
                'current_fen': current_fen,
                'turn'       : 'b' if move_count % 2 == 0 else 'w',
                'result'     : 'ongoing'
            })
            move_count += 1
            current_evaluators = black_evaluators if move_count % 2 == 0 else white_evaluators
        else:
            break

    # Game end
    result = board.result()
    game_end_payload = {
        'type'       : 'game_end',
        'result'     : 'checkmate' if board.is_checkmate() else 'draw' if board.is_stalemate() else 'ongoing',
        'current_fen': board.fen(),
        'winner'     : 'white' if board.result() == '1-0' else 'black' if board.result() == '0-1' else 'draw'
    }
    emit('game_end', game_end_payload)

  
@app.route('/post_winner', methods=['POST'])
def post_winner():
    req = request.get_json()
    white_strategy_id = req.get("white_strategy")
    black_strategy_id = req.get("black_strategy")
    winner = req.get("winner")
    
    # Access the ELO service
    elo_service = EloService()
    
    # Register players by posting to the /players endpoint
    elo_service.post("/players", {"name": white_strategy_id})
    elo_service.post("/players", {"name": black_strategy_id})
    
    # Handle the draw or win/loss scenario
    if winner == "":
        # If it's a draw, call the /draw endpoint with both players
        result = elo_service.post("/draw", {
            "player1": white_strategy_id,
            "player2": black_strategy_id
        })

        # Handle the Elo update for draws: both players' Elo is updated
        if result and result.get("message") == "game resolved":
            white_strat = AiPremadeManager()
            black_strat = AiPremadeManager()

            white_strat.loadById(white_strategy_id)
            black_strat.loadById(black_strategy_id)

            # Update Elo for both players in the draw case
            white_strat.updateElo(result["players"][0]["elo"] if result["players"][0]["name"] == white_strategy_id else result["players"][1]["elo"])
            black_strat.updateElo(result["players"][1]["elo"] if result["players"][0]["name"] == white_strategy_id else result["players"][0]["elo"])

            return jsonify({
                "success"    : True,
                "error"      : "none",
                "deltaElo"   : result["deltaElo"],
                "probability": result["probability"]
            }), 200

    else:
        # Otherwise, it's a regular win/loss scenario
        result = elo_service.post("/game", {
            "winner": white_strategy_id if winner == white_strategy_id else black_strategy_id,
            "loser": black_strategy_id if winner == white_strategy_id else white_strategy_id
        })

        # Check if the request was successful and if the game was resolved
        if result and result.get("message") == "game resolved":
            white_strat = AiPremadeManager()
            black_strat = AiPremadeManager()

            white_strat.loadById(white_strategy_id)
            black_strat.loadById(black_strategy_id)
            
            # Update Elo ratings for win/loss scenario
            white_strat.updateElo(result["winner"]["elo"] if winner == white_strategy_id else result["loser"]["elo"])
            black_strat.updateElo(result["loser"]["elo"]  if winner == white_strategy_id else result["winner"]["elo"])

            return jsonify({
                "success"    : True,
                "error"      : "none",
                "winner"     : result["winner"],
                "loser"      : result["loser"],
                "deltaElo"   : result["deltaElo"],
                "probability": result["probability"]
            }), 200

    # If no valid result returned or game could not be resolved
    error_message = result.get("error", "Unable to update ELO rankings")

    return jsonify({"success": False, "error": error_message}), 500

@socketio.on('ping_socket')
def handle_ping_socket(message):
    """
    Handles the 'ping_socket' event. Replies with the same message.
    Disconnects the client if the message is 'exit'.
    """
    print(f"Received message: {message}")
    
    if message == "exit":
        emit('response', {'message': 'Goodbye! Disconnecting...'})
        disconnect()
    else:
        emit('response', {'message': f"Echo: {message}"})


if __name__ == '__main__':
    # Use the Eventlet server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
