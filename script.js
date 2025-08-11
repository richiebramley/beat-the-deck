class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue();
    }

    getValue() {
        if (this.rank === 'A') return 14; // Ace is highest
        if (this.rank === 'K') return 13;
        if (this.rank === 'Q') return 12;
        if (this.rank === 'J') return 11;
        return parseInt(this.rank);
    }

    getDisplayRank() {
        return this.rank;
    }

    getSuitSymbol() {
        const symbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        return symbols[this.suit];
    }

    getColor() {
        return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }

    initializeDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    drawCard() {
        return this.cards.pop();
    }

    remainingCards() {
        return this.cards.length;
    }
}

class Game {
    constructor() {
        this.deck = new Deck();
        this.faceUpStacks = [];
        this.selectedStackIndex = null;
        this.gameState = 'selecting'; // 'selecting', 'guessing', 'showing-result', 'game-over'
        this.lastDrawnCard = null;
        this.lastGuess = null;
        this.lastGuessResult = null;
        
        this.initializeGame();
        this.bindEvents();
    }

    initializeGame() {
        // Deal 9 cards face up
        for (let i = 0; i < 9; i++) {
            this.faceUpStacks.push([this.deck.drawCard()]);
        }
        
        this.renderFaceUpCards();
        this.updateGameInfo();
    }

