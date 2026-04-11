// Configuration & State
const CONFIG = {
    GAME_DURATION: 60,
    BUBBLE_SIZE: 65,
    SCORE_HIT: 10,
    SCORE_MISS: -5,
    MIN_BUBBLES: 12,
    AUTO_HINT_TIME: 3500,
    COMBO_TIMEOUT: 2000,
    LEVEL_SPEED_INCREASE: 1.15
};

let gameState = {
    score: 0,
    time: CONFIG.GAME_DURATION,
    currentHit: 0,
    level: 1,
    highScore: parseInt(localStorage.getItem('bubblePop_highScore')) || 0,
    isPlaying: false,
    isPaused: false,
    isMuted: localStorage.getItem('bubblePop_muted') === 'true',
    isMarathi: localStorage.getItem('bubblePop_lang') === 'mr',
    combo: 1,
    maxCombo: 1,
    hits: 0,
    misses: 0,
    timerInterval: null,
    hintTimeout: null,
    comboTimeout: null,
    isFrozen: false
};

const i18n = {
    en: {
        hit: "HIT",
        time: "TIME",
        score: "SCORE",
        combo: "COMBO",
        best: "Best",
        play: "Play Now",
        resume: "Resume",
        paused: "Game Paused",
        over: "Game Over",
        final: "FINAL SCORE",
        accuracy: "ACCURACY",
        maxCombo: "MAX COMBO",
        menu: "Menu",
        again: "Play Again",
        desc: "Hit the matching numbers to score combos!"
    },
    mr: {
        hit: "हिट",
        time: "वेळ",
        score: "गुण",
        combo: "कॉम्बो",
        best: "सर्वोत्तम",
        play: "खेळ सुरू करा",
        resume: "पुन्हा सुरू करा",
        paused: "खेळ थांबवला",
        over: "खेळ समाप्त",
        final: "एकूण गुण",
        accuracy: "अचूकता",
        maxCombo: "कमाल कॉम्बो",
        menu: "मेनू",
        again: "पुन्हा खेळा",
        desc: "कॉम्बो मिळवण्यासाठी जुळणारे नंबर दाबा!"
    }
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
    langBtn: document.getElementById('langBtn'),
    langCode: document.getElementById('langCode'),
    resumeBtn: document.getElementById('resumeBtn'),
    vfxBg: document.getElementById('vfxBg'),
    sounds: {
        pop: document.getElementById('popSound'),
        wrong: document.getElementById('wrongSound'),
        bg: document.getElementById('bgMusic'),
        gameOver: document.getElementById('gameOverSound')
    }
};

// Scroll dragging logic
let isDown = false;
let startX;
let scrollLeft;

function init() {
    elements.highScoreVal.textContent = gameState.highScore;
    elements.startBtn.addEventListener('click', startGame);
    elements.pauseBtn.addEventListener('click', togglePause);
    elements.resumeBtn.addEventListener('click', togglePause);
    elements.soundBtn.addEventListener('click', toggleMute);
    elements.langBtn.addEventListener('click', toggleLanguage);

    initVFX();
    updateI18n();
    updateMuteUI();

    if (elements.gameBoard) {
        elements.gameBoard.addEventListener('pointerdown', (e) => {
            // Only start drag if not clicking a bubble
            if (e.target.closest('.bubble')) return;
            
            isDown = true;
            elements.gameBoard.classList.add('active');
            startX = e.pageX - elements.gameBoard.offsetLeft;
            scrollLeft = elements.gameBoard.scrollLeft;
            elements.gameBoard.style.cursor = 'grabbing';
        });

        window.addEventListener('pointerup', () => {
            if (isDown) {
                isDown = false;
                elements.gameBoard.classList.remove('active');
                elements.gameBoard.style.cursor = 'grab';
            }
        });

        elements.gameBoard.addEventListener('pointermove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - elements.gameBoard.offsetLeft;
            const walk = (x - startX) * 2.5; 
            elements.gameBoard.scrollLeft = scrollLeft - walk;
        });

        elements.gameBoard.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                elements.gameBoard.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    window.addEventListener('resize', () => {
        if (gameState.isPlaying && !gameState.isPaused) generateBubbles(true);
    });
}

function initVFX() {
    for (let i = 0; i < 15; i++) {
        const bokeh = document.createElement('div');
        bokeh.className = 'bokeh';
        const size = 50 + Math.random() * 200;
        bokeh.style.width = `${size}px`;
        bokeh.style.height = `${size}px`;
        bokeh.style.left = `${Math.random() * 100}%`;
        bokeh.style.top = `${Math.random() * 100}%`;
        bokeh.style.background = `rgba(${Math.random() * 255}, ${Math.random() * 255}, 255, 0.4)`;
        bokeh.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
        bokeh.style.setProperty('--ty', `${(Math.random() - 0.5) * 200}px`);
        bokeh.style.animationDuration = `${10 + Math.random() * 20}s`;
        elements.vfxBg.appendChild(bokeh);
    }
}

