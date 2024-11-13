from data_access.connector import db
from dataclasses import dataclass , asdict
from bson.objectid import ObjectId
from typing import Dict , Optional
import json
from bson.json_util import dumps

@dataclass 
class PieceDanger:
    hangingPieces : float
    attackedPieces: float

@dataclass 
class EvaluateDangerDoc:
    _id           : ObjectId
    name          : str
    ownPieces     : PieceDanger
    opponentPieces: PieceDanger
    owner         : Optional[str] = None #UUID
    

class EvaluateDangerManager():
    def __init__(self) -> None:
        self.docs = db.get_collection('evaluate_danger')
        self.current_doc : (EvaluateDangerDoc | None) = None

    def loadOne(self, name : str , owner = None):
        filter = {"name" : name}
        if owner is not None:
            filter["owner"] = owner
        
        self.current_doc = self.docs.find_one(filter)
        if self.current_doc is None:
            self.current_doc = self.docs.find_one({"name": "default"})

    def loadById(self, strat_id : str):
        filter = {"_id" : ObjectId(strat_id)}
        
        self.current_doc = self.docs.find_one(filter)

    def getCurrent(self):
        return json.loads(dumps(self.current_doc))
    
    def getNullOwner(self):
        return list(self.docs.find({"owner": None}, {"_id": 0}))
    
if __name__ == "__main__":
    ed = EvaluateDangerManager()
    ed.loadOne("default")
    curr = ed.getCurrent()
    print(curr)