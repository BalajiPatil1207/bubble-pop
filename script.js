// Configuration & State
const CONFIG = {
    GAME_DURATION: 60,
    BUBBLE_SIZE: 65, // Standard size on desktop
    SCORE_HIT: 10,
    SCORE_MISS: -5,
    MIN_BUBBLES: 12, // For small screens
    AUTO_HINT_TIME: 3000
};

let gameState = {
    score: 0,
    time: CONFIG.GAME_DURATION,
    currentHit: 0,
    highScore: parseInt(localStorage.getItem('bubblePop_highScore')) || 0,
    isPlaying: false,
    timerInterval: null,
    hintTimeout: null
};

// DOM Elements
const elements = {
    hitDisplay: document.getElementById('hitNum'),
    timerVal: document.getElementById('timerVal'),
    scoreVal: document.getElementById('scoreVal'),
    highScoreVal: document.getElementById('highScoreVal'),
    gameBoard: document.getElementById('gameBoard'),
    startScreen: document.getElementById('startScreen'),
    startBtn: document.getElementById('startBtn'),
    sounds: {
        pop: document.getElementById('popSound'),
        wrong: document.getElementById('wrongSound'),
        bg: document.getElementById('bgMusic'),
        gameOver: document.getElementById('gameOverSound')
    }
};

// Initialize
function init() {
    elements.highScoreVal.textContent = gameState.highScore;
    elements.startBtn.addEventListener('click', startGame);
    window.addEventListener('resize', () => {
        if (gameState.isPlaying) generateBubbles();
    });
}

// Game Logic
function startGame() {
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.time = CONFIG.GAME_DURATION;
    
    elements.scoreVal.textContent = gameState.score;
    elements.timerVal.textContent = gameState.time;
    elements.startScreen.style.display = 'none';
    
    // Play BG music
    elements.sounds.bg.currentTime = 0;
    elements.sounds.bg.play().catch(e => console.log('Audio autoplay blocked'));

    newHit();
    generateBubbles();
    startTimer();
}

function newHit() {
    gameState.currentHit = Math.floor(Math.random() * 10);
    elements.hitDisplay.textContent = gameState.currentHit;
    resetHint();
}

function startTimer() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.time--;
        elements.timerVal.textContent = gameState.time;
        
        if (gameState.time <= 0) {
            endGame();
        }
    }, 1000);
}

function generateBubbles() {
    // Clear board but keep start/end screens if they exist
    const itemsToRemove = elements.gameBoard.querySelectorAll('.bubble, .end-screen');
    itemsToRemove.forEach(item => item.remove());

    // Calculate how many bubbles fit
    const boardWidth = elements.gameBoard.clientWidth;
    const boardHeight = elements.gameBoard.clientHeight;
    
    // Bubble padding + size (approx)
    const bubbleArea = Math.pow(CONFIG.BUBBLE_SIZE + 10, 2); 
    const boardArea = boardWidth * boardHeight;
    
    let bubbleCount = Math.floor(boardArea / bubbleArea);
    bubbleCount = Math.max(CONFIG.MIN_BUBBLES, Math.min(bubbleCount, 84));

    const fragment = document.createDocumentFragment();
    const colors = [
        'linear-gradient(135deg, #ff6b6b, #ee5253)',
        'linear-gradient(135deg, #ff9f43, #ffc048)',
        'linear-gradient(135deg, #feca57, #ffeaa7)',
        'linear-gradient(135deg, #1dd1a1, #10ac84)',
        'linear-gradient(135deg, #54a0ff, #2e86de)',
        'linear-gradient(135deg, #5f27cd, #341f97)',
        'linear-gradient(135deg, #c56cf0, #a55eea)'
    ];

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const num = Math.floor(Math.random() * 10);
        bubble.textContent = num;
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        bubble.addEventListener('click', (e) => handleBubbleClick(num, e));
        fragment.appendChild(bubble);
    }
    
    elements.gameBoard.appendChild(fragment);
}

function handleBubbleClick(num, event) {
    if (!gameState.isPlaying) return;

    const rect = event.target.getBoundingClientRect();
    const boardRect = elements.gameBoard.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - boardRect.left;
    const y = rect.top + rect.height / 2 - boardRect.top;
    const color = window.getComputedStyle(event.target).backgroundImage;

    if (num === gameState.currentHit) {
        // Success
        gameState.score += CONFIG.SCORE_HIT;
        playSound('pop');
        createParticles(x, y, color);
        
        // Ripple effect on board (optional)
        
        checkHighScore();
        newHit();
        generateBubbles();
    } else {
        // Fail
        gameState.score = Math.max(0, gameState.score + CONFIG.SCORE_MISS);
        playSound('wrong');
        // Shake animation could be added here
        event.target.style.animation = 'none';
        setTimeout(() => event.target.style.animation = 'shake 0.3s', 10);
    }
    
    elements.scoreVal.textContent = gameState.score;
}

function playSound(type) {
    const sound = elements.sounds[type];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function createParticles(x, y, color) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.background = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);

        elements.gameBoard.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
    }
}

function checkHighScore() {
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        elements.highScoreVal.textContent = gameState.highScore;
        localStorage.setItem('bubblePop_highScore', gameState.highScore);
    }
}

function resetHint() {
    clearTimeout(gameState.hintTimeout);
    gameState.hintTimeout = setTimeout(() => {
        const bubbles = elements.gameBoard.querySelectorAll('.bubble');
        bubbles.forEach(b => {
            if (parseInt(b.textContent) === gameState.currentHit) {
                b.style.boxShadow = '0 0 30px 10px rgba(255, 255, 255, 0.8)';
                b.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    b.style.boxShadow = '';
                    b.style.transform = '';
                }, 1000);
            }
        });
    }, CONFIG.AUTO_HINT_TIME);
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);
    clearTimeout(gameState.hintTimeout);
    elements.sounds.bg.pause();
    playSound('gameOver');

    // Remove bubbles
    const bubbles = elements.gameBoard.querySelectorAll('.bubble');
    bubbles.forEach(b => b.remove());

    // Show end screen
    const endScreen = document.createElement('div');
    endScreen.className = 'end-screen';
    endScreen.innerHTML = `
        <div class="end-card">
            <h2>Game Over!</h2>
            <p>Score: <span>${gameState.score}</span></p>
            <div class="btn-group">
                <button class="btn" onclick="location.reload()">Home</button>
                <button class="btn" id="restartBtn">Play Again</button>
            </div>
        </div>
    `;
    elements.gameBoard.appendChild(endScreen);
    
    document.getElementById('restartBtn').onclick = () => {
        endScreen.remove();
        startGame();
    };
}

// Start
init();
