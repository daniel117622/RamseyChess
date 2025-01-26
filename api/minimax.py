import chess
import random

class Minimax:
    def __init__(self, evaluator, depth=1, debug=False):
        self.evaluator = evaluator
        self.depth = depth
        self.debug = debug
        if depth >= 5:
            raise ValueError("DDOS PREVENTION: Depth too high")
            
    def minimax(self, board, depth, maximizing_player):
        for evaluator in self.evaluator:
            evaluator.set_board(board)

        if depth == 0 or board.is_game_over():
            return sum(evaluator.calculate() for evaluator in self.evaluator)

        if maximizing_player:
            max_eval = float('-inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, False)
                board.pop()
                if eval > max_eval:
                    max_eval = eval
                    best_moves = [move]
                elif eval == max_eval:
                    best_moves.append(move)
            return max_eval if depth != self.depth else best_moves
        else:
            min_eval = float('inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, True)
                board.pop()
                if eval < min_eval:
                    min_eval = eval
                    best_moves = [move]
                elif eval == min_eval:
                    best_moves.append(move)
            return min_eval if depth != self.depth else best_moves

    def find_best_move(self, board):
        for evaluator in self.evaluator:
            evaluator.set_board(board)

        best_move = None
        if board.turn == chess.WHITE:
            max_eval = float('-inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, self.depth - 1, False)
                board.pop()
                if eval > max_eval:
                    max_eval = eval
                    best_moves = [move]
                elif eval == max_eval:
                    best_moves.append(move)
            # Apply tiebreaker: choose randomly among best moves
            best_move = random.choice(best_moves) if best_moves else None
        else:
            min_eval = float('inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, self.depth - 1, True)
                board.pop()
                if eval < min_eval:
                    min_eval = eval
                    best_moves = [move]
                elif eval == min_eval:
                    best_moves.append(move)
            # Apply tiebreaker: choose randomly among best moves
            best_move = random.choice(best_moves) if best_moves else None
            
        return best_move
        

if __name__ == "__main__":
    from data_access.material_manager import EvaluateMaterialManager
    from evaluators.material_evaluator import MaterialEvaluator
    em = EvaluateMaterialManager()
    em.loadOne("default")
    eval_manager = em.getCurrent()

    board = chess.Board("rnb1k1nr/p1pp1pp1/p6p/2b1p1q1/4P3/PP1PB3/2P2PPP/RN1QK1NR b KQkq - 0 8")

    matEval = MaterialEvaluator(eval_manager=eval_manager,board=board)

    print(matEval.eval_manager)
        
    minimax = Minimax(evaluator=[matEval], depth=3)
    best_move = minimax.find_best_move(board)
    print(board.san(best_move))
