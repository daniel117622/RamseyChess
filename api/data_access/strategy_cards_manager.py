from data_access.connector import db
from dataclasses import dataclass , asdict
from bson.objectid import ObjectId
from typing import Dict , Optional, List
import json
from bson.json_util import dumps

from data_access.material_manager import EvaluateMaterialManager
from pymongo.errors import OperationFailure

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
        return dumps(self.current_doc)
    
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
        
    def updateWins(self):
        """
        Increments the 'wins' property of the current document by 1.
        """
        if self.current_doc:
            new_wins = self.current_doc.get("wins", 0) + 1
            filter = {"_id": self.current_doc["_id"]}
            update = {"$set": {"wins": new_wins}}
            result = self.docs.update_one(filter, update)
            return {
                "matched_count": result.matched_count,
                "modified_count": result.modified_count
            }
        return {"error": "No current document or wins field not found"}

    def updateLosses(self):
        """
        Increments the 'losses' property of the current document by 1.
        """
        if self.current_doc:
            new_losses = self.current_doc.get("losses") + 1
            filter = {"_id": self.current_doc["_id"]}
            update = {"$set": {"losses": new_losses}}
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
    
    def deleteStrategy(self, strategy_id: str):
        # Create the filter to find the strategy document by its ObjectId
        filter = {"_id": ObjectId(strategy_id)}
        # Retrieve the strategy document based on the filter
        strategy_doc = self.docs.find_one(filter)

        if not strategy_doc:
            return {"error": f"Strategy with id {strategy_id} not found."}
        
        # Flag to check if all children are deleted
        all_children_deleted = True

        for strategy in strategy_doc["strategy_list"]:
            result = db[strategy["collection"]].delete_one({"_id": ObjectId(strategy["strat_id"])})
            # If any child strategy cannot be deleted, set the flag to False
            if result.deleted_count == 0:
                all_children_deleted = False

        # If all child strategies were successfully deleted, proceed to delete the parent document
        if all_children_deleted:
            self.docs.delete_one(filter)
            return True
        else:
            return {"error": "Failed to delete one or more child strategies."}