import unittest
import chess
from evaluators.material_evaluator import MaterialEvaluator
from data_access.material_manager import EvaluateMaterialDoc

class TestMaterialEvaluatorCalculate(unittest.TestCase):
    def setUp(self):
        # Mock evaluation manager with piece values
        self.eval_manager = {
            "name": "default",
            "owner": None,
            "blackPieces": {
                "pawn": -1,
                "knight": -3,
                "bishop": -3,
                "rook": -5,
                "queen": -9
            },
            "whitePieces": {
                "pawn": 1,
                "knight": 3,
                "bishop": 3,
                "rook": 5,
                "queen": 9
            }
        }

    def test_starting_position(self):
        # Default starting position where both sides have equal material
        board = chess.Board()
        evaluator = MaterialEvaluator(eval_manager=self.eval_manager, board=board)
        self.assertEqual(evaluator.calculate(), 0.0)

    def test_white_ahead_by_pawn(self):
        # Position where white is up by one pawn
        board = chess.Board("rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1")
        evaluator = MaterialEvaluator(eval_manager=self.eval_manager, board=board)
        self.assertEqual(evaluator.calculate(), 1.0)  # White is up by 1 pawn

    def test_black_ahead_by_knight(self):
        # Position where black has an extra knight
        board = chess.Board("rnb1kbnr/ppp1pppp/8/8/2q5/8/PP1PPPPP/RNBQKB1R w KQkq - 0 1")
        evaluator = MaterialEvaluator(eval_manager=self.eval_manager, board=board)
        self.assertEqual(evaluator.calculate(), -3.0)  # Black is up by one knight

    def test_white_blunders(self):
        board = chess.Board("rnb1k2r/pp2bppp/5n2/1p1p4/P3P3/8/1PPP1PPP/RNB1K1NR w KQkq - 0 1")
        evaluator = MaterialEvaluator(eval_manager=self.eval_manager, board=board)
        self.assertEqual(evaluator.calculate(), -2.0)  # Black is up by one knight

if __name__ == '__main__':
    unittest.main()
