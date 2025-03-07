from flask import Blueprint, request, jsonify
from data_access.game_db_manager import ChessGameDoc , ChessGameManager
from bson.objectid import ObjectId
from typing import Any

# For transactions
from data_access.connector import db
from pymongo.errors import PyMongoError
import math
from utils.socket_exception import post_exception_handler

game_db_routes = Blueprint('game_db_routes', __name__)


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


@game_db_routes.route('/get_games_by_owner_paged', methods=['GET'])
@post_exception_handler
def get_games_by_owner_paged():
    data = request.args

    user_id        = data.get("sub")
    items_per_page = int(data.get("items_per_page", 10))
    page_number    = int(data.get("page_number", 1))

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    game_manager = ChessGameManager()
    games = game_manager.loadByOwner(user_id)

    total_items = len(games)
    total_pages = math.ceil(total_items / items_per_page)
    start_idx = (page_number - 1) * items_per_page
    end_idx = start_idx + items_per_page
    paged_games = games[start_idx:end_idx]

    return jsonify({
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page_number,
        "games": [game_manager.getCurrent() for game in paged_games]
    }), 200

@game_db_routes.route('/get_games_by_owner', methods=['GET'])
@post_exception_handler
def get_games_by_owner():
    user_id = request.args.get("sub")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    game_manager = ChessGameManager()
    games = game_manager.loadByOwner(user_id)

    if not games:
        return jsonify({"error": "No games found for this user"}), 404

    game_manager.loadByOwner(user_id)
    response = game_manager.getCurrent()
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
