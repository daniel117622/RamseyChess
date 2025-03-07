from flask import Blueprint, request, jsonify
from data_access.game_db_manager import ChessGameDoc , ChessGameManager
from bson.objectid import ObjectId
from typing import Any

# For transactions
from data_access.connector import db
from pymongo.errors import PyMongoError
import math

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