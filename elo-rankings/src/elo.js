const EloRank = require('elo-rank');
const elo = new EloRank();
const mongodb = require('mongodb');
const getDb = require('./get-db')

async function getCollection(collection) {
	const db = await getDb
	return db.collection(collection)
}

// Existing function for resolving a game with winner and loser
module.exports = (winnerElo, loserElo, kFactor) => {
    const expected = elo.getExpected(winnerElo, loserElo);
    return (kFactor || 32) * (1 - expected);
};

module.exports.resolveDraw = async function({ player1, player2 }) {
    // Validate inputs
    if (!player1 || !player2) {
        throw new Error('Both player1 and player2 are required.');
    }

    // Fetch player data from the database
    const players = await getCollection('players');
    const playerDocs = await players.find({ name: { $in: [player1, player2] } }).toArray();

    if (playerDocs.length !== 2) {
        throw new Error('One or both players could not be found.');
    }

    const [playerDoc1, playerDoc2] = playerDocs;
    const elo1 = playerDoc1.elo;
    const elo2 = playerDoc2.elo;

    // Calculate expected scores using Elo formula
    const expected1 = elo.getExpected(elo1, elo2);  // Expected score for player 1
    const expected2 = elo.getExpected(elo2, elo1);  // Expected score for player 2

    // Calculate dynamic probability of a draw based on Elo difference
    const eloDifference = Math.abs(elo1 - elo2);
    const drawProbability = 1 / (1 + Math.exp(eloDifference / 400));  // Logistic function for draw probability

    // K-factor for Elo calculation
    const kFactor = 32; // Default value, can be changed dynamically

    // Elo adjustment for both players based on draw result (S = 0.5 for both players)
    const delta1 = Math.round(kFactor * (0.5 - expected1));  // Elo adjustment for player 1
    const delta2 = Math.round(kFactor * (0.5 - expected2));  // Elo adjustment for player 2

    // Adjust the Elo based on who had the higher rating (reduce the higher player's rating)
    let adjustedDelta1 = delta1;
    let adjustedDelta2 = delta2;

    if (elo1 > elo2) {
        // Player 1 has a higher Elo, reduce it slightly and increase player 2's Elo
        adjustedDelta1 = Math.round(delta1 * 0.75);  // Reduce Elo for higher-rated player (player 1)
        adjustedDelta2 = Math.round(delta2 * 1.25);  // Increase Elo for lower-rated player (player 2)
    } else if (elo2 > elo1) {
        // Player 2 has a higher Elo, reduce it slightly and increase player 1's Elo
        adjustedDelta1 = Math.round(delta1 * 1.25);  // Increase Elo for lower-rated player (player 1)
        adjustedDelta2 = Math.round(delta2 * 0.75);  // Reduce Elo for higher-rated player (player 2)
    }

    // Update Elo for both players in the database
    const date = new Date();
    await players.updateOne({ _id: mongodb.ObjectID(playerDoc1._id) }, {
        $inc: { elo: adjustedDelta1 },
        $set: { lastActivity: date }
    });

    await players.updateOne({ _id: mongodb.ObjectID(playerDoc2._id) }, {
        $inc: { elo: adjustedDelta2 },
        $set: { lastActivity: date }
    });

    // Log the draw game to history
    const history = await getCollection('history');
    await history.insertOne({
        time: date,
        players: [
            { name: playerDoc1.name, elo: playerDoc1.elo + adjustedDelta1 },
            { name: playerDoc2.name, elo: playerDoc2.elo + adjustedDelta2 }
        ],
        winners: [],
        losers: [],
        deltaElo: Math.abs(adjustedDelta1),  // You can log the absolute value of Elo change for clarity
        draw: true
    });

    return {
        message: 'game resolved',
        deltaElo: Math.abs(adjustedDelta1),  // Same delta for both players (absolute value)
        players: [
            { name: playerDoc1.name, elo: playerDoc1.elo + adjustedDelta1 },
            { name: playerDoc2.name, elo: playerDoc2.elo + adjustedDelta2 }
        ],
        probability: drawProbability  // Dynamic probability based on Elo difference
    };
};
