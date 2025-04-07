from gpt_data_access.connector import ChatGPTConnector
from data_access.material_manager import EvaluateMaterialDoc
import json

connector = ChatGPTConnector()

class PartialEvaluateMaterialDoc:
    def __init__(self, white, black):
        self.whitePieces = white
        self.blackPieces = black

class MatEvalTemplate():
    def __init__(self, connector : ChatGPTConnector = connector):
        self.connector = connector

    def request_name(self, mateval_snippet: PartialEvaluateMaterialDoc) -> str:
        payload = {
            "white_pieces" : mateval_snippet.whitePieces,
            "black_pieces" : mateval_snippet.blackPieces
        }
        prompt = f"""
            A chess player assigned the following values to his pieces. For example,
            if they chose 1 for pawns, 3 for knights and bishops, and 5 for rooks,
            you could return a text like "Standard Valuation". For example, if they
            choose the same value for all pieces, return something short like
            "All pieces equal".

            Here is the valuation:
            {json.dumps(payload, indent=2)}
        """.strip()

        return self.connector.send_query(prompt)
    
    def request_valuation(self, user_text) -> str:
        pass