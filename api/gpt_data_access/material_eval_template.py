from gpt_data_access.connector import ChatGPTConnector
from data_access.material_manager import EvaluateMaterialDoc
import json

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

        Here is the valuation:
        {json.dumps(payload, indent=2)}
        """.strip()

        return self.connector.send_query(prompt)
    
    def request_valuation(self, user_text) -> str:
        pass