    bindEvents() {
        // Use event delegation for all game buttons since they're created dynamically
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'higher-btn') {
                console.log('Higher button clicked'); // Debug log
                this.makeGuess('higher');
            } else if (e.target && e.target.id === 'lower-btn') {
                console.log('Lower button clicked'); // Debug log
                this.makeGuess('lower');
            } else if (e.target && e.target.id === 'new-game-btn') {
                console.log('New Game button clicked'); // Debug log
                this.startNewGame();
            }
        });
        console.log('All game button event delegation set up'); // Debug log
        
        // Bind hamburger menu events
        this.bindMenuEvents();
    }

    bindMenuEvents() {
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        const closeMenu = document.getElementById('close-menu');

        // Open menu
        hamburgerMenu.addEventListener('click', () => {
            menuOverlay.classList.add('active');
            hamburgerMenu.setAttribute('aria-expanded', 'true');
        });

        // Close menu
        closeMenu.addEventListener('click', () => {
            menuOverlay.classList.remove('active');
            hamburgerMenu.setAttribute('aria-expanded', 'false');
        });

        // Close menu when clicking outside
        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) {
                menuOverlay.classList.remove('active');
                hamburgerMenu.setAttribute('aria-expanded', 'false');
            }
        });
    }

    renderFaceUpCards() {
        const container = document.getElementById('face-up-cards');
        container.innerHTML = '';

        this.faceUpStacks.forEach((stack, index) => {
            if (stack === 'burned') {
                // Show burned stack as face-down card
                const burnedCard = this.createBurnedCardElement(index);
                container.appendChild(burnedCard);
            } else if (stack.length > 0) {
                // Show active stack with top card
                const topCard = stack[stack.length - 1];
                const cardElement = this.createCardElement(topCard, index);
                container.appendChild(cardElement);
            }
        });
    }

    createCardElement(card, stackIndex) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.getColor()}`;
        cardDiv.dataset.stackIndex = stackIndex;
        
        if (this.selectedStackIndex === stackIndex) {
            // If this is a correct guess, show green outline instead of blue
            if (this.lastGuessResult === true && this.gameState === 'showing-result') {
                cardDiv.classList.add('correct-guess');
            } else {
                // Only add selected class if not showing correct result
                cardDiv.classList.add('selected');
            }
        }

        // Check if this is the newly drawn card
        if (this.lastDrawnCard && card === this.lastDrawnCard && stackIndex === this.selectedStackIndex && this.gameState === 'showing-result') {
            // Determine if the guess was correct by checking if the stack will be burned
            const isCorrect = this.lastGuessResult;
            const animationClass = isCorrect ? 'new-card' : 'new-card-incorrect';
            
            cardDiv.classList.add(animationClass);
            // Remove the animation class after the animation completes
            setTimeout(() => {
                cardDiv.classList.remove(animationClass);
            }, 2000);
        }

        cardDiv.innerHTML = `
            <div class="corner top-left">
                <div class="rank">${card.getDisplayRank()}</div>
                <div class="suit">${card.getSuitSymbol()}</div>
            </div>
            <div class="center-suit">${card.getSuitSymbol()}</div>
            <div class="corner bottom-right">
                <div class="rank">${card.getDisplayRank()}</div>
                <div class="suit">${card.getSuitSymbol()}</div>
            </div>
        `;

        // Add floating action buttons after setting innerHTML
        if (this.selectedStackIndex === stackIndex) {
            const floatingButtons = document.createElement('div');
            floatingButtons.className = 'floating-guess-buttons';
            floatingButtons.innerHTML = `
                <button id="higher-btn" class="guess-btn">Higher</button>
                <button id="lower-btn" class="guess-btn">Lower</button>
            `;
            
            // Add event listeners to the floating buttons
            floatingButtons.querySelector('#higher-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card selection when clicking button
                this.makeGuess('higher');
            });
            
            floatingButtons.querySelector('#lower-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card selection when clicking button
                this.makeGuess('lower');
            });
            
            cardDiv.appendChild(floatingButtons);
        }

        cardDiv.addEventListener('click', () => this.selectCard(stackIndex));
        
        return cardDiv;
    }

    createBurnedCardElement(stackIndex) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card burned';
        cardDiv.dataset.stackIndex = stackIndex;
        
        cardDiv.innerHTML = `
            <div class="burned-indicator">BURNED</div>
        `;
        
        return cardDiv;
    }

    selectCard(stackIndex) {
        if (this.gameState !== 'selecting' && this.gameState !== 'guessing') return;
        if (this.faceUpStacks[stackIndex] === 'burned') return; // Burned stack
        if (this.faceUpStacks[stackIndex].length === 0) return; // Empty stack

        // If already selecting a different stack, allow changing selection
        if (this.gameState === 'guessing' && this.selectedStackIndex !== stackIndex) {
            this.selectedStackIndex = stackIndex;
            this.renderFaceUpCards();
            this.showGameControls();
            return;
        }

        // If selecting the same stack while already guessing, do nothing
        if (this.gameState === 'guessing' && this.selectedStackIndex === stackIndex) {
            return;
        }

        // Initial selection
        this.selectedStackIndex = stackIndex;
        this.gameState = 'guessing';
        
        this.renderFaceUpCards();
        this.showGameControls();
    }

    showGameControls() {
        // Re-render cards to show floating buttons
        this.renderFaceUpCards();
    }

    hideGameControls() {
        // No need to show/hide game status anymore
    }

    hideFloatingButtons() {
        // Remove floating buttons from the selected card
        const selectedCard = document.querySelector(`[data-stack-index="${this.selectedStackIndex}"]`);
        if (selectedCard) {
            const floatingButtons = selectedCard.querySelector('.floating-guess-buttons');
            if (floatingButtons) {
                floatingButtons.remove();
            }
        }
    }

    triggerCelebration() {
        console.log('🎉 Triggering celebration animation!');
        
        // Create 52 celebration cards that fly in different directions
        for (let i = 0; i < 52; i++) {
            setTimeout(() => {
                this.createCelebrationCard();
            }, i * 100); // Stagger the creation for a wave effect
        }
    }

    createCelebrationCard() {
        const card = document.createElement('div');
        card.className = 'celebration-card';
        
        // Generate random card content
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
        const isRed = randomSuit === '♥' || randomSuit === '♦';
        
        // Add color class
        if (isRed) {
            card.classList.add('red');
        } else {
            card.classList.add('black');
        }
        
        // Create card content
        card.innerHTML = `
            <div class="rank top-left">${randomRank}</div>
            <div class="suit top-left">${randomSuit}</div>
            <div class="center-suit">${randomSuit}</div>
            <div class="rank bottom-right">${randomRank}</div>
            <div class="suit bottom-right">${randomSuit}</div>
        `;
        
        // Random starting position (center of screen)
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;
        
        // Random flight direction and rotation
        const angle = Math.random() * Math.PI * 2; // Random angle 0-360°
        const distance = 100 + Math.random() * 200; // Random distance 100-300px
        const flyX = Math.cos(angle) * distance;
        const flyY = Math.sin(angle) * distance;
        const rotate = (Math.random() - 0.5) * 720; // Random rotation -360° to +360°
        
        // Set CSS custom properties for the animation
        card.style.setProperty('--fly-x', flyX + 'px');
        card.style.setProperty('--fly-y', flyY + 'px');
        card.style.setProperty('--rotate', rotate + 'deg');
        
        // Position the card
        card.style.left = startX + 'px';
        card.style.top = startY + 'px';
        
        // Add to DOM
        document.body.appendChild(card);
        
        // Remove the card element after animation completes
        setTimeout(() => {
            if (card.parentNode) {
                card.parentNode.removeChild(card);
            }
        }, 3000);
    }

    // Console test method for celebration animation
    testCelebration() {
        console.log('🎉 Testing celebration animation...');
        this.triggerCelebration();
    }

    // Console test method for full winning sequence
    testWinningSequence() {
        console.log('🏆 Testing full winning sequence...');
        
        // Simulate the final winning scenario
        console.log('1️⃣ Final card being placed...');
        
        // Trigger celebration immediately (simulating final card placement)
        this.triggerCelebration();
        
        // Show win message after celebration
        setTimeout(() => {
            console.log('2️⃣ Celebration complete! Showing win screen...');
            this.endGame(true);
        }, 3000);
        
        console.log('🎯 Full winning sequence initiated!');
        console.log('📱 Watch the celebration animation for 3 seconds, then the win screen will appear.');
    }

    makeGuess(guess) {
        if (this.gameState !== 'guessing') return;
        
        this.lastGuess = guess;
        this.lastDrawnCard = this.deck.drawCard();
        
        const selectedStack = this.faceUpStacks[this.selectedStackIndex];
        const topCard = selectedStack[selectedStack.length - 1];
        
        const isCorrect = this.evaluateGuess(topCard, this.lastDrawnCard, guess);
        this.lastGuessResult = isCorrect; // Store the result for animation
        
        this.gameState = 'showing-result';
        this.hideGameControls();
        
        // Hide the floating buttons immediately after guess
        this.hideFloatingButtons();
        
        // Add the card to the stack immediately for visual feedback
        this.faceUpStacks[this.selectedStackIndex].push(this.lastDrawnCard);
        this.renderFaceUpCards();
        
        if (isCorrect) {
            // Check if this was the final card and player won
            if (this.deck.remainingCards() === 0) {
                this.triggerCelebration();
                setTimeout(() => this.endGame(true), 3000); // Show celebration for 3 seconds
                return;
            }
            // Card stays on the stack, continue after a brief pause
            setTimeout(() => this.continueAfterCorrectGuess(), 1000);
        } else {
            // Show the card for 2 seconds, then burn the stack
            setTimeout(() => this.burnStack(), 2000);
        }
    }

    evaluateGuess(currentCard, drawnCard, guess) {
        if (currentCard.value === drawnCard.value) {
            return false; // Same value always burns the deck
        }
        
        if (guess === 'higher') {
            return drawnCard.value > currentCard.value;
        } else {
            return drawnCard.value < currentCard.value;
        }
    }

    continueAfterCorrectGuess() {
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.lastDrawnCard = null; // Clear the drawn card reference
        this.lastGuessResult = null; // Clear the guess result
        this.renderFaceUpCards(); // Re-render to remove selected state
        this.updateGameInfo();
    }

    burnStack() {
        // Mark the stack as burned but keep it visible
        this.faceUpStacks[this.selectedStackIndex] = 'burned';
        this.renderFaceUpCards();
        
        // Check if all stacks are burned
        const activeStacks = this.faceUpStacks.filter(stack => stack !== 'burned' && stack.length > 0).length;
        
        if (activeStacks === 0) {
            this.endGame(false); // Lose - all stacks burned
            return;
        }
        
        if (this.deck.remainingCards() === 0) {
            this.endGame(true); // Win - no more cards to draw
            return;
        }
        
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.lastDrawnCard = null; // Clear the drawn card reference
        this.lastGuessResult = null; // Clear the guess result
        this.updateGameInfo();
    }





    updateGameInfo() {
        document.getElementById('cards-remaining').textContent = this.deck.remainingCards();
        const activeStacks = this.faceUpStacks.filter(stack => stack !== 'burned' && stack.length > 0).length;
        document.getElementById('active-decks').textContent = activeStacks;
    }



    endGame(won) {
        this.gameState = 'game-over';
        const gameOverDiv = document.getElementById('game-over');
        const titleElement = document.getElementById('game-over-title');
        const messageElement = document.getElementById('game-over-message');
        
        const remainingCards = this.deck.remainingCards();
        
        if (won) {
            titleElement.textContent = 'Congratulations!';
            titleElement.style.color = '#4caf50';
            messageElement.textContent = `You beat the deck! All cards have been used.`;
        } else {
            titleElement.textContent = 'Game Over';
            titleElement.style.color = '#f44336';
            messageElement.textContent = `All face-up decks have been burned. ${remainingCards} cards were still remaining. Better luck next time!`;
        }
        
        gameOverDiv.style.display = 'flex';
    }

    startNewGame() {
        console.log('startNewGame called'); // Debug log
        
        // Reset everything
        this.deck = new Deck();
        this.faceUpStacks = [];
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.lastDrawnCard = null;
        this.lastGuess = null;
        this.lastGuessResult = null;
        
        console.log('Game state reset, deck cards:', this.deck.remainingCards()); // Debug log
        
        // Hide game over screen
        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv) {
            gameOverDiv.style.display = 'none';
            console.log('Game over screen hidden'); // Debug log
        } else {
            console.error('Game over div not found'); // Debug log
        }
        
        // Clear any existing floating buttons
        const existingButtons = document.querySelectorAll('.floating-guess-buttons');
        existingButtons.forEach(button => button.remove());
        console.log('Cleared', existingButtons.length, 'floating buttons'); // Debug log
        
        // Initialize new game
        this.initializeGame();
        console.log('Game initialized, face-up stacks:', this.faceUpStacks.length); // Debug log
        
        // Ensure game state is properly set
        this.updateGameInfo();
        console.log('Game info updated'); // Debug log
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // Make game instance globally accessible for console testing
    window.game = game;
    
    console.log('🎮 Beat the Deck game loaded!');
    console.log('🎉 To test celebration animation, type: game.testCelebration()');
    console.log('🏆 To test full winning sequence, type: game.testWinningSequence()');
});