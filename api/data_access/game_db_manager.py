from data_access.connector import db
from dataclasses import dataclass, asdict
from bson.objectid import ObjectId
from typing import Optional, List
import json
from bson.json_util import dumps

@dataclass
class ChessGameDoc:
    _id              : ObjectId
    strategy_id_white: str
    strategy_id_black: str
    game_date        : str
    pgn              : str
    owner            : Optional[str] = None

class ChessGameManager:
    def __init__(self) -> None:
        self.docs = db.get_collection('played_games')
        self.current_doc : List[ChessGameDoc] | ChessGameDoc = None

    def loadOne(self, name: str, owner: Optional[str] = None):
        filter = {"name": name}
        if owner is not None:
            filter["owner"] = owner
        
        self.current_doc = self.docs.find_one(filter)
        if self.current_doc is None:
            self.current_doc = self.docs.find_one({"name": "default_game"})
        return self.current_doc
    
    def loadById(self, game_id: str):
        filter = {"_id": ObjectId(game_id)}  
        self.current_doc = self.docs.find_one(filter)
        return self.current_doc
    
    def loadByOwner(self, owner: str):
        filter = {"owner": owner}
        return list(self.docs.find(filter))
    
    def getCurrent(self):
        return json.loads(dumps(self.current_doc))
    
    def insertByName(self, chess_game_doc: ChessGameDoc) -> bool:
        result = self.docs.insert_one(asdict(chess_game_doc))
        return result.acknowledged
