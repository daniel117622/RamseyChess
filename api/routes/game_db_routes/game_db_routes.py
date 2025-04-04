from flask import Blueprint, request, jsonify
from data_access.game_db_manager import ChessGameDoc , ChessGameManager
from data_access.strategy_cards_manager import AiPremadeManager
from bson.objectid import ObjectId
from typing import Any
import requests
# For transactions
from data_access.connector import db
from pymongo.errors import PyMongoError
import math
from utils.socket_exception import post_exception_handler
import json

game_db_routes = Blueprint('game_db_routes', __name__)

def json_serializer(obj):
    if isinstance(obj, ObjectId):
        return {"$oid": str(obj)}  # Return the ObjectId as MongoDB format
    raise TypeError("Type not serializable")


@game_db_routes.route('/get_game_by_id', methods=['GET'])
@post_exception_handler 
def get_games_by_id():
    game_id = request.args.get("game_id")

    if not game_id:
        return jsonify({"error": "Game ID is required"}), 400

    game_manager = ChessGameManager()
    game = game_manager.loadById(game_id)

    if not game:
        return jsonify({"error": "Game not found"}), 404

    return jsonify(game_manager.getCurrent()), 200


@game_db_routes.route('/get_games_by_owner_paged', methods=['POST'])
@post_exception_handler
def get_games_by_owner_paged():
    data = request.json  

    user_id = data.get("sub")  
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    ai_manager = AiPremadeManager()
    all_user_strategies = ai_manager.getByOwner(user_id)

    strategy_list = [strategy["_id"]["$oid"] for strategy in all_user_strategies]
    
    game_manager = ChessGameManager()
    game_manager.loadByStrategyListWithNames(strategy_list)
    games = game_manager.getCurrent()
        

    if not games:
        return jsonify({"error": "No games found for this user. New strategy created"}), 404

    items_per_page = int(data.get("items_per_page", 10))
    page_number    = int(data.get("page_number", 0))

    total_items = len(games)
    total_pages = math.ceil(total_items / items_per_page)

    # Check if requested page exists
    if page_number < 0 or page_number >= total_pages:
        return jsonify({"error": "Requested page does not exist"}), 400

    start_idx = page_number * items_per_page
    end_idx   = start_idx + items_per_page

    # Trim the array to match the requested page
    paged_games = games[start_idx:end_idx]

    # Prepare the response data
    response = {
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page_number,
        "games": [json.loads(json.dumps(game, default=json_serializer)) for game in paged_games]
    }

    return jsonify(response), 200



@game_db_routes.route('/get_games_by_owner', methods=['POST'])
@post_exception_handler
def get_games_by_owner():
    data = request.json
    user_id = data.get("sub")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    ai_manager = AiPremadeManager()
    all_user_strategies = ai_manager.getByOwner(user_id)

    strategy_list = [strategy["_id"]["$oid"] for strategy in all_user_strategies]
    

    game_manager = ChessGameManager()
    game_manager.loadByStrategyList(strategy_list)
    games = game_manager.getCurrent()

    if not games:
        return jsonify({"error": "No games found for this user"}), 404

    # If there are multiple games, return a list of games
    response = [json.loads(json.dumps(game, default=json_serializer)) for game in games]
    return jsonify(response), 200


@game_db_routes.route('/post_pvp_game', methods=['POST'])
@post_exception_handler
def post_pvp_game():
    data = request.json

    white_strategy_id = data.get("white_strategy_id")
    black_strategy_id = data.get("black_strategy_id")
    game_date         = data.get("game_date")
    pgn               = data.get("pgn")
    owner             = data.get("owner")

    if not white_strategy_id or not black_strategy_id or not game_date or not pgn:
        return jsonify({"error": "Missing required fields"}), 400

    chess_game = ChessGameDoc(
        _id               = None,              
        strategy_id_white = white_strategy_id,
        strategy_id_black = black_strategy_id,
        game_date         = game_date,
        pgn               = pgn,
        owner             = owner,
    )

    game_manager = ChessGameManager()
    result = game_manager.insertOne(chess_game)

    if result:
        return jsonify({
            "message": "Game successfully recorded",
            "inserted_id": str(result.inserted_id)
        }), 201
    else:
        return jsonify({"error": "Failed to record game"}), 500

