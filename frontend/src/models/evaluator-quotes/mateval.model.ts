export enum MaterialChessPieceEmotion {
    Excited      = "excited",
    Comfort      = "comfort",
    Disappointed = "disappointed",
}

export const ChessPieceMaterialQuotes = {
    pawn: {
        [MaterialChessPieceEmotion.Excited]: [
            "You really value me!",
            "A small step for a pawn, a giant leap for the kingdom!",
            "Promote me, and I'll be worth much more!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "Thanks for seeing my potential!",
            "I may be worth one, but I can still defend!",
            "Even a pawn can turn the game!"
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "Am I just here to be sacrificed?",
            "I thought I had value too...",
            "Are you sure I'm just worth one?"
        ]
    },
    knight: {
        [MaterialChessPieceEmotion.Excited]: [
            "Sure I'm woth more than 3 points, I'm pure power!",
            "I'm ready to jump over anything in my way!",
            "I'm worth the trade!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "I'll guard the board with my three points of strength.",
            "Holding the center with valor!",
            "The trusty knight is always valuable."
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "Stuck on the side again?",
            "Not sure if I’m worth the trade here...",
            "Isn't there a better square for me?"
        ]
    },
    bishop: {
        [MaterialChessPieceEmotion.Excited]: [
            "Three points of diagonals incoming!",
            "I cover the long game!",
            "I'm invaluable on open lines!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "I may be worth three, but I'm steady in my color.",
            "I'll support the team from afar.",
            "The bishop's quiet power is underestimated."
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "Just a three-pointer backup?",
            "I thought my diagonals were more appreciated.",
            "Are my long moves not enough here?"
        ]
    },
    rook: {
        [MaterialChessPieceEmotion.Excited]: [
            "Five points ready to dominate!",
            "Let me control the open files!",
            "The power of the rook is unmatched!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "Five solid points holding the ranks.",
            "I'll keep the lines safe and strong.",
            "Steadfast, the rook protects."
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "Am I just waiting to castle?",
            "Why keep my five points locked in?",
            "I’m worth more than just defense!"
        ]
    },
    queen: {
        [MaterialChessPieceEmotion.Excited]: [
            "Nine points of unmatched power!",
            "I command the board!",
            "The queen dominates everything in sight!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "The queen always protects the king.",
            "With nine points, I bring balance to the board.",
            "I’m always here, guarding the game."
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "You’re holding back my nine points of power?",
            "I was born to rule, not stay idle!",
            "Is this really the best move for me?"
        ]
    },
    king: {
        [MaterialChessPieceEmotion.Excited]: [
            "I'm the heart of the game, invaluable!",
            "The kingdom depends on me!",
            "Every piece moves for me!"
        ],
        [MaterialChessPieceEmotion.Comfort]: [
            "Protected as I should be.",
            "Let the others shield me.",
            "The king stays safe, for the game depends on it."
        ],
        [MaterialChessPieceEmotion.Disappointed]: [
            "Why am I so exposed?",
            "Is this my last stand?",
            "The king needs his defenses!"
        ]
    }
} as const;

export type ChessPieceType = keyof typeof ChessPieceMaterialQuotes;
