// Analytics Service - Centralized tracking for all game events
class AnalyticsService {
    static track(eventName, params) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, params);
        }
    }
    
    static trackPowerUpUsed(powerUpName, additionalParams = {}) {
        this.track('power_up_used', {
            event_category: 'gameplay',
            event_label: powerUpName,
            value: 1,
            ...additionalParams
        });
    }
    
    static trackGameInteraction(action) {
        this.track('game_interaction', {
            event_category: 'gameplay',
            event_label: action
        });
    }
    
    static trackGameStart() {
        this.track('game_start', {
            event_category: 'gameplay',
            event_label: 'new_game'
        });
    }
    
    static trackGameEnd(won, remainingCards) {
        this.track('game_end', {
            event_category: 'gameplay',
            event_label: won ? 'win' : 'lose',
            value: remainingCards || 0
        });
    }
}

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
    /*
     * Google Analytics 4 Event Tracking
     * 
     * Power-up Events:
     * - power_up_used: Tracks when power-ups are used (check_stacks, sneak_peak)
     * - power_ups_available: Tracks when power-ups become available after first card
     * - power_ups_reset: Tracks when power-ups are reset for new games
     * - power_up_detail: Tracks specific details about power-up usage (card types revealed)
     * - power_up_timing: Tracks when in the game power-ups are used (cards remaining)
     * - power_up_effectiveness: Tracks if guesses are correct after using power-ups
     * 
     * Game Events:
     * - game_interaction: Tracks higher/lower button clicks
     * - game_start: Tracks new game starts
     * - game_end: Tracks game completion (win/lose)
     * - celebration_triggered: Tracks win celebrations
     * - all_stacks_burned: Tracks epic fire animations
     */
    constructor() {
        this.deck = new Deck();
        this.faceUpStacks = [];
        this.selectedStackIndex = null;
        this.gameState = 'selecting'; // 'selecting', 'guessing', 'showing-result', 'game-over'
        this.lastDrawnCard = null;
        this.lastGuess = null;
        this.lastGuessResult = null;
        this.sneakPeakUsed = false; // Track if Check Stacks power-up has been used
        this.peekNextUsed = false; // Track if Sneak Peak power-up has been used
        this.firstCardPlaced = false; // Track if first card has been successfully placed
        this.jokersDrawn = 0; // Track total jokers that have been drawn from deck
        this.stackToBurn = null; // Track which stack should be burned for incorrect guesses
        this.currentStreak = 0; // Track consecutive successful card placements
        this.longestStreak = 0; // Track the highest streak achieved during this game
        
        // Cache frequently accessed DOM elements
        this.elements = {
            cardsRemaining: document.getElementById('cards-remaining'),
            // activeDecks: document.getElementById('active-decks'), // Element removed
            // jokerInfo: document.getElementById('joker-info'), // Element removed
            streakCount: document.getElementById('streak-count'),
            sneakPeakBtn: document.getElementById('sneak-peak-btn'), // "Check Stacks" button
            peekNextBtn: document.getElementById('peek-next-btn'), // "Sneak Peak" button
            faceUpCards: document.getElementById('face-up-cards'),
            gameOver: document.getElementById('game-over'),
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverMessage: document.getElementById('game-over-message'),
            newGameBtn: document.getElementById('new-game-btn'),
            menuOverlay: document.getElementById('menu-overlay'),
            hamburgerMenu: document.getElementById('hamburger-menu'),
            closeMenu: document.getElementById('close-menu')
        };
        
        
        this.initializeGame();
        this.bindEvents();
    }

    initializeGame() {
        // Deal 9 cards face up
        for (let i = 0; i < 9; i++) {
            const drawnCard = this.deck.drawCard();
            this.faceUpStacks.push([drawnCard]);
            
            // Track if a joker was drawn in the initial deal
            if (drawnCard.isJoker()) {
                this.jokersDrawn++;
            }
        }
        
        // Initialize Check Stacks button (disabled until first card is placed)
        if (this.elements.sneakPeakBtn) {
            this.elements.sneakPeakBtn.disabled = true; // Start disabled
            this.elements.sneakPeakBtn.textContent = 'Check Stacks';
            this.elements.sneakPeakBtn.classList.remove('active');
        }
        
        // Initialize Sneak Peak button (disabled until first card is placed)
        if (this.elements.peekNextBtn) {
            this.elements.peekNextBtn.disabled = true; // Start disabled
            this.elements.peekNextBtn.textContent = 'Sneak Peak';
            this.elements.peekNextBtn.classList.remove('active');
        }
        
        this.renderFaceUpCards();
        this.updateGameInfo();
        this.updateStreakDisplay();
    }

    bindEvents() {
        // Use event delegation for all game buttons since they're created dynamically
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'higher-btn') {
                this.makeGuess('higher');
                // Track game interaction
                AnalyticsService.trackGameInteraction('higher_guess');
            } else if (e.target && e.target.id === 'lower-btn') {
                this.makeGuess('lower');
                // Track game interaction
                AnalyticsService.trackGameInteraction('lower_guess');
            } else if (e.target && e.target.id === 'new-game-btn') {
                this.startNewGame();
                // Track new game
                AnalyticsService.trackGameStart();
            } else if (e.target && e.target.id === 'sneak-peak-btn') {
                this.useSneakPeak();
            } else if (e.target && e.target.id === 'peek-next-btn') {
                this.usePeekNext();
            } else if (e.target && e.target.classList.contains('game-container') || 
                       e.target.classList.contains('game-area') || 
                       e.target.classList.contains('face-up-cards')) {
                // Deselect stack when clicking on background areas
                if (this.gameState === 'guessing') {
                    this.deselectStack();
                }
            }
        });
        
        // Bind hamburger menu events
        this.bindMenuEvents();
    }

    bindMenuEvents() {
        // Open menu
        this.elements.hamburgerMenu.addEventListener('click', () => {
            this.elements.menuOverlay.classList.add('active');
            this.elements.hamburgerMenu.setAttribute('aria-expanded', 'true');
        });

        // Close menu
        this.elements.closeMenu.addEventListener('click', () => {
            this.elements.menuOverlay.classList.remove('active');
            this.elements.hamburgerMenu.setAttribute('aria-expanded', 'false');
        });

        // Close menu when clicking outside
        this.elements.menuOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.menuOverlay) {
                this.elements.menuOverlay.classList.remove('active');
                this.elements.hamburgerMenu.setAttribute('aria-expanded', 'false');
            }
        });
    }

    renderFaceUpCards() {
        const container = this.elements.faceUpCards;
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
            // Use temporary offset if Check Stacks power-up is active
            const xOffset = cardIndex * (this.tempXOffset || 4); // 6.75px or 20.25px if power-up active (3x for dramatic effect)
            const yOffset = cardIndex * (this.tempYOffset || 3.5); // 6px or 18px if power-up active (3x for dramatic effect)
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
            
            // Ensure Joker styling is applied by adding a specific class
            cardDiv.classList.add('joker-card');
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
        if (this.gameState === 'game-over') return;
        if (this.faceUpStacks[stackIndex] === 'burned') return; // Burned stack
        if (this.faceUpStacks[stackIndex].length === 0) return; // Empty stack

        // If we're showing a result (animation playing), allow selecting a new stack
        if (this.gameState === 'showing-result') {
            // Just change the selected stack, keep the animation playing
            this.selectedStackIndex = stackIndex;
            this.renderFaceUpCards();
            return;
        }

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
    
    deselectStack() {
        if (this.gameState !== 'guessing') return;
        
        this.selectedStackIndex = null;
        this.gameState = 'selecting';
        this.hideFloatingButtons();
        this.renderFaceUpCards();
        this.updateGameInfo();
    }
    
    useSneakPeak() {
        if (this.sneakPeakUsed) return; // Can only use once per game
        
        this.sneakPeakUsed = true;
        
        // Temporarily increase card offset by 100%
        this.temporarilyIncreaseOffset();
        
        // Disable the button and show countdown
        if (this.elements.sneakPeakBtn) {
            this.elements.sneakPeakBtn.disabled = true;
        }
        
        // Track power-up usage
        AnalyticsService.trackPowerUpUsed('check_stacks');
        
        // Track when in the game the power-up was used
        const remainingCards = this.deck.remainingCards();
        AnalyticsService.track('power_up_timing', {
            event_category: 'gameplay',
            event_label: 'check_stacks_usage_timing',
            value: remainingCards
        });
    }
    
    usePeekNext() {
        if (this.peekNextUsed) return; // Can only use once per game
        
        this.peekNextUsed = true;
        
        // Get the next card without removing it from the deck
        const nextCard = this.deck.cards[this.deck.cards.length - 1];
        
        // Show the next card information
        this.showNextCardInfo(nextCard);
        
        // Disable the button
        if (this.elements.peekNextBtn) {
            this.elements.peekNextBtn.disabled = true;
            this.elements.peekNextBtn.textContent = 'Sneak Peak';
        }
        
        // Track power-up usage
        AnalyticsService.trackPowerUpUsed('sneak_peak');
        
        // Track the type of card revealed for strategic analysis
        AnalyticsService.track('power_up_detail', {
            event_category: 'gameplay',
            event_label: 'sneak_peak_card_type',
            value: nextCard.isJoker() ? 0 : nextCard.value
        });
        
        // Track when in the game the power-up was used
        const remainingCards = this.deck.remainingCards();
        AnalyticsService.track('power_up_timing', {
            event_category: 'gameplay',
            event_label: 'sneak_peak_usage_timing',
            value: remainingCards
        });
    }
    
    showNextCardInfo(nextCard) {
        // Create an overlay card that appears over the game area
        const nextCardOverlay = document.createElement('div');
        nextCardOverlay.className = 'next-card-overlay';
        nextCardOverlay.innerHTML = `
            <div class="next-card ${nextCard.getColor()}">
                <div class="corner top-left">
                    <div class="rank">${nextCard.getDisplayRank()}</div>
                    <div class="suit">${nextCard.getSuitSymbol()}</div>
                </div>
                <div class="center-suit">${nextCard.getSuitSymbol()}</div>
                <div class="corner bottom-right">
                    <div class="rank">${nextCard.getDisplayRank()}</div>
                    <div class="suit">${nextCard.getSuitSymbol()}</div>
                </div>
            </div>
        `;
        
        // Position the card directly below the Sneak Peak button
        if (this.elements.peekNextBtn) {
            const buttonRect = this.elements.peekNextBtn.getBoundingClientRect();
            nextCardOverlay.style.position = 'fixed';
            nextCardOverlay.style.top = (buttonRect.bottom + 10) + 'px'; // 10px below button
            nextCardOverlay.style.left = (buttonRect.left + (buttonRect.width / 2) - 60) + 'px'; // Center on button (60px = half card width)
            nextCardOverlay.style.right = 'auto'; // Override CSS right positioning
        }
        
        // Add to the game area as an overlay
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
            gameArea.appendChild(nextCardOverlay);
        }
        
        // Animate in
        setTimeout(() => {
            nextCardOverlay.classList.add('visible');
        }, 100);
        
        // Animate out after 3 seconds
        setTimeout(() => {
            nextCardOverlay.classList.remove('visible');
            // Remove from DOM after animation completes
            setTimeout(() => {
                if (nextCardOverlay.parentNode) {
                    nextCardOverlay.parentNode.removeChild(nextCardOverlay);
                }
            }, 500);
        }, 3000);
    }
    
    temporarilyIncreaseOffset() {
        // Store original offset values (reduced by 25%)
        const originalXOffset = 6.75; // Reduced from 9px
        const originalYOffset = 6; // Reduced from 8px
        
        // Show countdown in button first
        this.showCountdown();
        
        // Add active class to button for visual feedback
        if (this.elements.sneakPeakBtn) {
            this.elements.sneakPeakBtn.classList.add('active');
        }
        
        // Animate to increased offset over 0.5 seconds (2x base + 50% additional = 3x total)
        this.animateOffsetChange(originalXOffset, originalYOffset, originalXOffset * 3, originalYOffset * 3, 500);
        
        // Return to original offset after 5 seconds
        setTimeout(() => {
            this.animateOffsetChange(originalXOffset * 3, originalYOffset * 3, originalXOffset, originalYOffset, 500);
            
            // Remove active class and reset button text after animation
            setTimeout(() => {
                if (this.elements.sneakPeakBtn) {
                    this.elements.sneakPeakBtn.classList.remove('active');
                    this.elements.sneakPeakBtn.textContent = 'Check Stacks';
                }
                
                // Ensure temporary offsets are cleared
                this.tempXOffset = null;
                this.tempYOffset = null;
                
                // Final re-render to ensure cards use original offset values
                this.renderFaceUpCards();
                
                // Double-check that offsets are reset by logging (for debugging)
                console.log('Check Stacks power-up ended - offsets reset to:', this.tempXOffset, this.tempYOffset);
            }, 500);
        }, 5000);
    }
    
    animateOffsetChange(startX, startY, endX, endY, duration) {
        const startTime = performance.now();
        const totalFrames = Math.ceil(duration / 16); // 60fps target
        let currentFrame = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeProgress = this.easeInOutQuad(progress);
            
            // Calculate current offset values
            const currentX = startX + (endX - startX) * easeProgress;
            const currentY = startY + (endY - startY) * easeProgress;
            
            // Update temporary offsets
            this.tempXOffset = currentX;
            this.tempYOffset = currentY;
            
            // Re-render cards with current offset
            this.renderFaceUpCards();
            
            currentFrame++;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation completed - ensure final values are set exactly
                this.tempXOffset = endX;
                this.tempYOffset = endY;
                this.renderFaceUpCards();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    showCountdown() {
        if (!this.elements.sneakPeakBtn) return;
        
        let countdown = 5;
        
        // Update button text immediately with both text and number
        this.elements.sneakPeakBtn.textContent = `Check Stacks ${countdown}`;
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown >= 0) {
                this.elements.sneakPeakBtn.textContent = `Check Stacks ${countdown}`;
            } else {
                clearInterval(countdownInterval);
                // Ensure button text is reset to original name after countdown
                this.elements.sneakPeakBtn.textContent = 'Check Stacks';
            }
        }, 1000);
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
        AnalyticsService.track('celebration_triggered', {
            event_category: 'gameplay',
            event_label: 'win_celebration'
        });
        
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
        
        // Track if a joker was drawn
        if (this.lastDrawnCard.isJoker()) {
            this.jokersDrawn++;
        }
        
        const selectedStack = this.faceUpStacks[this.selectedStackIndex];
        const topCard = selectedStack[selectedStack.length - 1];
        
        const isCorrect = this.evaluateGuess(topCard, this.lastDrawnCard, guess);
        this.lastGuessResult = isCorrect; // Store the result for animation
        
        // Track power-up effectiveness if power-ups were used
        if (this.sneakPeakUsed || this.peekNextUsed) {
            AnalyticsService.track('power_up_effectiveness', {
                event_category: 'gameplay',
                event_label: 'guess_after_power_up',
                value: isCorrect ? 1 : 0
            });
        }
        
        this.gameState = 'showing-result';
        this.hideGameControls();
        
        // Hide the floating buttons immediately after guess
        this.hideFloatingButtons();
        
        // Add the card to the stack immediately for visual feedback
        this.faceUpStacks[this.selectedStackIndex].push(this.lastDrawnCard);
        this.renderFaceUpCards();
        
        if (isCorrect) {
            // Increment streak for successful guess
            this.currentStreak++;
            this.updateStreakDisplay();
            
            // Check if this was the final card and player won
            if (this.deck.remainingCards() === 0) {
                this.triggerCelebration();
                setTimeout(() => this.endGame(true), 3000); // Show celebration for 3 seconds
                return;
            }
            // Card stays on the stack, continue after a brief pause
            setTimeout(() => this.continueAfterCorrectGuess(), 1000);
        } else {
            // Reset streak to zero for incorrect guess
            this.currentStreak = 0;
            this.updateStreakDisplay();
            
            // Store the stack index that should be burned (the one that had the incorrect guess)
            this.stackToBurn = this.selectedStackIndex;
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
        // Mark that first card has been placed
        if (!this.firstCardPlaced) {
            this.firstCardPlaced = true;
            // Enable Check Stacks button after first successful card placement
            if (this.elements.sneakPeakBtn) {
                this.elements.sneakPeakBtn.disabled = false;
            }
            
            // Enable Sneak Peak button after first successful card placement
            if (this.elements.peekNextBtn) {
                this.elements.peekNextBtn.disabled = false;
            }
            
            // Track power-ups becoming available
            AnalyticsService.track('power_ups_available', {
                event_category: 'gameplay',
                event_label: 'first_card_placed',
                value: 2
            });
        }
        
        // If a new stack was selected during the animation, keep it selected
        if (this.selectedStackIndex !== null) {
            this.gameState = 'guessing';
            this.showGameControls();
        } else {
            this.gameState = 'selecting';
        }
        
        this.lastDrawnCard = null; // Clear the drawn card reference
        this.lastGuessResult = null; // Clear the guess result
        this.renderFaceUpCards(); // Re-render to show current selection state
        this.updateGameInfo();
    }

    burnStack() {
        // Mark the stack as burned but keep it visible (use the stored stack index, not the current selection)
        this.faceUpStacks[this.stackToBurn] = 'burned';
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
        
        // If a new stack was selected during the animation, keep it selected
        if (this.selectedStackIndex !== null) {
            this.gameState = 'guessing';
            this.showGameControls();
        } else {
            this.gameState = 'selecting';
        }
        
        this.lastDrawnCard = null; // Clear the drawn card reference
        this.lastGuessResult = null; // Clear the guess result
        this.stackToBurn = null; // Clear the stored stack to burn
        this.updateGameInfo();
    }

    triggerAllStacksBurnAnimation() {
        // Track epic burn event
        AnalyticsService.track('all_stacks_burned', {
            event_category: 'gameplay',
            event_label: 'epic_fire_animation'
        });
        
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





    updateStreakDisplay() {
        if (this.elements.streakCount) {
            this.elements.streakCount.textContent = this.currentStreak;
        }
        
        // Update longest streak if current streak is higher
        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }
    }

    updateGameInfo() {
        const remainingCards = this.deck.remainingCards();
        this.elements.cardsRemaining.textContent = remainingCards;
        
        // Calculate jokers remaining: total jokers (2) minus jokers drawn
        const jokersRemaining = 2 - this.jokersDrawn;
        
        // Update active stacks count (element removed from HTML)
        const activeStacks = this.faceUpStacks.filter(stack => stack !== 'burned' && stack.length > 0).length;
        // this.elements.activeDecks.textContent = activeStacks; // Element removed
        
        // Show Joker count (including zero) (element removed from HTML)
        // if (this.elements.jokerInfo) {
        //     this.elements.jokerInfo.textContent = `🃏 ${jokersRemaining} Joker${jokersRemaining !== 1 ? 's' : ''} remaining`;
        //     this.elements.jokerInfo.style.display = 'block'; // Always show, even when zero
        // }
    }



    endGame(won) {
        this.gameState = 'game-over';
        
        const remainingCards = this.deck.remainingCards();
        
        // Track game outcome
        AnalyticsService.trackGameEnd(won, remainingCards);
        
        if (won) {
            this.elements.gameOverTitle.textContent = 'Congratulations!';
            this.elements.gameOverTitle.style.color = '#4caf50';
            this.elements.gameOverMessage.textContent = `You beat the deck! All cards have been used.\nYour longest streak was ${this.longestStreak}`;
        } else {
            this.elements.gameOverTitle.textContent = 'Oh No!';
            this.elements.gameOverTitle.style.color = '#f44336';
            if (remainingCards === 0) {
                this.elements.gameOverMessage.textContent = `You used your final card but were unable to Beat The Deck! Better luck next time!\nYour longest streak was ${this.longestStreak}`;
            } else {
                this.elements.gameOverMessage.textContent = `${remainingCards} cards were still remaining. Better luck next time!\nYour longest streak was ${this.longestStreak}`;
            }
        }
        
        this.elements.gameOver.style.display = 'flex';
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
        this.sneakPeakUsed = false; // Reset Check Stacks power-up
        this.peekNextUsed = false; // Reset Sneak Peak power-up
        this.firstCardPlaced = false; // Reset first card placed flag
        this.jokersDrawn = 0; // Reset jokers drawn counter
        this.stackToBurn = null; // Reset stack to burn
        this.currentStreak = 0; // Reset streak counter
        this.longestStreak = 0; // Reset longest streak counter
        
        // Track power-ups reset for new game
        AnalyticsService.track('power_ups_reset', {
            event_category: 'gameplay',
            event_label: 'new_game_started',
            value: 2
        });
        this.tempXOffset = null; // Reset temporary offset
        this.tempYOffset = null; // Reset temporary offset
        
        // Hide game over screen
        if (this.elements.gameOver) {
            this.elements.gameOver.style.display = 'none';
        } else {
            console.error('Game over div not found');
        }
        
        // Clear any existing floating buttons
        const existingButtons = document.querySelectorAll('.floating-guess-buttons');
        existingButtons.forEach(button => button.remove());
        
        // Initialize new game
        this.initializeGame();
        
        // Reset Check Stacks button
        if (this.elements.sneakPeakBtn) {
            this.elements.sneakPeakBtn.disabled = true; // Start disabled until first card is placed
            this.elements.sneakPeakBtn.textContent = 'Check Stacks';
            this.elements.sneakPeakBtn.classList.remove('active');
        }
        
        // Reset Sneak Peak button
        if (this.elements.peekNextBtn) {
            this.elements.peekNextBtn.disabled = true; // Start disabled until first card is placed
            this.elements.peekNextBtn.textContent = 'Sneak Peak';
            this.elements.peekNextBtn.classList.remove('active');
        }
        
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