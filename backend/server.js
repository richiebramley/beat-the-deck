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
let isConnected = false;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("beatTheDeck");
        scores = db.collection("leaderboard");
        isConnected = true;
        console.log("Connected to MongoDB Atlas");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        console.error("Server will start but API endpoints will return errors until MongoDB is connected");
        isConnected = false;
        // Retry connection every 10 seconds
        setTimeout(connectDB, 10000);
    }
}

// Helper to check if MongoDB is connected
function checkConnection(res) {
    if (!isConnected) {
        res.status(503).json({ 
            error: "Service temporarily unavailable - database connection pending",
            retry: true
        });
        return false;
    }
    return true;
}

// Helper function to compare two scores
// Returns: 1 if newScore is better, -1 if oldScore is better, 0 if equal
function compareScores(newScore, oldScore) {
    // 1. Winners always rank above losers
    if (newScore.result === 'win' && oldScore.result === 'lose') {
        return 1; // New score is better
    }
    if (newScore.result === 'lose' && oldScore.result === 'win') {
        return -1; // Old score is better
    }
    
    // Both have same result type, compare by ranking criteria
    // 2. Highest stacksRemaining
    if (newScore.stacksRemaining > oldScore.stacksRemaining) {
        return 1;
    }
    if (newScore.stacksRemaining < oldScore.stacksRemaining) {
        return -1;
    }
    
    // 3. Highest longestStreak
    if (newScore.longestStreak > oldScore.longestStreak) {
        return 1;
    }
    if (newScore.longestStreak < oldScore.longestStreak) {
        return -1;
    }
    
    // 4. Lowest remainingCards
    if (newScore.remainingCards < oldScore.remainingCards) {
        return 1;
    }
    if (newScore.remainingCards > oldScore.remainingCards) {
        return -1;
    }
    
    // 5. Most recent timestamp (tiebreaker - if all else equal, update with newer score)
    if (newScore.timestamp > oldScore.timestamp) {
        return 1;
    }
    if (newScore.timestamp < oldScore.timestamp) {
        return -1;
    }
    
    return 0; // Scores are identical
}

// Save score
app.post("/api/score", async (req, res) => {
    if (!checkConnection(res)) return;
    
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
        const newScore = {
            username: trimmedUsername,
            stacksRemaining: Number(stacksRemaining),
            longestStreak: Number(longestStreak),
            remainingCards: Number(remainingCards),
            result: result,
            timestamp: Date.now()
        };

        // Check if user already has an entry
        const existingScore = await scores.findOne({ username: trimmedUsername });
        
        if (existingScore) {
            // Compare scores - only update if new score is better or equal
            const comparison = compareScores(newScore, existingScore);
            if (comparison >= 0) {
                // New score is better or equal, update it
                await scores.updateOne(
                    { username: trimmedUsername },
                    { $set: newScore }
                );
                res.status(200).json({ 
                    message: "Score updated successfully",
                    action: "updated"
                });
            } else {
                // Old score is better, keep it
                res.status(200).json({ 
                    message: "Score not updated - previous score was better",
                    action: "kept_existing"
                });
            }
        } else {
            // No existing entry, insert new one
            await scores.insertOne(newScore);
            res.status(201).json({ 
                message: "Score saved successfully",
                action: "inserted"
            });
        }
    } catch (error) {
        console.error("Error saving score:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get leaderboard
app.get("/api/leaderboard", async (req, res) => {
    if (!checkConnection(res)) return;
    
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
    res.json({ 
        status: "ok", 
        timestamp: Date.now(),
        mongodb: isConnected ? "connected" : "disconnected"
    });
});

// Start server
const PORT = process.env.PORT || 3000;

// Start the server immediately, MongoDB connection will happen in background
app.listen(PORT, () => {
    console.log(`Leaderboard API running on port ${PORT}`);
    console.log("Attempting to connect to MongoDB...");
    // Start MongoDB connection (non-blocking)
    connectDB();
});

