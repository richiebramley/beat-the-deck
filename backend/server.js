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

async function connectDB() {
    try {
        await client.connect();
        db = client.db("beatTheDeck");
        scores = db.collection("leaderboard");
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

        const scoreDoc = {
            username: username.trim(),
            stacksRemaining: Number(stacksRemaining),
            longestStreak: Number(longestStreak),
            remainingCards: Number(remainingCards),
            result: result,
            timestamp: Date.now()
        };

        await scores.insertOne(scoreDoc);

        res.status(201).json({ message: "Score saved successfully" });
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

