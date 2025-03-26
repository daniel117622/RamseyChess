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
    
    def insertOne(self, chess_game_doc: ChessGameDoc) -> bool:
        chess_game_dict = asdict(chess_game_doc)
        chess_game_dict.pop('_id', None) 
        
        result = self.docs.insert_one(chess_game_dict)
        return result

    def loadByStrategyList(self, strategy_list: List[str]):
        filter = {
            "$or": [
                {"strategy_id_white": {"$in": strategy_list}},
                {"strategy_id_black": {"$in": strategy_list}}
            ]
        }
        self.current_doc = list(self.docs.find(filter).sort("game_date", -1))
        return self.current_doc
    
    def loadByStrategyListWithNames(self, strategy_list: List[str]):
        pipeline = [
            {
                "$match": {
                    "$or": [
                        {"strategy_id_white": {"$in": strategy_list}},
                        {"strategy_id_black": {"$in": strategy_list}}
                    ]
                }
            },
            {
                "$lookup": {
                    "from": "ai_premade_strats",
                    "let": {"white_id": {"$toObjectId": "$strategy_id_white"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$white_id"]}}},
                        {"$project": {"_id": 0, "owner": 1}}
                    ],
                    "as": "strategy_white_data"
                }
            },
            {
                "$lookup": {
                    "from": "ai_premade_strats",
                    "let": {"black_id": {"$toObjectId": "$strategy_id_black"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$black_id"]}}},
                        {"$project": {"_id": 0, "owner": 1}}
                    ],
                    "as": "strategy_black_data"
                }
            },
            {
                "$set": {
                    "strategy_white_owner": {
                        "$arrayElemAt": ["$strategy_white_data.owner", 0]
                    },
                    "strategy_black_owner": {
                        "$arrayElemAt": ["$strategy_black_data.owner", 0]
                    }
                }
            },
            {
                "$lookup": {
                    "from": "user_profiles",
                    "localField": "strategy_white_owner",
                    "foreignField": "sub",
                    "as": "white_user"
                }
            },
            {
                "$lookup": {
                    "from": "user_profiles",
                    "localField": "strategy_black_owner",
                    "foreignField": "sub",
                    "as": "black_user"
                }
            },
            {
                "$set": {
                    "strategy_white_owner": {
                        "$arrayElemAt": ["$white_user.nickname", 0]
                    },
                    "strategy_black_owner": {
                        "$arrayElemAt": ["$black_user.nickname", 0]
                    }
                }
            },
            {
                "$unset": [
                    "strategy_white_data",
                    "strategy_black_data",
                    "white_user",
                    "black_user"
                ]
            },
            {"$sort": {"game_date": -1}}  # Sort by latest games
        ]

        self.current_doc = list(self.docs.aggregate(pipeline))
        return self.current_doc
