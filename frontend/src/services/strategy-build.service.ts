import { Injectable } from '@angular/core';
import { Component } from '@angular/core';

interface ObjectId {
  $oid: string;
}

interface PieceValues {
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
  king: number;
}

interface EvaluateMaterialData {
  _id: ObjectId;
  name: string;
  owner: string | null;
  blackPieces: PieceValues;
  whitePieces: PieceValues;
}

interface EvaluateDangerData {
  _id: ObjectId;
  name: string;
  whitePieces: {
    hangingPieces: number;
    attackedPieces: number;
  };
  blackPieces: {
    hangingPieces: number;
    attackedPieces: number;
  };
  owner: string | null;
}

interface Strategy {
  collection: string;
  strat_id: string;
}

export interface StrategyCardData {
  _id: ObjectId;
  name: string;
  strategy_list: Strategy[];
  wins: number;
  losses: number;
  elo: number;
  evaluate_material_data: EvaluateMaterialData;
  evaluate_danger_data: EvaluateDangerData;
}

@Injectable({
  providedIn: 'root'
})

export class StrategyBuildService {

  constructor() { }

  getMockStrategy(): StrategyCardData[] {
    return [
      {
        _id: { $oid: '1234567890abcdef12345678' },
        name: 'Aggressive Play',
        strategy_list: [
          { collection: 'evaluate_material', strat_id: 'abc123' },
          { collection: 'evaluate_danger', strat_id: 'def456' }
        ],
        wins: 20,
        losses: 5,
        elo: 1500,
        evaluate_material_data: {
          _id: { $oid: 'abcdef1234567890abcdef12' },
          name: 'Material Evaluation',
          owner: 'Player1',
          blackPieces: {
            pawn: 1,
            knight: 3,
            bishop: 3,
            rook: 5,
            queen: 9,
            king: 1000
          },
          whitePieces: {
            pawn: 1,
            knight: 3,
            bishop: 3,
            rook: 5,
            queen: 9,
            king: 1000
          }
        },
        evaluate_danger_data: {
          _id: { $oid: 'fedcba0987654321fedcba09' },
          name: 'Danger Evaluation',
          whitePieces: {
            hangingPieces: 2,
            attackedPieces: 3
          },
          blackPieces: {
            hangingPieces: 1,
            attackedPieces: 4
          },
          owner: 'Player1'
        }
      }
    ];
  }
}