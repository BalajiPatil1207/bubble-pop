// Configuration & State
const CONFIG = {
    GAME_DURATION: 60,
    BUBBLE_SIZE: 65,
    SCORE_HIT: 10,
    SCORE_MISS: -5,
    MIN_BUBBLES: 12,
    AUTO_HINT_TIME: 3500,
    COMBO_TIMEOUT: 2000 // Reset combo if no hit for 2s
};

let gameState = {
    score: 0,
    time: CONFIG.GAME_DURATION,
    currentHit: 0,
    highScore: parseInt(localStorage.getItem('bubblePop_highScore')) || 0,
    isPlaying: false,
    isPaused: false,
    isMuted: localStorage.getItem('bubblePop_muted') === 'true',
    combo: 1,
    maxCombo: 1,
    hits: 0,
    misses: 0,
    timerInterval: null,
    hintTimeout: null,
    comboTimeout: null
};

// DOM Elements
const elements = {
    hitDisplay: document.getElementById('hitNum'),
    timerVal: document.getElementById('timerVal'),
    scoreVal: document.getElementById('scoreVal'),
    comboVal: document.getElementById('comboVal'),
    highScoreVal: document.getElementById('bestScore'),
    gameBoard: document.getElementById('gameBoard'),
    startScreen: document.getElementById('startScreen'),
    pauseScreen: document.getElementById('pauseScreen'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    soundBtn: document.getElementById('soundBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    statusSpans: {
        score: document.getElementById('scoreVal'),
        timer: document.getElementById('timerVal'),
        hit: document.getElementById('hitNum')
    },
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
    elements.pauseBtn.addEventListener('click', togglePause);
    elements.resumeBtn.addEventListener('click', togglePause);
    elements.soundBtn.addEventListener('click', toggleMute);

    updateMuteUI();
    
    window.addEventListener('resize', () => {
        if (gameState.isPlaying && !gameState.isPaused) generateBubbles();
    });
}

// Control Handlers
function togglePause() {
    if (!gameState.isPlaying) return;

    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        clearInterval(gameState.timerInterval);
        clearTimeout(gameState.hintTimeout);
        elements.pauseScreen.style.display = 'flex';
        elements.pauseBtn.querySelector('i').setAttribute('data-lucide', 'play');
        elements.sounds.bg.pause();
    } else {
        elements.pauseScreen.style.display = 'none';
        elements.pauseBtn.querySelector('i').setAttribute('data-lucide', 'pause');
        if (!gameState.isMuted) elements.sounds.bg.play();
        startTimer();
        resetHint();
    }
    lucide.createIcons();
}

function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    localStorage.setItem('bubblePop_muted', gameState.isMuted);
    updateMuteUI();
    
    // Explicitly handle bg music on manual toggle
    if (gameState.isPlaying && !gameState.isPaused) {
        if (gameState.isMuted) {
            elements.sounds.bg.pause();
        } else {
            elements.sounds.bg.play().catch(e => console.log('Audio blocked'));
        }
    }
}

function updateMuteUI() {
    const iconName = gameState.isMuted ? 'volume-x' : 'volume-2';
    // Replace the entire button content to ensure Lucide can re-render it
    elements.soundBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    lucide.createIcons();
    
    // Apply mute state to all audio elements
    Object.values(elements.sounds).forEach(s => {
        if (s) s.muted = gameState.isMuted;
    });
}

