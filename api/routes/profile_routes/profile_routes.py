from flask import Blueprint, request, jsonify
from data_access.user_manager import UserProfileManager, UserProfileDoc
from data_access.material_manager import EvaluateMaterialManager, EvaluateMaterialDoc
from data_access.strategy_cards_manager import AiPremadeStratDoc, AiPremadeManager, Strategy
from bson.objectid import ObjectId
from typing import Any

# For transactions
from data_access.connector import db
from pymongo.errors import PyMongoError


profile_routes = Blueprint('profle_routes', __name__)

available_managers = {
  "evaluate_material": EvaluateMaterialManager
}
@profile_routes.route('/get_player_data', methods=['POST'])
def get_player_data() -> Any:
  """Subscribes the player if not in the database, and returns its data as the emty set , else retrieves its chess bots data"""
  data = request.json
  if data:
    oauth_sub = data.get("sub", None)
    nickname  = data.get("nickname", None)
    username  = data.get("username", None)

  manager   = UserProfileManager()

  if manager.load_one_by_sub(oauth_sub):
    user_mongo_data = manager.getCurrent()
    return jsonify(user_mongo_data) , 200
  
  else:
    new_user : UserProfileDoc = UserProfileDoc(
        _id=ObjectId(),  # Generate a new ObjectId
        sub=oauth_sub,
        nickname=nickname,
        username=username,
        elo=1000,
        strategies=[],
        last_login=None
    )

  if manager.add_user(new_user):
    manager.load_one_by_sub(oauth_sub)
    user_mongo_data = manager.getCurrent()
    return jsonify(user_mongo_data) , 200
  else:
    return jsonify({"ERROR": "COULD NOT CREATE USER"}) , 400

@profile_routes.route('/register_strategy', methods=['POST'])
def register_strategy() -> Any:
    data = request.json
    if not data:
        return jsonify({"error": "Request data missing"}), 400

    oauth_sub = data.get("owner")
    if not oauth_sub:
        return jsonify({"error": "User 'sub' not provided"}), 400

    manager = UserProfileManager()
    user_data = manager.load_one_by_sub(oauth_sub)

    if not user_data:
        return jsonify({"error": "User does not exists"}), 400

    # EXAMPLE DOCUMENT 
    # {
    # "name": "default strategy",
    # "wins": 0,
    # "losses": 0,
    # "elo": 1000,
    # "owner": "google-oauth2|102988724522543185916",
    # "description": "This is a default strategy description.",
    # "strategy_list": [
    #     {
    #         "collection": "evaluate_material",
    #         "name": "My strategy name",
    #         "owner": "google-oauth2|102988724522543185916",
    #         "blackPieces": {
    #             "pawn": -1,
    #             "knight": -3,
    #             "bishop": -3,
    #             "rook": -5,
    #             "queen": -9,
    #             "king": -20
    #         },
    #         "whitePieces": {
    #             "pawn": 1,
    #             "knight": 3,
    #             "bishop": 3,
    #             "rook": 5,
    #             "queen": 9,
    #             "king": 20
    #         }
    #     }
    #   ]
    # }
    client = db.client
    session = client.start_session()
    session.start_transaction()
    try:
        strategy_list = []
        for strategy in data["strategy_list"]:
            strat_doc = EvaluateMaterialDoc(
                _id=ObjectId(),
                name=strategy["name"],
                owner=strategy["owner"],
                whitePieces=strategy["whitePieces"],
                blackPieces=strategy["blackPieces"]
            )
            collection = strategy["collection"]
            manager = available_managers[collection]()
            inserted_id = manager.insertIntoDb(strat_doc)
            if inserted_id:
                strategy_list.append({"collection": collection, "strat_id": inserted_id})
            else:
                raise ValueError(f"Failed to insert strategy: {strategy['name']}")

        full_strat_doc = AiPremadeStratDoc(
            _id=ObjectId(),
            name=data["name"],
            strategy_list=strategy_list,
            wins=0,
            losses=0,
            elo=1000,
            owner=data["owner"],
            description = data["description"]
        )
        strat_card_manager = AiPremadeManager()
        if not strat_card_manager.insertIntoDb(full_strat_doc):
            raise ValueError("Failed to insert strategy card")

        session.commit_transaction()
        return jsonify({"success": True}), 200

    except (PyMongoError, ValueError) as e:
        session.abort_transaction()
        return jsonify({"error": str(e)}), 500

    finally:
        session.end_session()


@profile_routes.route('/get_private_strategies', methods=['POST'])
def get_private_strategies():
    data = request.json
    if not data:
        return jsonify({"error": "Request data missing"}), 400

    oauth_sub = data.get("sub")
    if not oauth_sub:
        return jsonify({"error": "User 'sub' not provided"}), 400

    manager = UserProfileManager()
    user_data = manager.load_one_by_sub(oauth_sub)

    if not user_data:
        return jsonify({"error": "User does not exists"}), 400
    
    ai_manager = AiPremadeManager()
    my_strategies = ai_manager.getByOwner(oauth_sub)

    strategy_view = []

    for single_strategy in my_strategies:
      for strategy in single_strategy["strategy_list"]:
        collection   = strategy["collection"]
        evaluator_id = strategy["strat_id"]
        manager = available_managers[collection]()
    
        manager.loadById(evaluator_id)
        found_strat = manager.getCurrent()
        found_strat["type"] = collection
        strategy_view.append(found_strat)

      # PER STRATEGY MAKE THE REPLACEMENT
      single_strategy["strategy_list"] = strategy_view

    return jsonify(my_strategies)     
      

     



