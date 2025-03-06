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
    type?: string
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
    type?: string
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
    strategy_details: StrategyDetailResponse | null;
  }
  

interface Strategy 
{
  collection: string;
  strat_id  : string;
}

export interface StrategyRequest 
{
  strategy_list: Strategy[];
}

interface EvaluateMaterialDetail {
  _id: ObjectId;
  name: string;
  owner: string | null;
  type: "evaluate_material";
  blackPieces: PieceValues;
  whitePieces: PieceValues;
}

interface EvaluateDangerDetail {
  _id: ObjectId;
  name: string;
  owner: string | null;
  type: string;
  blackPieces: {
      attackedPieces: number;
      hangingPieces: number;
  };
  whitePieces: {
      attackedPieces: number;
      hangingPieces: number;
  };
}

export type StrategyDetail = EvaluateMaterialDetail
export interface StrategyDetailResponse extends Array<StrategyDetail> {}


interface StrategyGeneric {
  _id: ObjectId;
  name: string;
  owner: string;
  [key: string]: any;
}

export interface PaginatedStrategyResponse {
  strategies: StrategyCardListProfileView[];
  total_pages: number;
  current_page: number;
}

export interface StrategyCardListProfileView {
  _id: ObjectId;
  elo: number;
  losses: number;
  name: string;
  owner: string;
  strategy_list: StrategyGeneric[];
  wins: number;
  description: string; 
}


