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
        document.getElementById('higher-btn').addEventListener('click', () => this.makeGuess('higher'));
        document.getElementById('lower-btn').addEventListener('click', () => this.makeGuess('lower'));
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
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

    makeGuess(guess) {
        if (this.gameState !== 'guessing') return;
        if (this.deck.remainingCards() === 0) {
            this.endGame(true); // Win - no more cards to draw
            return;
        }

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
        
        if (won) {
            titleElement.textContent = 'Congratulations!';
            titleElement.style.color = '#4caf50';
            messageElement.textContent = 'You beat the deck! All cards have been used.';
        } else {
            titleElement.textContent = 'Game Over';
            titleElement.style.color = '#f44336';
            messageElement.textContent = 'All face-up decks have been burned. Better luck next time!';
        }
        
        gameOverDiv.style.display = 'flex';
    }

    startNewGame() {
        // Reset everything
        this.deck = new Deck();
        this.faceUpStacks = [];
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.lastDrawnCard = null;
        this.lastGuess = null;
        this.lastGuessResult = null;
        
        // Hide game over screen
        document.getElementById('game-over').style.display = 'none';
        this.hideGameControls();
        
        // Initialize new game
        this.initializeGame();
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});