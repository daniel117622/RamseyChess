import chess
from data_access.material_manager import EvaluateMaterialDoc

class MaterialEvaluator():
    def __init__(self, eval_manager : EvaluateMaterialDoc, board) -> None:
        """ Simple summatory of your pieces values"""
        self.board = board
        self.eval_manager  : EvaluateMaterialDoc = eval_manager
    
    def set_board(self,board):
        self.board = board
    
    def calculate(self) -> float:
        sum_of_black_pieces = 0.0
        sum_of_white_pieces = 0.0


        for piece_type in ["pawn", "knight", "bishop", "rook", "queen"]: 
            sum_of_black_pieces += len(self.board.pieces(getattr(chess, piece_type.upper()), chess.BLACK)) * self.eval_manager["blackPieces"][piece_type]  #type: ignore[index]
            sum_of_white_pieces += len(self.board.pieces(getattr(chess, piece_type.upper()), chess.WHITE)) * self.eval_manager["whitePieces"][piece_type]  #type: ignore[index]

        return sum_of_black_pieces + sum_of_white_pieces     
    
    def __str__(self):
        return (
            f"MaterialEvaluator("
            f"blackPieces: {self.eval_manager['blackPieces']}, "
            f"whitePieces: {self.eval_manager['whitePieces']}, "
            f"board_fen: {self.board.fen()}"
            f")"
        )
    
    def to_json(self):
        return {
            "blackPieces": self.eval_manager["blackPieces"],
            "whitePieces": self.eval_manager["whitePieces"],
            "board_fen": self.board.fen()
        }

if __name__ == "__main__":
    print("Testbed")
    eval_manager = {
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
    me = MaterialEvaluator(eval_manager=eval_manager, board=chess.Board("rnbqkbnr/p1pp1ppp/p7/4p3/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 5"))
    print(me.calculate())