// Game Logic
function startGame() {
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.time = CONFIG.GAME_DURATION;
    gameState.combo = 1;
    gameState.maxCombo = 1;
    gameState.hits = 0;
    gameState.misses = 0;
    
    elements.scoreVal.textContent = gameState.score;
    elements.timerVal.textContent = gameState.time;
    elements.comboVal.textContent = 'x1';
    elements.startScreen.style.display = 'none';
    elements.pauseBtn.style.display = 'flex';
    elements.pauseBtn.querySelector('i').setAttribute('data-lucide', 'pause');
    lucide.createIcons();
    
    if (!gameState.isMuted) {
        elements.sounds.bg.currentTime = 0;
        elements.sounds.bg.play().catch(e => console.log('Autoplay check'));
    }

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
    const itemsToRemove = elements.gameBoard.querySelectorAll('.bubble, .end-screen');
    itemsToRemove.forEach(item => item.remove());

    const boardWidth = elements.gameBoard.clientWidth;
    const boardHeight = elements.gameBoard.clientHeight;
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
    if (!gameState.isPlaying || gameState.isPaused) return;

    const rect = event.target.getBoundingClientRect();
    const boardRect = elements.gameBoard.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - boardRect.left;
    const y = rect.top + rect.height / 2 - boardRect.top;
    const color = window.getComputedStyle(event.target).backgroundImage;

    if (num === gameState.currentHit) {
        // Success
        gameState.hits++;
        const points = CONFIG.SCORE_HIT * gameState.combo;
        gameState.score += points;
        
        if (gameState.combo > 1) {
            showComboPop(x, y, `x${gameState.combo}`);
        }
        
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
        
        playSound('pop');
        createParticles(x, y, color);
        
        checkHighScore();
        newHit();
        generateBubbles();
        
        // Reset combo timeout
        clearTimeout(gameState.comboTimeout);
        gameState.comboTimeout = setTimeout(() => {
            gameState.combo = 1;
            elements.comboVal.textContent = 'x1';
        }, CONFIG.COMBO_TIMEOUT);

    } else {
        // Fail
        gameState.misses++;
        gameState.combo = 1;
        gameState.score = Math.max(0, gameState.score + CONFIG.SCORE_MISS);
        playSound('wrong');
        
        event.target.style.animation = 'none';
        void event.target.offsetWidth; // Trigger reflow
        event.target.style.animation = 'shake 0.3s';
    }
    
    elements.scoreVal.textContent = gameState.score;
    elements.comboVal.textContent = `x${gameState.combo}`;
}

function playSound(type) {
    if (gameState.isMuted) return;
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

function showComboPop(x, y, text) {
    const pop = document.createElement('div');
    pop.className = 'combo-pop';
    pop.textContent = text;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 40}px`;
    elements.gameBoard.appendChild(pop);
    pop.addEventListener('animationend', () => pop.remove());
}

function checkHighScore() {
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('bubblePop_highScore', gameState.highScore);
    }
}

function resetHint() {
    clearTimeout(gameState.hintTimeout);
    gameState.hintTimeout = setTimeout(() => {
        if (!gameState.isPlaying || gameState.isPaused) return;
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
    clearTimeout(gameState.comboTimeout);
    elements.sounds.bg.pause();
    playSound('gameOver');

    elements.pauseBtn.style.display = 'none';

    // Remove bubbles
    const bubbles = elements.gameBoard.querySelectorAll('.bubble');
    bubbles.forEach(b => b.remove());

    const accuracy = gameState.hits + gameState.misses > 0 
        ? Math.round((gameState.hits / (gameState.hits + gameState.misses)) * 100) 
        : 0;

    // Show end screen with stats
    const endScreen = document.createElement('div');
    endScreen.className = 'end-screen';
    endScreen.innerHTML = `
        <div class="end-card">
            <h2>Game Over</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <label>FINAL SCORE</label>
                    <value>${gameState.score}</value>
                </div>
                <div class="stat-item">
                    <label>BEST SCORE</label>
                    <value>${gameState.highScore}</value>
                </div>
                <div class="stat-item">
                    <label>ACCURACY</label>
                    <value>${accuracy}%</value>
                </div>
                <div class="stat-item">
                    <label>MAX COMBO</label>
                    <value>x${gameState.maxCombo}</value>
                </div>
            </div>
            <div class="btn-group">
                <button class="btn" onclick="location.reload()">Menu</button>
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
