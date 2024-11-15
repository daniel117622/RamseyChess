from data_access.connector import db
from dataclasses import dataclass , asdict
from bson.objectid import ObjectId
from typing import Dict , Optional, List
import json
from bson.json_util import dumps



@dataclass
class Strategy:
    collection: str
    strat_id: str

@dataclass
class AiPremadeStratDoc:
    _id          : ObjectId
    name         : str
    strategy_list: List[Strategy]
    wins         : int
    losses       : int
    elo          : int
    owner        : str
    description  : str


class AiPremadeManager():
    def __init__(self) -> None:
        self.docs = db.get_collection('ai_premade_strats')
        self.current_doc : (AiPremadeStratDoc | None)  = None
        self.current_docs_collection : List[AiPremadeManager]  = []

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
        self.current_docs_collection = list(self.docs.find({"owner": None}))
        return json.loads(dumps(self.current_docs_collection))
    
    def resolve_strats(self):
        found_strats = []
        for strategy_doc in self.current_docs_collection:
            for strategy in strategy_doc["strategy_list"]:
                strat_doc = db[strategy["collection"]].find_one({"_id" : ObjectId(strategy["strat_id"])})
                found_strats.append(strategy_doc)
        return found_strats
    
    def updateElo(self, new_elo : int):
        """
        Updates a single document in the ai_premade_strats collection based on strat_id.
        
        Parameters:
        - strat_id (str): The ObjectId of the strategy document to update.
        - update_fields (Dict): The fields and their new values to update.
        
        Returns:
        - result (Dict): The result of the update operation.
        """
        if self.current_doc:
            filter = {"_id": self.current_doc["_id"]}
            update = {"$set": {"elo": new_elo}}
            result = self.docs.update_one(filter, update)
            return {
                "matched_count": result.matched_count,
                "modified_count": result.modified_count
            }
                
    def insertIntoDb(self, new_doc: AiPremadeStratDoc) -> str:
        result = self.docs.insert_one(asdict(new_doc))
        return str(new_doc._id) if result.acknowledged else None
    
    def getByOwner(self, owner):
        self.current_docs_collection = list(self.docs.find({"owner":owner}))
        return json.loads(dumps(self.current_docs_collection))