import chess
import random

# Strategy pattern to clearly print debug messages.
class Logger:
    """
    Logger class to handle debug messages without cluttering the Minimax logic.
    """
    def __init__(self, debug):
        self.debug = debug

    def log(self, message):
        """ Print the message only if debug mode is enabled. """
        if self.debug:
            print(message)


class Minimax:
    def __init__(self, white_evaluators, black_evaluators, depth=1, debug=False):
        """
        :param white_evaluators: List of evaluators for White.
        :param black_evaluators: List of evaluators for Black.
        :param depth: Search depth for the Minimax algorithm.
        :param debug: Enables debug mode if True.
        """
        self.white_evaluators = white_evaluators
        self.black_evaluators = black_evaluators
        self.depth = depth
        self.logger = Logger(debug)  # Use Logger instead of inline if statements

        if depth >= 5:
            raise ValueError("DDOS PREVENTION: Depth too high")

    def minimax(self, board, depth, is_white_turn):
        """
        Minimax algorithm where:
        - White tries to maximize its score.
        - Black tries to minimize White's score.
        
        :param board: Current board state.
        :param depth: Remaining search depth.
        :param is_white_turn: True if it's White's turn, False if it's Black's turn.
        """
        # Select the correct evaluator based on who is moving
        evaluator_list = self.white_evaluators if is_white_turn else self.black_evaluators

        for evaluator in evaluator_list:
            evaluator.set_board(board)

        # Debug Logging
        self.logger.log(f"\n🔹 Depth: {depth} | {'White' if is_white_turn else 'Black'}'s turn")
        self.logger.log(f"🔹 Using evaluator: {'white_evaluators' if is_white_turn else 'black_evaluators'}")
        self.logger.log(f"🔹 Board FEN: {board.fen()}")

        # Base case: If depth is 0 or game is over, return evaluation
        if depth == 0 or board.is_game_over():
            score = sum(evaluator.calculate() for evaluator in evaluator_list)
            self.logger.log(f"  🔹 Base case reached: Evaluated score = {score}")
            return score

        if is_white_turn:  # White maximizes
            best_eval = float('-inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, False)  # Next turn is Black's
                board.pop()

                self.logger.log(f"  🔸 Evaluating move {move.uci()} | Score: {eval}")

                if eval > best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)

            if depth == self.depth:
                self.logger.log(f"✅ Best moves at root: {[m.uci() for m in best_moves]}")

            return best_eval if depth != self.depth else best_moves

        else:  # Black minimizes
            best_eval = float('inf')
            best_moves = []
            for move in board.legal_moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, True)  # Next turn is White's
                board.pop()

                self.logger.log(f"  🔸 Evaluating move {move.uci()} | Score: {eval}")

                if eval < best_eval:
                    best_eval = eval
                    best_moves = [move]
                elif eval == best_eval:
                    best_moves.append(move)

            if depth == self.depth:
                self.logger.log(f"✅ Best moves at root: {[m.uci() for m in best_moves]}")

            return best_eval if depth != self.depth else best_moves
        
    def find_best_move(self, board):
        """
        Finds the best move for the current player, maximizing or minimizing based on turn.
        """
        is_white_turn = board.turn == chess.WHITE

        best_eval = float('-inf') if is_white_turn else float('inf')
        best_moves = []

        self.logger.log(f"\n♟️ Finding Best Move for {'White' if is_white_turn else 'Black'}\n")

        for move in board.legal_moves:
            board.push(move)
            eval = self.minimax(board, self.depth - 1, not is_white_turn)  

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