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
    if (newScore.result === 'win') {
        // For winners: Most to least Stacks remaining, then Longest Streak
        // 1. Compare stacksRemaining (higher is better)
        if (newScore.stacksRemaining > oldScore.stacksRemaining) {
            return 1;
        }
        if (newScore.stacksRemaining < oldScore.stacksRemaining) {
            return -1;
        }
        
        // 2. Compare longestStreak (higher is better)
        if (newScore.longestStreak > oldScore.longestStreak) {
            return 1;
        }
        if (newScore.longestStreak < oldScore.longestStreak) {
            return -1;
        }
    } else {
        // For losers: Fewest to most cards left, then longest to shortest streak
        // 1. Compare remainingCards (lower is better)
        if (newScore.remainingCards < oldScore.remainingCards) {
            return 1;
        }
        if (newScore.remainingCards > oldScore.remainingCards) {
            return -1;
        }
        
        // 2. Compare longestStreak (higher is better)
        if (newScore.longestStreak > oldScore.longestStreak) {
            return 1;
        }
        if (newScore.longestStreak < oldScore.longestStreak) {
            return -1;
        }
    }
    
    // 3. Most recent timestamp (tiebreaker - if all else equal, update with newer score)
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
            // Compare scores to determine if new score is better ranked
            // compareScores returns: 1 if newScore is better, -1 if oldScore is better, 0 if equal
            const comparison = compareScores(newScore, existingScore);
            const isNewScoreBetter = comparison > 0;
            const isEqual = comparison === 0;
            
            console.log(`Score comparison for ${trimmedUsername}:`, {
                new: { result: newScore.result, stacks: newScore.stacksRemaining, streak: newScore.longestStreak, cards: newScore.remainingCards },
                old: { result: existingScore.result, stacks: existingScore.stacksRemaining, streak: existingScore.longestStreak, cards: existingScore.remainingCards },
                comparison: comparison,
                isNewScoreBetter: isNewScoreBetter,
                willUpdate: comparison >= 0
            });
            
            if (comparison >= 0) {
                // New score is better ranked or equal - override the existing score
                await scores.updateOne(
                    { username: trimmedUsername },
                    { $set: newScore }
                );
                const reason = isNewScoreBetter ? "new score is better ranked" : "scores are equal (updating with newer timestamp)";
                console.log(`✓ Updated score for ${trimmedUsername} - ${reason}`);
                res.status(200).json({ 
                    message: "Score updated successfully",
                    action: "updated",
                    reason: reason
                });
            } else {
                // Old score is better ranked - keep the existing score
                console.log(`✗ Kept existing score for ${trimmedUsername} - previous score is better ranked`);
                res.status(200).json({ 
                    message: "Score not updated - previous score is better ranked",
                    action: "kept_existing"
                });
            }
        } else {
            // No existing entry, insert new one
            await scores.insertOne(newScore);
            console.log(`✓ Inserted new score for ${trimmedUsername}`);
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
        // Get month and year from query parameters, default to current month
        const now = new Date();
        let year = parseInt(req.query.year) || now.getFullYear();
        let month = parseInt(req.query.month);
        
        // If month not provided, use current month
        if (isNaN(month)) {
            month = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
        }
        
        // Validate month (1-12)
        if (month < 1 || month > 12) {
            return res.status(400).json({ error: "Invalid month. Must be between 1 and 12." });
        }
        
        // Calculate start and end of the month in milliseconds
        const startOfMonth = new Date(year, month - 1, 1).getTime();
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();
        
        // Build match filter for month
        const monthMatch = {
            timestamp: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        };
        
        // Sort logic:
        // Winners: Most to least Stacks remaining, then Longest Streak
        // Losers: Fewest to most cards left, then longest to shortest streak
        // Winners always appear before losers
        
        // Use aggregation pipeline with $facet to sort winners and losers separately
        const result = await scores.aggregate([
            {
                $facet: {
                    winners: [
                        { $match: { $and: [{ result: 'win' }, monthMatch] } },
                        {
                            $sort: {
                                stacksRemaining: -1,   // Most to least stacks
                                longestStreak: -1,     // Longest streak
                                timestamp: -1     // Most recent first (tiebreaker)
                            }
                        },
                        { $limit: 100 }
                    ],
                    losers: [
                        { $match: { $and: [{ result: 'lose' }, monthMatch] } },
                        {
                            $sort: {
                                remainingCards: 1,     // Fewest to most cards left
                                longestStreak: -1,     // Longest to shortest streak
                                timestamp: -1     // Most recent first (tiebreaker)
                            }
                        },
                        { $limit: 100 }
                    ]
                }
            },
            {
                $project: {
                    leaderboard: { $concatArrays: ['$winners', '$losers'] }
                }
            },
            { $unwind: '$leaderboard' },
            { $replaceRoot: { newRoot: '$leaderboard' } },
            { $limit: 100 }
        ]).toArray();
        
        // Set cache-control headers to prevent browser caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(result);
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

