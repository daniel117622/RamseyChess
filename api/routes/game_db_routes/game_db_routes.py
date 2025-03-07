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

@game_db_routes.route('/get_games_by_id', methods=['GET'])
def get_games_by_id():
    data    = request.json()
    user_id = data.get("sub")

    return jsonify({})

@game_db_routes.route('/get_games_by_id_paged', methods=['GET'])
def get_games_by_id():
    data           = request.json()
    user_id        = data.get("sub")
    items_per_page = data.get("items_per_page")
    page_number    = data.get("page_number")

    return jsonify({})

@game_db_routes.route('/post_pvp_game', methods=['POST'])
@post_exception_handler
def post_pvp_game():
    data = request.json()

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
    if game_manager.insertByName(chess_game):
        return jsonify({"message": "Game successfully recorded"}), 201
    else:
        return jsonify({"error": "Failed to record game"}), 500
