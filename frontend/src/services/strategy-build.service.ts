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
    name : "insert name",
    owner: null,
    blackPieces : {
      "pawn"  : -1,
      "knight": -3,
      "bishop": -3,
      "rook"  : -5,
      "queen" : -9,
      "king"  : -20
    },
    whitePieces: {
      "pawn"  : 1,
      "knight": 3,
      "bishop": 3,
      "rook"  : 5,
      "queen" : 9,
      "king"  : 20
    }
  }

  buildable_strategy: BuildableStrategy = {
    name: "default strategy",
    wins: 0,
    losses: 0,
    elo: 1000,
    owner: "",
    description: "This is a default strategy description.",
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

  saveStrategy()
  {
    return 1
  }
  
}