import chess
import random

class Logger:
    def __init__(self, debug):
        self.debug = debug

    def log(self, message):
        if self.debug:
            print(message)

class Minimax:
    def __init__(self, white_evaluators, black_evaluators, depth=1, debug=False):
        self.white_evaluators = white_evaluators
        self.black_evaluators = black_evaluators
        self.depth = depth
        self.logger = Logger(debug)

        if depth >= 8:
            raise ValueError("DDOS PREVENTION: Depth too high")

    def minimax(self, board, depth, is_white_turn, alpha=float('-inf'), beta=float('inf')):
        evaluator_list = self.white_evaluators if is_white_turn else self.black_evaluators

        for evaluator in evaluator_list:
            evaluator.set_board(board)

        self.logger.log(f"\n🔹 Depth: {depth} | {'White' if is_white_turn else 'Black'}'s turn")
        self.logger.log(f"🔹 Using evaluator: {'white_evaluators' if is_white_turn else 'black_evaluators'}")
        self.logger.log(f"🔹 Board FEN: {board.fen()}")

        if depth == 0 or board.is_game_over():
            score = sum(evaluator.calculate() for evaluator in evaluator_list)
            self.logger.log(f"  🔹 Base case reached: Evaluated score = {score}")
            return score

        if is_white_turn:  # White maximizes
            best_eval = float('-inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, False, alpha, beta)
                board.pop()

                self.logger.log(f"  🔸 Evaluating move {move.uci()} | Score: {eval}")

                if eval > best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)

                alpha = max(alpha, eval)
                if beta <= alpha:
                    break  # Beta cut-off

            if depth == self.depth:
                self.logger.log(f"✅ Best moves at root: {[m.uci() for m in best_moves]}")

            return best_eval if depth != self.depth else best_moves

        else:  # Black minimizes
            best_eval = float('inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, True, alpha, beta)
                board.pop()

                self.logger.log(f"  🔸 Evaluating move {move.uci()} | Score: {eval}")

                if eval < best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)

                beta = min(beta, eval)
                if beta <= alpha:
                    break  # Alpha cut-off

            if depth == self.depth:
                self.logger.log(f"✅ Best moves at root: {[m.uci() for m in best_moves]}")

            return best_eval if depth != self.depth else best_moves

    def find_best_move(self, board):
        is_white_turn = board.turn == chess.WHITE

        best_eval = float('-inf') if is_white_turn else float('inf')
        best_moves = []

        self.logger.log(f"\n♟️ Finding Best Move for {'White' if is_white_turn else 'Black'}\n")

        for move in board.legal_moves:
            board.push(move)
            eval = self.minimax(board, self.depth - 1, board.turn)
            board.pop()

            self.logger.log(f"♟️ Move: {move.uci()} | Eval: {eval}")

            if is_white_turn:  # White maximizes
                if eval > best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)
            else:  # Black minimizes
                if eval < best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)

        self.logger.log(f"✅ Best move chosen: {best_moves[0].uci() if best_moves else 'None'}\n")
        return random.choice(best_moves) if best_moves else None