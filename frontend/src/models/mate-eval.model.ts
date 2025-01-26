interface ChessPieces {
    pawn  : number;
    knight: number;
    bishop: number;
    rook  : number;
    queen : number;
    king  : number;
  }
  
  export interface MatevalModel {
    collection : string
    name       : string;
    whitePieces: ChessPieces;
    blackPieces: ChessPieces;
    owner      : string | null;
  }