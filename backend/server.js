import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

let db;
let scores;

// Compare two scores to determine if newScore is better than existingScore
// Returns true if newScore is better, false otherwise
function compareScores(newScore, existingScore) {
    // 1. Winners always beat losers
    if (newScore.result === 'win' && existingScore.result === 'lose') {
        return true;
    }
    if (newScore.result === 'lose' && existingScore.result === 'win') {
        return false;
    }

    // 2. Both are winners or both are losers - compare by stacks remaining
    if (newScore.stacksRemaining !== existingScore.stacksRemaining) {
        return newScore.stacksRemaining > existingScore.stacksRemaining;
    }

    // 3. Same stacks remaining - compare by longest streak
    if (newScore.longestStreak !== existingScore.longestStreak) {
        return newScore.longestStreak > existingScore.longestStreak;
    }

    // 4. Same stacks and streak - compare by remaining cards (lower is better)
    if (newScore.remainingCards !== existingScore.remainingCards) {
        return newScore.remainingCards < existingScore.remainingCards;
    }

    // 5. Everything is the same - prefer more recent (newer is better for tiebreaker)
    return newScore.timestamp > existingScore.timestamp;
}

// Clean up duplicate entries - keep only the best score for each user
async function cleanupDuplicates() {
    try {
        // Group by username and find duplicates
        const duplicates = await scores.aggregate([
            {
                $group: {
                    _id: "$username",
                    entries: { $push: "$$ROOT" },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]).toArray();

        // For each user with duplicates, keep the best entry and delete others
        for (const duplicate of duplicates) {
            const entries = duplicate.entries;
            let bestEntry = entries[0];

            // Find the best entry by comparing all entries
            for (let i = 1; i < entries.length; i++) {
                if (compareScores(entries[i], bestEntry)) {
                    bestEntry = entries[i];
                }
            }

            // Delete all entries for this user
            await scores.deleteMany({ username: duplicate._id });

            // Re-insert the best entry
            await scores.insertOne(bestEntry);
        }

        if (duplicates.length > 0) {
            console.log(`Cleaned up ${duplicates.length} duplicate user entries`);
        }
    } catch (error) {
        console.error("Error cleaning up duplicates:", error);
        // Don't fail the connection if cleanup fails
    }
}

async function connectDB() {
    try {
        await client.connect();
        db = client.db("beatTheDeck");
        scores = db.collection("leaderboard");
        
        // Create unique index on username to ensure one entry per user
        // If duplicates exist, keep the best score for each user
        try {
            // First, clean up any existing duplicates (keep best score per user)
            await cleanupDuplicates();
            
            // Then create unique index
            await scores.createIndex({ username: 1 }, { unique: true });
            console.log("Unique index on username created");
        } catch (error) {
            // Index might already exist or there might be duplicates
            console.log("Index creation note:", error.message);
            // Still try to cleanup duplicates
            await cleanupDuplicates();
        }
        
        console.log("Connected to MongoDB Atlas");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

// Save score
app.post("/api/score", async (req, res) => {
    try {
        const { username, stacksRemaining, longestStreak, remainingCards, result } = req.body;
        
        // Validation
        if (!username || stacksRemaining === undefined || longestStreak === undefined || 
            remainingCards === undefined || !result) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate result value
        if (result !== 'win' && result !== 'lose') {
            return res.status(400).json({ error: "result must be 'win' or 'lose'" });
        }

        // Validate ranges
        if (stacksRemaining < 0 || stacksRemaining > 9) {
            return res.status(400).json({ error: "stacksRemaining must be between 0 and 9" });
        }

        if (remainingCards < 0 || remainingCards > 54) {
            return res.status(400).json({ error: "remainingCards must be between 0 and 54" });
        }

        const trimmedUsername = username.trim();
        const scoreDoc = {
            username: trimmedUsername,
            stacksRemaining: Number(stacksRemaining),
            longestStreak: Number(longestStreak),
            remainingCards: Number(remainingCards),
            result: result,
            timestamp: Date.now()
        };

        // Check if user already has an entry
        const existingEntry = await scores.findOne({ username: trimmedUsername });

        if (existingEntry) {
            // Compare scores to determine if new score is better
            const isNewScoreBetter = compareScores(
                scoreDoc,
                existingEntry
            );

            if (isNewScoreBetter) {
                // Update existing entry with new better score
                await scores.updateOne(
                    { username: trimmedUsername },
                    { $set: scoreDoc }
                );
                res.status(200).json({ message: "Score updated successfully" });
            } else {
                // New score is not better, keep existing
                res.status(200).json({ message: "Existing score is better, no update needed" });
            }
        } else {
            // First time entry, insert new
            await scores.insertOne(scoreDoc);
            res.status(201).json({ message: "Score saved successfully" });
        }
    } catch (error) {
        console.error("Error saving score:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get leaderboard
app.get("/api/leaderboard", async (req, res) => {
    try {
        // Sort logic:
        // 1. Winners (result: 'win') before losers (result: 'lose')
        // 2. Highest stacksRemaining
        // 3. Highest longestStreak
        // 4. Lowest remainingCards (only relevant for losers, but we'll sort anyway)
        // 5. Most recent timestamp (descending)
        
        // Use aggregation pipeline to properly sort winners first
        const leaderboard = await scores.aggregate([
            {
                $addFields: {
                    // Create a sort key: 0 for wins, 1 for losses
                    resultSortKey: {
                        $cond: [{ $eq: ["$result", "win"] }, 0, 1]
                    }
                }
            },
            {
                $sort: {
                    resultSortKey: 1,      // Wins (0) before losses (1)
                    stacksRemaining: -1,   // Highest first
                    longestStreak: -1,     // Highest first
                    remainingCards: 1,     // Lowest first
                    timestamp: -1          // Most recent first
                }
            },
            {
                $limit: 50
            },
            {
                $project: {
                    resultSortKey: 0 // Remove the temporary sort key from output
                }
            }
        ]).toArray();
        
        res.json(leaderboard);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
});

// Start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Leaderboard API running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

