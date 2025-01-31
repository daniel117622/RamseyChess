from flask import jsonify, request
import chess
from minimax import Minimax
from evaluators.material_evaluator import MaterialEvaluator

def minimax_handler(request):
    data = request.get_json()
    white_evaluators_data = data["white_evaluators"]
    black_evaluators_data = data["black_evaluators"]
    depth = data["depth"]
    debug = data["debug"]
    
    # Deserialize evaluators
    def deserialize_evaluators(evaluator_list):
        evaluators = []
        for evaluator_data in evaluator_list:
            for class_name, params in evaluator_data.items():
                if class_name == "MaterialEvaluator":
                    eval_manager = {
                        "blackPieces": params["blackPieces"],
                        "whitePieces": params["whitePieces"]
                    }
                    board = chess.Board(params["board_fen"])
                    evaluators.append(MaterialEvaluator(eval_manager, board))
        return evaluators
    
    white_evaluators = deserialize_evaluators(white_evaluators_data)
    black_evaluators = deserialize_evaluators(black_evaluators_data)
    board = chess.Board(white_evaluators[0].board.fen())
    
    # Run Minimax
    minimax = Minimax(white_evaluators=white_evaluators, black_evaluators=black_evaluators, depth=depth, debug=debug)
    best_move = minimax.find_best_move(board)
    
    return jsonify({
        "best_move": best_move.uci() if best_move else None
    })

