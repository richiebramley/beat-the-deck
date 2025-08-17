class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue();
    }

    getValue() {
        if (this.rank === 'JOKER') return 0; // Jokers have special value
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
            'spades': '♠',
            'joker': '🃏'
        };
        return symbols[this.suit];
    }

    getColor() {
        if (this.suit === 'joker') return 'joker';
        return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
    }
    
    isJoker() {
        return this.suit === 'joker';
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
        
        // Add 2 Jokers as wildcards
        this.cards.push(new Card('joker', 'JOKER'));
        this.cards.push(new Card('joker', 'JOKER'));
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
                this.makeGuess('higher');
                // Track game interaction
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'game_interaction', {
                        'event_category': 'gameplay',
                        'event_label': 'higher_guess'
                    });
                }
            } else if (e.target && e.target.id === 'lower-btn') {
                this.makeGuess('lower');
                // Track game interaction
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'game_interaction', {
                        'event_category': 'gameplay',
                        'event_label': 'lower_guess'
                    });
                }
            } else if (e.target && e.target.id === 'new-game-btn') {
                this.startNewGame();
                // Track new game
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'game_start', {
                        'event_category': 'gameplay',
                        'event_label': 'new_game'
                    });
                }
            }
        });
        
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
                // Create a stack container for burned stacks to maintain grid position
                const stackContainer = document.createElement('div');
                stackContainer.className = 'card-stack';
                stackContainer.dataset.stackIndex = index;
                
                // Show burned stack as face-down card
                const burnedCard = this.createBurnedCardElement(index);
                stackContainer.appendChild(burnedCard);
                
                container.appendChild(stackContainer);
            } else if (stack.length > 0) {
                // Create a stack container for multiple cards
                const stackContainer = document.createElement('div');
                stackContainer.className = 'card-stack';
                stackContainer.dataset.stackIndex = index;
                
                // Render all cards in the stack with offset
                stack.forEach((card, cardIndex) => {
                    const cardElement = this.createCardElement(card, index, cardIndex, stack.length);
                    stackContainer.appendChild(cardElement);
                });
                
                container.appendChild(stackContainer);
            }
        });
    }

    createCardElement(card, stackIndex, cardIndex, totalCardsInStack) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.getColor()}`;
        cardDiv.dataset.stackIndex = stackIndex;
        cardDiv.dataset.cardIndex = cardIndex;
        
        // Add offset for stacked cards (right and down)
        if (cardIndex > 0) {
            const xOffset = cardIndex * 11.25; // 11.25px offset per card (reduced by 25% from 15px)
            const yOffset = cardIndex * 8; // 8px downward offset per card
            cardDiv.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            cardDiv.style.zIndex = cardIndex; // Ensure proper layering
            
            // Set CSS custom properties for animations to preserve the offset
            cardDiv.style.setProperty('--card-offset', `${xOffset}px`);
            cardDiv.style.setProperty('--card-y-offset', `${yOffset}px`);
        }
        
        if (this.selectedStackIndex === stackIndex) {
            // Only highlight the top card (highest cardIndex) in the selected stack
            if (cardIndex === totalCardsInStack - 1) {
                // If this is a correct guess, show green outline instead of blue
                if (this.lastGuessResult === true && this.gameState === 'showing-result') {
                    cardDiv.classList.add('correct-guess');
                } else {
                    // Only add selected class if not showing correct result
                    cardDiv.classList.add('selected');
                }
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

        if (card.isJoker()) {
            // Special display for Jokers - only center symbol and corner text
            cardDiv.innerHTML = `
                <div class="corner top-left">
                    <div class="rank">JOKER</div>
                </div>
                <div class="center-suit">🃏</div>
                <div class="corner bottom-right">
                    <div class="rank">JOKER</div>
                </div>
            `;
        } else {
            // Regular card display
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
        }

        // Add floating action buttons after setting innerHTML
        if (this.selectedStackIndex === stackIndex && cardIndex === totalCardsInStack - 1) {
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
            <div class="skull-crossbones">☠</div>
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
        // Track celebration event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'celebration_triggered', {
                'event_category': 'gameplay',
                'event_label': 'win_celebration'
            });
        }
        
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
        // Jokers are always valid - they can be placed on any card
        if (drawnCard.isJoker()) {
            return true;
        }
        
        // If the current card is a Joker, any card can be placed on top
        if (currentCard.isJoker()) {
            return true;
        }
        
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
            // All stacks are now burned - trigger fire animation on ALL stacks
            this.triggerAllStacksBurnAnimation();
            setTimeout(() => this.endGame(false), 4000); // Show fire animation for 4 seconds
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

    triggerAllStacksBurnAnimation() {
        // Track epic burn event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'all_stacks_burned', {
                'event_category': 'gameplay',
                'event_label': 'epic_fire_animation'
            });
        }
        
        // Get all stack containers and trigger fire on each one
        const allStackContainers = document.querySelectorAll('.card-stack');
        
        allStackContainers.forEach((stackContainer, stackIndex) => {
            const cards = stackContainer.querySelectorAll('.card');
            
            // Stagger the burning effect between different stacks
            setTimeout(() => {
                cards.forEach((card, cardIndex) => {
                    // Add burning class with delay for each card within the stack
                    setTimeout(() => {
                        card.classList.add('burning');
                        // Create fire particles for this card
                        this.createFireParticles(card, cardIndex);
                    }, cardIndex * 150); // Slightly faster burning within each stack
                });
            }, stackIndex * 200); // Stagger between different stacks (reduced from 300ms)
        });
    }

    createFireParticles(card, cardIndex) {
        // Create multiple fire particles for each card
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createFireParticle(card, cardIndex);
            }, i * 100); // Stagger particle creation
        }
    }

    createFireParticle(card, cardIndex) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        
        // Position particle relative to the card
        const cardRect = card.getBoundingClientRect();
        const stackContainer = card.closest('.card-stack');
        const stackRect = stackContainer.getBoundingClientRect();
        
        // Calculate position relative to the stack container
        const relativeX = cardRect.left - stackRect.left + (cardRect.width / 2);
        const relativeY = cardRect.top - stackRect.top + (cardRect.height / 2);
        
        // Add offset for stacked cards
        const offset = cardIndex * 11.25;
        
        particle.style.left = (relativeX + offset) + 'px';
        particle.style.top = relativeY + 'px';
        
        // Add to the stack container
        stackContainer.appendChild(particle);
        
        // Remove particle after animation completes
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }





    updateGameInfo() {
        const remainingCards = this.deck.remainingCards();
        document.getElementById('cards-remaining').textContent = remainingCards;
        
        // Count Jokers in remaining cards
        const jokersRemaining = this.deck.cards.filter(card => card.isJoker()).length;
        
        // Update active stacks count
        const activeStacks = this.faceUpStacks.filter(stack => stack !== 'burned' && stack.length > 0).length;
        document.getElementById('active-decks').textContent = activeStacks;
        
        // Show Joker count if any remain
        const jokerInfo = document.getElementById('joker-info');
        if (jokerInfo) {
            if (jokersRemaining > 0) {
                jokerInfo.textContent = `🃏 ${jokersRemaining} Joker${jokersRemaining > 1 ? 's' : ''} remaining`;
                jokerInfo.style.display = 'block';
            } else {
                jokerInfo.style.display = 'none';
            }
        }
    }



    endGame(won) {
        this.gameState = 'game-over';
        const gameOverDiv = document.getElementById('game-over');
        const titleElement = document.getElementById('game-over-title');
        const messageElement = document.getElementById('game-over-message');
        
        const remainingCards = this.deck.remainingCards();
        
        // Track game outcome
        if (typeof gtag !== 'undefined') {
            gtag('event', 'game_end', {
                'event_category': 'gameplay',
                'event_label': won ? 'win' : 'lose',
                'value': remainingCards || 0
            });
        }
        
        if (won) {
            titleElement.textContent = 'Congratulations!';
            titleElement.style.color = '#4caf50';
            messageElement.textContent = `You beat the deck! All cards have been used.`;
        } else {
            titleElement.textContent = 'Oh No!';
            titleElement.style.color = '#f44336';
            messageElement.textContent = `${remainingCards} cards were still remaining. Better luck next time!`;
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
        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv) {
            gameOverDiv.style.display = 'none';
        } else {
            console.error('Game over div not found');
        }
        
        // Clear any existing floating buttons
        const existingButtons = document.querySelectorAll('.floating-guess-buttons');
        existingButtons.forEach(button => button.remove());
        
        // Initialize new game
        this.initializeGame();
        
        // Ensure game state is properly set
        this.updateGameInfo();
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // Make game instance globally accessible for console testing
    window.game = game;
});