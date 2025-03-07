from flask import Blueprint, request, jsonify
from data_access.user_manager import UserProfileManager, UserProfileDoc
from data_access.material_manager import EvaluateMaterialManager, EvaluateMaterialDoc
from data_access.strategy_cards_manager import AiPremadeStratDoc, AiPremadeManager, Strategy
from bson.objectid import ObjectId
from typing import Any
import copy
import logging
# For transactions
from data_access.connector import db
from pymongo.errors import PyMongoError
import math

game_db_routes = Blueprint('game_db_routes', __name__)

