from data_access.elo_service import EloService
from flask import Flask, request, jsonify
import chess
from flasgger import Swagger
from flask_cors import CORS

from routes.public_routes.public_routes import public_routes
from routes.profile_routes.profile_routes import profile_routes

from data_access.strategy_cards_manager import AiPremadeManager
from data_access.material_manager import EvaluateMaterialManager
from data_access.danger_manager import EvaluateDangerManager

from evaluators.material_evaluator import MaterialEvaluator
from evaluators.danger_evaluator import DangerEvaluator

import json
from bson.json_util import dumps , loads
from bson import ObjectId
from minimax import Minimax


app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "*"}})
swagger = Swagger(app)

app.register_blueprint(public_routes)
app.register_blueprint(profile_routes)


@app.route('/gen_evaluate', methods=['POST'])
def evaluate_material():
  data    = request.get_json()

  fen       = data.get("fen", None)
  mat_eval_name = data.get("mat_eval_name", None)
  dan_eval_name = data.get("dan_eval_name", None)
  
  board = chess.Board(fen)

  # Accesso a la BD
  em = EvaluateMaterialManager()
  em.loadOne(mat_eval_name)
  material_scoring = em.getCurrent()
  
  ed = EvaluateDangerManager()
  ed.loadOne(dan_eval_name)
  danger_scoring = ed.getCurrent()

  # Computación del score
  matEval = MaterialEvaluator(material_scoring, board)
  danEval = DangerEvaluator(danger_scoring, board)

  mat_score = matEval.calculate()
  dan_score = danEval.calculate()

  return jsonify({
     "material_score" : mat_score,
     "danger_score" : dan_score
  })

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

@app.route('/danger_eval', methods=['POST'])
def danger_eval():
  data      = request.get_json()
  fen       = data.get("fen", None)
  eval_name = data.get("eval_name", None)

  board = chess.Board(fen)

  ed = EvaluateDangerManager()
  ed.loadOne(eval_name)
  danger_scoring = ed.getCurrent()

  danEval = DangerEvaluator(eval_manager=danger_scoring, board=board)

  legal_moves_fen = {}
  for move in board.legal_moves:
    board_copy = board.copy(stack=False)
    board_copy.push(move)
    # Get the FEN for the new position
    danEval.set_board(board_copy)
    legal_moves_fen[str(board.san(move))] = danEval.calculate()

  for move, score in legal_moves_fen.items():
      print(f"Move: {move}, score: {score}")

  if board.turn == chess.WHITE:
    best_move = max(legal_moves_fen, key=legal_moves_fen.get)
  else:
    best_move = min(legal_moves_fen, key=legal_moves_fen.get)

  return jsonify({
    "best_move": best_move,
    "danger_score" : legal_moves_fen[best_move]
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
    "evaluate_material": EvaluateMaterialManager,
    "evaluate_danger": EvaluateDangerManager
  }
  available_scorers = {
     "evaluate_material": MaterialEvaluator,
     "evaluate_danger": DangerEvaluator
  }
  loaded_evaluators = []
  for strategy in load_managers:
    collection   = strategy["collection"]
    evaluator_id = strategy["strat_id"]
    manager = available_managers[collection]()

    # em = EvaluateMaterialManager()
    # em.loadOne(eval_name)
    # material_scoring = em.getCurrent()
    # 
    # matEval = MaterialEvaluator(eval_manager=material_scoring, board=board)
    # matEval.set_board(board)
    # minimax = Minimax(evaluator=[matEval], depth=depth)
    manager.loadById(evaluator_id)
    eval_manager = manager.getCurrent()
    if board.turn == chess.WHITE:
      scoring_executor = available_scorers[collection](eval_manager=eval_manager, board=board)
    
    else:      
      # Swap the pieces only in this type of evaluation. Probably a generic method of "swapping will need to be added"
      if collection == "evaluate_material":
        for piece , value in eval_manager["whitePieces"].items():
          eval_manager["whitePieces"][piece] *= -1 
        for piece , value in eval_manager["blackPieces"].items():
          eval_manager["blackPieces"][piece] *= -1 
          
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
  

if __name__ == '__main__':
  app.run(debug=True)