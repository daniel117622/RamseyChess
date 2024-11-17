from flask import Blueprint, request, jsonify
from data_access.material_manager import EvaluateMaterialManager
from data_access.strategy_cards_manager import AiPremadeStratDoc, AiPremadeManager
import sys

public_routes = Blueprint('public_routes', __name__)

@public_routes.route('/get_strategies', methods=['GET'])
def get_strategies():
  pm = AiPremadeManager()
  public_strats = pm.getNullOwner()
  print(public_strats, file=sys.stdout)
  return jsonify({
    "strategies" : public_strats
  })

@public_routes.route('/get_strategies_expand', methods=['GET'])
def get_strategies_expand():
  pm = AiPremadeManager()
  public_strats = pm.getNullOwner()

  print(public_strats, file=sys.stdout)
  return public_strats


@public_routes.route('/get_evaluators', methods=['GET'])
def get_evaluators():
  em = EvaluateMaterialManager()

  public_ems = em.getNullOwner()

  return jsonify({
    "material_evaluators" : public_ems,
  })

@public_routes.route('/get_strategy_detail', methods=['POST'])
def get_strategy_detail():
  req = request.get_json()
  strategy_list = req["strategy_list"]
  available_collections = {
    "evaluate_material": EvaluateMaterialManager,
  }

  strategy_details_list = []
  for strategy in strategy_list:
    collection = strategy["collection"]
    
    if collection in available_collections:
        manager = available_collections[collection]()
        manager.loadById(strategy["strat_id"])
        
        payload = manager.getCurrent()
        payload["type"] = collection
        strategy_details_list.append(payload)
  
  return strategy_details_list

@public_routes.route('/get_strategy_detail_by_id', methods=['POST'])
def get_strategy_detail_by_id():
  req = request.get_json()
  strategy_id = req["strategy_id"]
  
  strategy_manager = AiPremadeManager()
  strategy_manager.loadById(strategy_id)

  strategy_list = strategy_manager.getCurrent()["strategy_list"]

  available_collections = {
    "evaluate_material": EvaluateMaterialManager,
  }

  strategy_details_list = []
  for strategy in strategy_list:
    collection = strategy["collection"]
    
    if collection in available_collections:
        manager = available_collections[collection]()
        manager.loadById(strategy["strat_id"])
        
        payload = manager.getCurrent()
        payload["type"] = collection
        strategy_details_list.append(payload)
  
  return strategy_details_list
