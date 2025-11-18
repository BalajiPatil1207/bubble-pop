let numberElement = document.querySelector(".number");
let timeElement = document.querySelector(".timer");
let scoreElement = document.querySelector(".score");
let boardElement = document.querySelector(".board-section");
let startBtn = document.querySelector(".start-btn");

// Assuming you have these sound files in your project directory:
let popSound = new Audio("pop-402324.mp3");
let wrongSound = new Audio("wrongnumber.mp3");
let bgMusic = new Audio("gameSong.mp3");
let gameOverSound = new Audio("game-over.mp3");

let score = 0;
let time = 60;
let currentHit;
let timerInterval;

let noClickTimer;
let NO_CLICK_LIMIT = 3000;

let highlightInterval; 
let particleContainer; // Will be initialized in startGame

startBtn.addEventListener("click", startGame);

function startGame() {
    bgMusic.play();
    score = 0;
    time = 60;

    scoreElement.textContent = "Score : 0";
    timeElement.textContent = "Time : 60";

    startBtn.style.display = "none";
    boardElement.innerHTML = "";

    // Initialize and append the particle container
    particleContainer = document.createElement("div");
    particleContainer.classList.add("particle-container");
    boardElement.appendChild(particleContainer);

    newHitNumber();
    generateBubbles();
    startTimer();
    resetNoClickTimer();
}

function newHitNumber() {
    currentHit = Math.floor(Math.random() * 10);
    numberElement.textContent = "Hit Number : " + currentHit;
}

function resetNoClickTimer() {
    clearTimeout(noClickTimer);
    noClickTimer = setTimeout(() => {
        highlightCorrectBubble();
    }, NO_CLICK_LIMIT);
}

function highlightCorrectBubble() {
    clearInterval(highlightInterval);

    highlightInterval = setInterval(() => {
        let bubbles = document.querySelectorAll(".bubbles");

        bubbles.forEach((bubble) => {
            if (Number(bubble.textContent) === currentHit) {
                bubble.style.boxShadow = "0 0 20px 6px yellow";
                bubble.style.transform = "scale(1.3)";

                setTimeout(() => {
                    // Reset to normal state
                    bubble.style.boxShadow = "";
                    bubble.style.transform = ""; 
                }, 800);
            }
        });
    }, 3000);
}

// MODIFIED randomColor to use gradients
function randomColor() {
    let gradients = [
        "linear-gradient(135deg, #ff6b6b, #ee5253)", // Red
        "linear-gradient(135deg, #ff9f43, #ffc048)", // Orange
        "linear-gradient(135deg, #feca57, #ffeaa7)", // Yellow
        "linear-gradient(135deg, #1dd1a1, #10ac84)", // Green
        "linear-gradient(135deg, #54a0ff, #2e86de)", // Blue
        "linear-gradient(135deg, #5f27cd, #341f97)", // Indigo
        "linear-gradient(135deg, #c56cf0, #a55eea)", // Violet
        "linear-gradient(135deg, #8395a7, #57606f)" // Grey
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

function generateBubbles() {
    // Retain the particle container when clearing and regenerating bubbles
    let existingParticleContainer = boardElement.querySelector(".particle-container");
    boardElement.innerHTML = "";
    if (existingParticleContainer) {
        boardElement.appendChild(existingParticleContainer);
    } 

    clearInterval(highlightInterval);

    for (let i = 0; i < 84; i++) {
        let bubble = document.createElement("div");
        bubble.classList.add("bubbles");

        bubble.textContent = Math.floor(Math.random() * 10);
        bubble.style.background = randomColor();
        
        // Randomize animation delay and duration for a more natural float
        bubble.style.animationDelay = `-${Math.random() * 3}s`;
        bubble.style.animationDuration = `${3 + Math.random() * 2}s`; // 3s to 5s

        // Note: The click listener is now mainly handled by the boardElement listener below
        // This simple listener remains for smooth visual pop/remove effect
        bubble.addEventListener("click", (event) => {
            // Stop propagation to prevent accidental double-handling if needed, but not required here
        });

        boardElement.appendChild(bubble);
    }

    resetNoClickTimer();
}

function startTimer() {
    timerInterval = setInterval(() => {
        time--;
        timeElement.textContent = "Time : " + time;

        if (time <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

// NEW: Function to create explosion particles on hit
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");
        // Use the background property (which holds the gradient string)
        particle.style.background = color; 
        
        // Calculate position relative to the board-section
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const angle = Math.random() * 360;
        const velocity = Math.random() * 15 + 5;
        
        // Calculate displacement vectors for the CSS animation
        const deltaX = velocity * Math.cos(angle * Math.PI / 180);
        const deltaY = velocity * Math.sin(angle * Math.PI / 180);
        
        particle.style.setProperty('--dx', `${deltaX}px`);
        particle.style.setProperty('--dy', `${deltaY}px`);

        if (particleContainer) {
            particleContainer.appendChild(particle);
        }

        // Remove the particle after the animation ends
        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    }
}


boardElement.addEventListener("click", (event) => {
    // 1. Check if the clicked element is a bubble
    const clickedBubble = event.target.closest(".bubbles");
    if (!clickedBubble) return;

    // 2. Cleanup and reset timers
    clearInterval(highlightInterval);
    resetNoClickTimer();

    let clickedNumber = Number(clickedBubble.textContent);

    // 3. Get position for particle effect BEFORE removing the bubble
    let rect = clickedBubble.getBoundingClientRect();
    let boardRect = boardElement.getBoundingClientRect();
    // Calculate coordinates relative to the board-section
    let x = rect.left + rect.width / 2 - boardRect.left;
    let y = rect.top + rect.height / 2 - boardRect.top;
    let color = clickedBubble.style.background;
    
    // 4. Handle score update and sound
    if (clickedNumber === currentHit) {
        popSound.play();
        score += 10;
        createParticles(x, y, color); // Trigger particle effect
    } else {
        wrongSound.play();
        score -= 5;
    }
    
    // 5. Visually remove the bubble
    clickedBubble.style.transform = "scale(1.3)";
    clickedBubble.style.opacity = "0";
    setTimeout(() => clickedBubble.remove(), 200);

    // 6. Update game state
    scoreElement.textContent = "Score : " + score;
    // Delay bubble regeneration slightly to let the visual effect finish
    setTimeout(() => {
        generateBubbles();
        newHitNumber();
    }, 250); 
});

function endGame() {
    bgMusic.pause();
    gameOverSound.play();
    bgMusic.currentTime = 0;

    clearInterval(timerInterval);
    clearInterval(highlightInterval);
    clearTimeout(noClickTimer);

    boardElement.innerHTML = `
        <div class="end">
            <h1 class="game-over-title">Game Over</h1>
            <h2 class="final-score">Final Score : ${score}</h2>
            <div class="game-controls">
                <button class="restart-btn">RESTART </button>
                <button class="exit-btn">EXIT</button>
            </div>
        </div>`;

    startBtn.style.display = "block";

    const restartBtn = boardElement.querySelector(".restart-btn");
    const exitBtn = boardElement.querySelector(".exit-btn");

    restartBtn.addEventListener('click', () => {
       
        startBtn.style.display = "none"; 
        startGame();
    });

    exitBtn.addEventListener('click', () => {
        boardElement.innerHTML = '';
        boardElement.appendChild(startBtn);
        startBtn.style.display = "block";
    });
}