function updateI18n() {
    const lang = gameState.isMarathi ? 'mr' : 'en';
    elements.langCode.textContent = lang.toUpperCase();
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });

    // Update specific elements that might not have the attribute
    elements.startBtn.textContent = i18n[lang].play;
    elements.resumeBtn.textContent = i18n[lang].resume;
    elements.startScreen.querySelector('h1').textContent = "Bubble Pop Pro";
    elements.startScreen.querySelector('p').textContent = i18n[lang].desc;
    elements.pauseScreen.querySelector('h2').textContent = i18n[lang].paused;
}

function toggleLanguage() {
    gameState.isMarathi = !gameState.isMarathi;
    localStorage.setItem('bubblePop_lang', gameState.isMarathi ? 'mr' : 'en');
    updateI18n();
}

function updateIcon(element, iconName) {
    if (!element) return;
    element.innerHTML = `<i data-lucide="${iconName}"></i>`;
    lucide.createIcons();
}

function togglePause() {
    if (!gameState.isPlaying) return;
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        clearInterval(gameState.timerInterval);
        clearTimeout(gameState.hintTimeout);
        elements.pauseScreen.style.display = 'flex';
        updateIcon(elements.pauseBtn, 'play');
        elements.sounds.bg.pause();
    } else {
        elements.pauseScreen.style.display = 'none';
        updateIcon(elements.pauseBtn, 'pause');
        if (!gameState.isMuted) elements.sounds.bg.play().catch(() => {});
        startTimer();
        resetHint();
    }
}

function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    localStorage.setItem('bubblePop_muted', gameState.isMuted);
    updateMuteUI();
    if (gameState.isPlaying && !gameState.isPaused) {
        if (gameState.isMuted) elements.sounds.bg.pause();
        else elements.sounds.bg.play().catch(() => {});
    }
}

function updateMuteUI() {
    const iconName = gameState.isMuted ? 'volume-x' : 'volume-2';
    updateIcon(elements.soundBtn, iconName);
    Object.values(elements.sounds).forEach(s => { if (s) s.muted = gameState.isMuted; });
}

function startGame() {
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.time = CONFIG.GAME_DURATION;
    gameState.combo = 1;
    gameState.level = 1;
    gameState.maxCombo = 1;
    gameState.hits = 0;
    gameState.misses = 0;
    gameState.isFrozen = false;
    
    elements.scoreVal.textContent = gameState.score;
    elements.timerVal.textContent = gameState.time;
    elements.comboVal.textContent = 'x1';
    elements.startScreen.style.display = 'none';
    elements.pauseBtn.style.display = 'flex';
    
    updateIcon(elements.pauseBtn, 'pause');
    
    if (!gameState.isMuted) {
        elements.sounds.bg.currentTime = 0;
        elements.sounds.bg.playbackRate = 1;
        elements.sounds.bg.play().catch(() => {});
    }

    newHit();
    generateBubbles();
    startTimer();
}

function newHit() {
    gameState.currentHit = Math.floor(Math.random() * 10);
    elements.hitDisplay.textContent = gameState.currentHit;
    
    // Level Up check every 100 points
    const newLevel = Math.floor(gameState.score / 100) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        showComboPop(window.innerWidth/2, window.innerHeight/2, `LEVEL ${gameState.level}`);
    }
    resetHint();
}

function startTimer() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        if (gameState.isFrozen) return;

        gameState.time--;
        elements.timerVal.textContent = gameState.time;

        // Panic mode music speed-up
        if (gameState.time <= 10 && gameState.time > 0 && !gameState.isMuted) {
            elements.sounds.bg.playbackRate = 1.35;
            elements.timerVal.style.color = '#ff4757';
            elements.timerVal.style.animation = 'pulse-gold 0.5s infinite';
        } else {
            elements.sounds.bg.playbackRate = 1;
            elements.timerVal.style.color = '';
            elements.timerVal.style.animation = '';
        }
        
        if (gameState.time <= 0) endGame();
    }, 1000);
}

