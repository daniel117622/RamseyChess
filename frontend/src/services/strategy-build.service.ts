import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Component } from '@angular/core';
import { MatevalModel } from 'src/models/mate-eval.model';

interface StrategyItem {
  collection: string;
  [key: string]: any;  
}

export interface BuildableStrategy {
  name  : string;
  wins  : number;
  losses: number;
  elo   : number;
  owner : string;
  description: string;
  strategy_list : StrategyItem[]
}



@Injectable({
  providedIn: 'root'
})

export class StrategyBuildService {

  material_eval : MatevalModel = {
    collection : "evaluate_material",
    name : "",
    owner: null,
    blackPieces : {
      "pawn"  : -1,
      "knight": -1,
      "bishop": -1,
      "rook"  : -1,
      "queen" : -1,
      "king"  : -1
    },
    whitePieces: {
      "pawn"  : 1,
      "knight": 1,
      "bishop": 1,
      "rook"  : 1,
      "queen" : 1,
      "king"  : 1
    }
  }

  buildable_strategy: BuildableStrategy = {
    name  : "default strategy",
    wins  : 0,
    losses: 0,
    elo   : 1000,
    owner : "",
    description: "Initial strategy given on account creation",
    strategy_list: [this.material_eval]
  };

  constructor( private http : HttpClient ) { }

  getMatEval() : MatevalModel 
  {
    return this.material_eval
  }

  setMatEval(matEval : MatevalModel)
  {
    this.material_eval = matEval;
  }

  getFullStrategy() : BuildableStrategy
  {
    return this.buildable_strategy
  }

  setOwner(owner_sub : string) : void
  {
    this.buildable_strategy.owner = owner_sub
  }

  saveStrategy()
  {
    return this.http.post('/api/register_strategy', this.buildable_strategy)
  }
  

}