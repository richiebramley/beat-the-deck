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
        this.renderRemainingDeck();
        this.updateGameInfo();
    }

    bindEvents() {
        document.getElementById('higher-btn').addEventListener('click', () => this.makeGuess('higher'));
        document.getElementById('lower-btn').addEventListener('click', () => this.makeGuess('lower'));
        document.getElementById('cancel-btn').addEventListener('click', () => this.cancelSelection());
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

    renderRemainingDeck() {
        const remainingDeckContainer = document.getElementById('remaining-deck');
        const deckCountElement = document.getElementById('deck-count');
        
        // Clear existing deck cards
        remainingDeckContainer.innerHTML = '';
        
        const remainingCards = this.deck.remainingCards();
        deckCountElement.textContent = remainingCards;
        
        if (remainingCards === 0) {
            return; // No cards left to show
        }
        
        // Create a visual stack effect by showing multiple cards with slight offsets
        const maxCardsToShow = Math.min(5, Math.ceil(remainingCards / 10)); // Show up to 5 card layers
        
        for (let i = 0; i < maxCardsToShow; i++) {
            const deckCard = document.createElement('div');
            deckCard.className = 'deck-card';
            deckCard.style.top = `${-i * 2}px`;
            deckCard.style.left = `${-i * 1}px`;
            deckCard.style.zIndex = maxCardsToShow - i;
            remainingDeckContainer.appendChild(deckCard);
        }
    }

    createCardElement(card, stackIndex) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.getColor()}`;
        cardDiv.dataset.stackIndex = stackIndex;
        
        if (this.selectedStackIndex === stackIndex) {
            cardDiv.classList.add('selected');
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
            <div class="rank">${card.getDisplayRank()}</div>
            <div class="suit">${card.getSuitSymbol()}</div>
            <div class="rank">${card.getDisplayRank()}</div>
        `;

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
        if (this.gameState !== 'selecting') return;
        if (this.faceUpStacks[stackIndex] === 'burned') return; // Burned stack
        if (this.faceUpStacks[stackIndex].length === 0) return; // Empty stack

        this.selectedStackIndex = stackIndex;
        this.gameState = 'guessing';
        
        this.renderFaceUpCards();
        this.showGameControls();
    }

    showGameControls() {
        const selectedCard = this.faceUpStacks[this.selectedStackIndex][this.faceUpStacks[this.selectedStackIndex].length - 1];
        document.getElementById('selected-card').textContent = `${selectedCard.getDisplayRank()}${selectedCard.getSuitSymbol()}`;
        
        const gameControls = document.getElementById('game-controls');
        gameControls.style.display = 'block';
        
        // Position the controls over the selected card
        this.positionControlsOverCard();
        
        document.getElementById('game-status').style.display = 'none';
    }

    positionControlsOverCard() {
        const gameControls = document.getElementById('game-controls');
        const faceUpContainer = document.getElementById('face-up-cards');
        
        // Calculate position based on grid layout (3x3)
        const row = Math.floor(this.selectedStackIndex / 3);
        const col = this.selectedStackIndex % 3;
        
        // Get container dimensions
        const containerRect = faceUpContainer.getBoundingClientRect();
        const containerStyle = window.getComputedStyle(faceUpContainer);
        const gap = parseInt(containerStyle.gap) || 8;
        
        // Calculate card size and position
        const cardWidth = (containerRect.width - (2 * gap)) / 3;
        const cardHeight = cardWidth * (4/3); // aspect-ratio 3/4
        
        const cardLeft = col * (cardWidth + gap);
        const cardTop = row * (cardHeight + gap);
        
        // Position controls in center of selected card
        const centerX = cardLeft + (cardWidth / 2);
        const centerY = cardTop + (cardHeight / 2);
        
        gameControls.style.left = `${centerX}px`;
        gameControls.style.top = `${centerY}px`;
        gameControls.style.transform = 'translate(-50%, -50%)';
    }

    hideGameControls() {
        document.getElementById('game-controls').style.display = 'none';
        document.getElementById('game-status').style.display = 'block';
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
        
        // Start the card animation from deck to selected stack
        this.animateCardToStack(isCorrect);
        
        if (isCorrect) {
            // Card stays on the stack, continue after animation completes
            setTimeout(() => this.continueAfterCorrectGuess(), 1800);
        } else {
            // Show the card for 2 seconds, then burn the stack
            setTimeout(() => this.burnStack(), 2800);
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

    animateCardToStack(isCorrect) {
        // Get the positions of the deck and target stack
        const deckElement = document.getElementById('remaining-deck');
        const faceUpContainer = document.getElementById('face-up-cards');
        
        if (!deckElement || !faceUpContainer) return;
        
        const deckRect = deckElement.getBoundingClientRect();
        const containerRect = faceUpContainer.getBoundingClientRect();
        
        // Calculate target position based on selected stack
        const row = Math.floor(this.selectedStackIndex / 3);
        const col = this.selectedStackIndex % 3;
        const containerStyle = window.getComputedStyle(faceUpContainer);
        const gap = parseInt(containerStyle.gap) || 8;
        const cardWidth = (containerRect.width - (2 * gap)) / 3;
        const cardHeight = cardWidth * (4/3);
        
        const targetX = containerRect.left + col * (cardWidth + gap) + (cardWidth / 2);
        const targetY = containerRect.top + row * (cardHeight + gap) + (cardHeight / 2);
        
        // Create flying card element
        const flyingCard = document.createElement('div');
        flyingCard.className = 'flying-card';
        
        // Responsive card size calculation
        const cardSize = window.innerWidth <= 480 ? {width: 60, height: 80} : 
                        window.innerWidth <= 768 ? {width: 70, height: 95} : 
                        {width: 80, height: 110};
        
        flyingCard.style.left = `${deckRect.left + deckRect.width/2 - cardSize.width/2}px`;
        flyingCard.style.top = `${deckRect.top + deckRect.height/2 - cardSize.height/2}px`;
        
        document.body.appendChild(flyingCard);
        
        // Update remaining deck immediately
        this.renderRemainingDeck();
        
        // Animate to target position
        setTimeout(() => {
            flyingCard.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            flyingCard.style.left = `${targetX - cardSize.width/2}px`;
            flyingCard.style.top = `${targetY - cardSize.height/2}px`;
            
            // Start flip animation
            flyingCard.classList.add('flipping');
        }, 50);
        
        // Reveal the card halfway through animation
        setTimeout(() => {
            flyingCard.classList.add('revealed', this.lastDrawnCard.getColor());
            flyingCard.innerHTML = `
                <div class="card-content">
                    <div class="rank">${this.lastDrawnCard.getDisplayRank()}</div>
                    <div class="suit">${this.lastDrawnCard.getSuitSymbol()}</div>
                    <div class="rank">${this.lastDrawnCard.getDisplayRank()}</div>
                </div>
            `;
        }, 450);
        
        // Complete animation and update game state
        setTimeout(() => {
            // Add the card to the stack and render
            this.faceUpStacks[this.selectedStackIndex].push(this.lastDrawnCard);
            this.renderFaceUpCards();
            
            // Remove flying card
            flyingCard.remove();
        }, 900);
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



    cancelSelection() {
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.hideGameControls();
        this.renderFaceUpCards();
    }

    updateGameInfo() {
        const remainingCards = this.deck.remainingCards();
        document.getElementById('cards-remaining').textContent = remainingCards;
        document.getElementById('deck-count').textContent = remainingCards;
        const activeStacks = this.faceUpStacks.filter(stack => stack !== 'burned' && stack.length > 0).length;
        document.getElementById('active-decks').textContent = activeStacks;
        this.renderRemainingDeck();
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