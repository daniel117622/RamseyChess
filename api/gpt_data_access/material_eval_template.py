from gpt_data_access.connector import ChatGPTConnector
from data_access.material_manager import EvaluateMaterialDoc
import json
from typing import Union


connector = ChatGPTConnector()

class PartialEvaluateMaterialDoc:
    def __init__(self, whitePieces, blackPieces):
        self.whitePieces = whitePieces
        self.blackPieces = blackPieces

class MatEvalTemplate():
    def __init__(self, connector : ChatGPTConnector = connector):
        self.connector = connector

    def request_name(self, mateval_snippet: PartialEvaluateMaterialDoc) -> str:
        payload = {
            "white_pieces" : mateval_snippet.whitePieces,
            "black_pieces" : mateval_snippet.blackPieces
        }
        prompt = f"""
        A chess player assigned custom values to each piece. The standard valuation is:
        - Pawn: 1
        - Knight: 3
        - Bishop: 3
        - Rook: 5
        - Queen: 9
        - King: 20

        If the player follows the standard, return something like "Standard Valuation".
        If all values are the same, respond with something short like "All pieces equal".
        Otherwise, clearly describe how the values deviate from the standard.

        Keep the response concise — around 5 to 6 words maximum.

        Here is the valuation:
        {json.dumps(payload, indent=2)}
        """.strip()

        return self.connector.send_query(prompt)
    
    def request_valuation(self, user_text: str) -> str:
        prompt = f"""
            You are given a short natural language description of a chess player's piece valuation.
            Based on the description, return a JSON object with two fields: `whitePieces` and `blackPieces`.
            Each field should be a dictionary mapping piece names to numeric values.

            Pieces to include: "pawn", "knight", "bishop", "rook", "queen", "king".

            If no difference between white and black is mentioned, use the same values for both.
            Values can be decimal (e.g. 3.25) to represent subtle differences.

            Only include the fields `whitePieces` and `blackPieces`, nothing else.
            The king value by default is 20 unless told otherwise by the user.

            Description:
            \"\"\"
            {user_text}
            \"\"\"
        """.strip()


        raw_response = self.connector.send_query(prompt)

        try:
            parsed = json.loads(raw_response)

            if not isinstance(parsed, dict):
                return None

            if "whitePieces" in parsed and "blackPieces" in parsed:
                white = parsed["whitePieces"]
                black = parsed["blackPieces"]

                # basic validation
                required_keys = {"pawn", "knight", "bishop", "rook", "queen", "king"}
                if isinstance(white, dict) and isinstance(black, dict) \
                        and required_keys.issubset(white.keys()) \
                        and required_keys.issubset(black.keys()):
                    
                    black = {piece: -abs(float(value)) for piece, value in black.items()}
                    return PartialEvaluateMaterialDoc(whitePieces=white, blackPieces=black)

        except Exception:
            pass

        return None