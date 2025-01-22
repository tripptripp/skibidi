document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // Handle registration form submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.email) {
                alert('Registration successful!');
                // Redirect or show login form
            } else {
                alert('Registration failed: ' + data.message);
            }
        })
        .catch(err => console.error(err));
    });

    // Handle login form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.email) {
                alert('Login successful!');
                // Show betting area after successful login
                document.getElementById('auth-area').style.display = 'none';
                document.getElementById('betting-area').style.display = 'block';
                initGame();
            } else {
                alert('Login failed: ' + data.message);
            }
        })
        .catch(err => console.error(err));
    });

    // Your existing game logic
    let deck, playerHands, dealerHand, balance = 25, currentWager = 0, dealerHidden = true, currentHandIndex = 0;
    const dealerArea = document.getElementById('dealer-area');
    const playerArea = document.getElementById('player-area');
    const resultDiv = document.getElementById('result');
    const splitBtn = document.getElementById('split-btn');

    function renderGame() {
        dealerArea.innerHTML = '';
        dealerHand.forEach((card, index) => {
            if (index === 1 && dealerHidden) {
                dealerArea.innerHTML += `<div class="card" data-value="??" data-suit="??">??</div>`;
            } else {
                dealerArea.innerHTML += `<div class="card" data-value="${card.value}" data-suit="${card.suit}">${card.value}${card.suit}</div>`;
            }
        });

        playerArea.innerHTML = '';

        playerHands.forEach((hand, handIndex) => {
            const handDiv = document.createElement('div');
            handDiv.className = 'player-hand';
            handDiv.innerHTML = `Hand ${handIndex + 1}: `;
            hand.forEach(card => {
                handDiv.innerHTML += `<div class="card" data-value="${card.value}" data-suit="${card.suit}">${card.value}${card.suit}</div>`;
            });
            const handTotal = calculateScore(hand);
            handDiv.innerHTML += `<div class="hand-total">Total: ${handTotal}</div>`; // Add hand total

            if (handIndex === currentHandIndex) {
                handDiv.classList.add('active-hand'); // Highlight active hand
            }
            playerArea.appendChild(handDiv);
        });

        document.getElementById('current-wager-display-amount').textContent = currentWager;
    }

    function resetHand() {
        document.getElementById('betting-area').style.display = 'block';
        document.getElementById('game-area').style.display = 'none';
        resultDiv.textContent = '';
    }

    function enableButtons(enabled) {
        document.getElementById('hit-btn').disabled = !enabled;
        document.getElementById('stand-btn').disabled = !enabled;
        document.getElementById('double-btn').disabled = !enabled;
        splitBtn.disabled = !enabled;
    }

    function resetWager() {
        currentWager = 0;
        document.getElementById('current-wager').textContent = currentWager;
    }

    function calculateScore(hand) {
        let score = 0;
        let aces = 0;
        for (let card of hand) {
            if (card.value === 'A') {
                aces++;
                score += 11;
            } else if (['K', 'Q', 'J', '10'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    function startGame() {
        deck = createDeck();
        playerHands = [[deck.pop(), deck.pop()]];
        dealerHand = [deck.pop(), deck.pop()];
        dealerHidden = true;
        currentHandIndex = 0;
        renderGame();
        resultDiv.textContent = '';
        enableButtons(true);
        checkForBlackjack();
        checkForSplit();
    }

    function createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ value, suit });
            }
        }
        return deck.sort(() => Math.random() - 0.5);
    }

    function hit() {
        playerHands[currentHandIndex].push(deck.pop());
        const playerScore = calculateScore(playerHands[currentHandIndex]);
        renderGame();

        if (playerScore > 21) {
            resultDiv.textContent += `Hand ${currentHandIndex + 1}: You bust! `;
            if (currentHandIndex < playerHands.length - 1) {
                currentHandIndex++;
                enableButtons(true);
            } else {
                dealerHidden = false;
                renderGame();
                finalizeGame(); // End the game immediately if the player busts
            }
        }
    }

    function stand() {
        if (currentHandIndex < playerHands.length - 1) {
            currentHandIndex++;
            enableButtons(true);
        } else {
            dealerHidden = false;
            renderGame();
            while (calculateScore(dealerHand) < 17) {
                dealerHand.push(deck.pop());
            }
            finalizeGame();
        }
    }

    function doubleDown() {
        if (currentWager > balance) {
            alert("You don't have enough balance to double down!");
            return;
        }
        balance -= currentWager;
        currentWager *= 2;
        updateBalance(-currentWager);

        playerHands[currentHandIndex].push(deck.pop());
        renderGame();

        if (calculateScore(playerHands[currentHandIndex]) > 21) {
            resultDiv.textContent += `Hand ${currentHandIndex + 1}: You bust! `;
            if (currentHandIndex < playerHands.length - 1) {
                currentHandIndex++;
                enableButtons(true);
            } else {
                dealerHidden = false;
                renderGame();
                finalizeGame(); // End the game immediately if the player busts
            }
        } else {
            stand();
        }
    }

    function split() {
        const firstCard = playerHands[currentHandIndex][0];
        const secondCard = playerHands[currentHandIndex][1];

        if (playerHands[currentHandIndex].length === 2 && (firstCard.value === secondCard.value || (['10', 'J', 'Q', 'K'].includes(firstCard.value) && ['10', 'J', 'Q', 'K'].includes(secondCard.value)))) {
            const firstHand = [firstCard, deck.pop()];
            const secondHand = [secondCard, deck.pop()];
            playerHands.splice(currentHandIndex, 1, firstHand, secondHand);

            // Adjust the balance for the additional wager
            if (currentWager <= balance) {
                balance -= currentWager;
                updateBalance(-currentWager);
                document.getElementById('balance').textContent = balance;
            } else {
                alert("You don't have enough balance to split!");
                return;
            }

            renderGame();
            checkForSplit();
        }
    }
    function finalizeGame() {
        const dealerScore = calculateScore(dealerHand);
        playerHands.forEach((hand, index) => {
            const playerScore = calculateScore(hand);
            if (playerScore > 21) {
                resultDiv.textContent += `Hand ${index + 1}: You bust. Dealer wins. `;
            } else if (dealerScore > 21 || playerScore > dealerScore) {
                balance += currentWager * 2;
                resultDiv.textContent += `Hand ${index + 1}: You win! `;
            } else if (playerScore < dealerScore) {
                resultDiv.textContent += `Hand ${index + 1}: Dealer wins. `;
            } else {
                balance += currentWager;
                resultDiv.textContent += `Hand ${index + 1}: It's a tie! `;
            }
        });

        dealerHidden = false;
        renderGame();
        enableButtons(false);
        document.getElementById('balance').textContent = balance;
        resetWager();
        setTimeout(() => {
            document.getElementById('betting-area').style.display = 'block';
            document.getElementById('game-area').style.display = 'none';
            resultDiv.textContent = '';
        }, 2500);
    }

    function updateBalance(amount) {
        fetch('/api/users/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('balance').textContent = data.balance;
        })
        .catch(err => console.error(err));
    }

    // Initialize game logic after login
    function initGame() {
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const chipValue = parseInt(chip.getAttribute('data-value'));
                if (currentWager + chipValue <= balance) {
                    currentWager += chipValue;
                    document.getElementById('current-wager').textContent = currentWager;
                } else {
                    alert("You don't have enough balance to place that bet!");
                }
            });
        });

        document.getElementById('deal-btn').addEventListener('click', () => {
            if (currentWager > 0) {
                balance -= currentWager;
                updateBalance(-currentWager);

                document.getElementById('betting-area').style.display = 'none';
                document.getElementById('game-area').style.display = 'block';

                document.getElementById('current-wager-display-amount').textContent = currentWager;

                startGame();
            } else {
                alert("You must place a wager before the game starts!");
            }
        });

        document.getElementById('hit-btn').addEventListener('click', hit);
        document.getElementById('stand-btn').addEventListener('click', stand);
        document.getElementById('double-btn').addEventListener('click', doubleDown);
        splitBtn.addEventListener('click', split);
    }

    function checkForBlackjack() {
        playerHands.forEach((hand, index) => {
            if (calculateScore(hand) === 21) {
                resultDiv.textContent += `Hand ${index + 1}: Blackjack! `;
                balance += currentWager * 2.5;
                updateBalance(currentWager * 1.5);
                dealerHidden = false;
                renderGame();
                enableButtons(false);
                resetWager();
                setTimeout(() => {
                    document.getElementById('betting-area').style.display = 'block';
                    document.getElementById('game-area').style.display = 'none';
                    resultDiv.textContent = '';
                }, 2500);
            }
        });
    }

    function checkForSplit() {
        if (playerHands.length > 1) {
            splitBtn.disabled = true;
        } else {
            const firstCard = playerHands[currentHandIndex][0];
            const secondCard = playerHands[currentHandIndex][1];

            if (firstCard.value === secondCard.value || (['10', 'J', 'Q', 'K'].includes(firstCard.value) && ['10', 'J', 'Q', 'K'].includes(secondCard.value))) {
                splitBtn.disabled = false;
            } else {
                splitBtn.disabled = true;
            }
        }
    }

    initGame();
});