function generateBubbles(isResize = false) {
    if (!elements.gameBoard) return;
    const currentScroll = elements.gameBoard.scrollLeft;
    const itemsToRemove = elements.gameBoard.querySelectorAll('.bubble, .end-screen, .bubble-wrapper');
    itemsToRemove.forEach(item => item.remove());

    const boardWidth = elements.gameBoard.clientWidth || window.innerWidth;
    const virtualWidth = boardWidth * (window.innerWidth < 600 ? 6 : 5); 
    const boardHeight = elements.gameBoard.clientHeight || 400;
    const bubbleArea = Math.pow(CONFIG.BUBBLE_SIZE + 15, 2); 
    const boardArea = virtualWidth * boardHeight;
    let bubbleCount = Math.floor(boardArea / bubbleArea);
    bubbleCount = Math.clamp(bubbleCount, 50, 500); 

    const colors = [
        'linear-gradient(135deg, #ff6b6b, #ee5253)',
        'linear-gradient(135deg, #ff9f43, #ffc048)',
        'linear-gradient(135deg, #feca57, #ffeaa7)',
        'linear-gradient(135deg, #1dd1a1, #10ac84)',
        'linear-gradient(135deg, #54a0ff, #2e86de)',
        'linear-gradient(135deg, #5f27cd, #341f97)',
        'linear-gradient(135deg, #c56cf0, #a55eea)'
    ];

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'bubble-wrapper';
    bubbleWrapper.style.display = 'flex';
    bubbleWrapper.style.flexDirection = 'column'; // Vertical then wrap horizontally
    bubbleWrapper.style.flexWrap = 'wrap';
    bubbleWrapper.style.alignContent = 'flex-start'; // Packs columns together tightly
    bubbleWrapper.style.height = '100%';
    bubbleWrapper.style.width = 'fit-content';
    bubbleWrapper.style.gap = window.innerWidth < 600 ? '0.6rem' : '1rem';
    bubbleWrapper.style.padding = '1rem 2rem';

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const num = Math.floor(Math.random() * 10);
        bubble.textContent = num;

        // Randomly spawn special bubbles
        const rand = Math.random();
        if (rand < 0.03) {
            bubble.classList.add('gold');
            bubble.dataset.type = 'gold';
        } else if (rand < 0.06) {
            bubble.classList.add('ice');
            bubble.dataset.type = 'ice';
        } else if (rand < 0.08) {
            bubble.classList.add('rainbow');
            bubble.dataset.type = 'rainbow';
        }
        
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];
        bubble.addEventListener('click', (e) => handleBubbleClick(num, e));
        bubbleWrapper.appendChild(bubble);
    }
    
    elements.gameBoard.appendChild(bubbleWrapper);
    if (!isResize) elements.gameBoard.scrollLeft = currentScroll;
}

Math.clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function handleBubbleClick(num, event) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const target = event.target;
    const type = target.dataset.type;
    const rect = target.getBoundingClientRect();
    const boardRect = elements.gameBoard.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - boardRect.left;
    const y = rect.top + rect.height / 2 - boardRect.top;
    const color = window.getComputedStyle(target).backgroundImage;

    if (num === gameState.currentHit || type === 'rainbow') {
        // Success
        gameState.hits++;
        let points = (CONFIG.SCORE_HIT * gameState.combo);
        
        if (type === 'gold') {
            points *= 5;
            showComboPop(x, y, "JACKPOT!");
        } else if (type === 'ice') {
            gameState.isFrozen = true;
            elements.gameBoard.style.boxShadow = 'inset 0 0 50px #00d2ff';
            showComboPop(x, y, "FROZEN!");
            setTimeout(() => {
                gameState.isFrozen = false;
                elements.gameBoard.style.boxShadow = '';
            }, 5000);
        } else if (type === 'rainbow') {
            points = 50;
            showComboPop(x, y, "WILD CARD!");
        }

        gameState.score += points;
        if (gameState.combo > 1) showComboPop(x, y, `x${gameState.combo}`);
        
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
        
        playSound('pop');
        createParticles(x, y, color);
        checkHighScore();
        newHit();
        generateBubbles();
        
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
        
        // Screen Shake
        elements.gameBoard.style.animation = 'shake 0.4s';
        setTimeout(() => elements.gameBoard.style.animation = '', 400);

        target.style.animation = 'shake 0.3s';
    }
    
    elements.scoreVal.textContent = gameState.score;
    elements.comboVal.textContent = `x${gameState.combo}`;
}

function playSound(type) {
    if (gameState.isMuted) return;
    const sound = elements.sounds[type];
    if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.background = color;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 100;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        elements.gameBoard.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
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
                setTimeout(() => { b.style.boxShadow = ''; b.style.transform = ''; }, 1000);
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

    const accuracy = gameState.hits + gameState.misses > 0 
        ? Math.round((gameState.hits / (gameState.hits + gameState.misses)) * 100) : 0;
    const lang = gameState.isMarathi ? 'mr' : 'en';

    const endScreen = document.createElement('div');
    endScreen.className = 'end-screen';
    endScreen.innerHTML = `
        <div class="end-card">
            <h2>${i18n[lang].over}</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <label>${i18n[lang].final}</label>
                    <value>${gameState.score}</value>
                </div>
                <div class="stat-item">
                    <label>${i18n[lang].best.toUpperCase()}</label>
                    <value>${gameState.highScore}</value>
                </div>
                <div class="stat-item">
                    <label>${i18n[lang].accuracy}</label>
                    <value>${accuracy}%</value>
                </div>
                <div class="stat-item">
                    <label>${i18n[lang].maxCombo}</label>
                    <value>x${gameState.maxCombo}</value>
                </div>
            </div>
            <div class="btn-group">
                <button class="btn" onclick="location.reload()">${i18n[lang].menu}</button>
                <button class="btn" id="restartBtn">${i18n[lang].again}</button>
            </div>
        </div>
    `;
    elements.gameBoard.innerHTML = '';
    elements.gameBoard.appendChild(endScreen);
    document.getElementById('restartBtn').onclick = () => { endGame(); startGame(); };
}

init();
// Start
init();
