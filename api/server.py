import eventlet
import eventlet.wsgi
import logging

eventlet.monkey_patch()

from data_access.elo_service import EloService
from flask import Flask, request, jsonify
import chess
import time
from flasgger import Swagger
from flask_cors import CORS
from flask_socketio import SocketIO, emit, disconnect
import requests

from routes.public_routes.public_routes import public_routes
from routes.profile_routes.profile_routes import profile_routes
from routes.socket_routes.socket_routes import socketio_routes , register_socketio_events

from data_access.strategy_cards_manager import AiPremadeManager
from data_access.material_manager import EvaluateMaterialManager


from evaluators.material_evaluator import MaterialEvaluator


import json
from bson.json_util import dumps , loads
from bson import ObjectId
from minimax import Minimax

logging.basicConfig(level=logging.INFO)

app      = Flask(__name__)
cors     = CORS(app, resources={r"/*": {"origins": "*"}})
swagger  = Swagger(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet', logger=True, engineio_logger=True)


app.register_blueprint(public_routes)
app.register_blueprint(profile_routes)
app.register_blueprint(socketio_routes)

register_socketio_events(socketio)

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
    req = request.get_json()
    white_strategy = req["white_strategy"]
    black_strategy = req["black_strategy"]
    fen   = req["fen"]
    depth = req["depth"]
    board = chess.Board(fen)
    # Access database to get both AI strategy repositories
    ai_manager_white = AiPremadeManager()
    ai_manager_black = AiPremadeManager()

    # Load strategies by ID
    ai_manager_white.loadById(white_strategy)
    ai_manager_black.loadById(black_strategy)

    # Get the list of strategy types used by each player
    load_managers_white = ai_manager_white.getCurrent()["strategy_list"]
    load_managers_black = ai_manager_black.getCurrent()["strategy_list"]

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
    white_evaluators = load_evaluators(load_managers_white)
    black_evaluators = load_evaluators(load_managers_black)

    debug = req.get("debug", False)

    cloud_function_url = "https://us-central1-ramseychess.cloudfunctions.net/minimax_handler"
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

    logging.debug("Sending request to Cloud Function with data: %s", data)

    response           = requests.post(cloud_function_url, json=data, verify=False)
    # Create Minimax with renamed parameters
    if response.status_code == 200:
        result = response.json()
        best_move = result.get("best_move")
        if best_move:
            algebraic_notation = chess.Board(fen).san(chess.Move.from_uci(best_move))
            return jsonify({
                "best_move": best_move,
                "algebraic_notation": algebraic_notation
            })
        else:
            return jsonify({})
    else:
        return jsonify({"error": "Error calling the Minimax Cloud Function"}), 500
  
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

            # Determine the player with the lowest Elo
            white_elo = white_strat.current_doc.elo
            black_elo = black_strat.current_doc.elo
            
            # If white's Elo is lower, update white's Elo with deltaElo, and black's Elo remains unchanged
            if white_elo < black_elo:
                white_strat.updateElo(white_elo + result["deltaElo"])
                black_strat.updateElo(black_elo - result["deltaElo"])
            else:
                # If black's Elo is lower, update black's Elo with deltaElo, and white's Elo remains unchanged
                white_strat.updateElo(white_elo - result["deltaElo"])
                black_strat.updateElo(black_elo + result["deltaElo"])

            return jsonify({
                "success"    : True,
                "error"      : "none",
                "deltaElo"   : result["deltaElo"],
                "probability": result["probability"]
            }), 200

    else:
        # Otherwise, it's a regular win/loss scenario
        result = elo_service.post("/game", {
            "winner": white_strategy_id if winner == "white" else black_strategy_id,
            "loser" : black_strategy_id if winner == "white" else white_strategy_id
        })

        # Check if the request was successful and if the game was resolved
        if result and result.get("message") == "game resolved":
            white_strat = AiPremadeManager()
            black_strat = AiPremadeManager()

            white_strat.loadById(white_strategy_id)
            black_strat.loadById(black_strategy_id)
            
            # Using deltaElo to safely update Elo ratings for win/loss scenario
            if winner == "white":
                white_strat.updateElo(white_strat.current_doc.elo + result["deltaElo"])
                black_strat.updateElo(black_strat.current_doc.elo - result["deltaElo"])
            else:
                white_strat.updateElo(white_strat.current_doc.elo - result["deltaElo"])
                black_strat.updateElo(black_strat.current_doc.elo + result["deltaElo"])

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

if __name__ == '__main__':
    # Use the Eventlet server
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

