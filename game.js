// ===== КОНФІГУРАЦІЯ =====
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    GRAVITY: 0.8,
    JUMP_STRENGTH: -15,
    PLAYER_SPEED: 5,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 50,
    INVINCIBILITY_TIME: 2000, // мс
};

// ===== ГЛОБАЛЬНІ ЗМІННІ =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameState = 'menu'; // menu, playing, gameOver, win, settings
let currentLevel = 1;
let score = 0;
let lives = 3;
let player = null;
let level = null;
let keys = {};
let lastTime = 0;
let invincibilityTimer = 0;

// ===== КЛАС ГРАВЦЯ =====
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facing = 1; // 1 = right, -1 = left
        this.attacking = false;
        this.attackTimer = 0;
    }

    update() {
        // Рух
        this.velocityX = 0;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.velocityX = -CONFIG.PLAYER_SPEED;
            this.facing = -1;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.velocityX = CONFIG.PLAYER_SPEED;
            this.facing = 1;
        }

        // Стрибок
        if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && this.onGround) {
            this.velocityY = CONFIG.JUMP_STRENGTH;
            this.onGround = false;
        }

        // Атака
        if (keys['x'] || keys['X']) {
            if (!this.attacking) {
                this.attacking = true;
                this.attackTimer = 300; // 300ms атака
            }
        }

        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attacking = false;
            }
        }

        // Гравітація
        this.velocityY += CONFIG.GRAVITY;
        this.velocityY = Math.min(this.velocityY, 20); // Максимальна швидкість падіння

        // Оновлення позиції
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Межі екрану
        this.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - this.width, this.x));
    }

    draw() {
        ctx.save();
        
        // Тіло жаби (простий прямокутник з очима)
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Очі
        ctx.fillStyle = '#ff00ff';
        const eyeSize = 8;
        const eyeY = this.y + 10;
        ctx.fillRect(this.x + 8, eyeY, eyeSize, eyeSize);
        ctx.fillRect(this.x + 24, eyeY, eyeSize, eyeSize);
        
        // Атака (простий ефект)
        if (this.attacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            const attackX = this.facing === 1 ? this.x + this.width : this.x - 20;
            ctx.strokeRect(attackX, this.y + 10, 20, 30);
        }

        // Ефект невразливості
        if (invincibilityTimer > 0 && Math.floor(invincibilityTimer / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        ctx.restore();
    }

    getAttackBox() {
        if (!this.attacking) return null;
        const attackWidth = 20;
        const attackX = this.facing === 1 ? this.x + this.width : this.x - attackWidth;
        return {
            x: attackX,
            y: this.y + 10,
            width: attackWidth,
            height: 30
        };
    }

    takeDamage() {
        if (invincibilityTimer > 0) return false;
        lives--;
        invincibilityTimer = CONFIG.INVINCIBILITY_TIME;
        updateUI();
        if (lives <= 0) {
            gameState = 'gameOver';
            showScreen('gameOverScreen');
        }
        return true;
    }
}

// ===== КЛАС ВОРОГА =====
class Enemy {
    constructor(x, y, type = 'robo-rat') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'robo-rat' ? 30 : 25;
        this.height = type === 'robo-rat' ? 30 : 25;
        this.velocityX = type === 'robo-rat' ? -2 : 0;
        this.velocityY = 0;
        this.patrolStart = x;
        this.patrolEnd = x + (type === 'robo-rat' ? 200 : 0);
        this.patrolDirection = -1;
        this.onGround = false;
        this.health = 1;
        this.dead = false;
    }

    update() {
        if (this.dead) return;

        if (this.type === 'robo-rat') {
            // Патрулювання
            this.x += this.velocityX;
            if (this.x <= this.patrolStart || this.x >= this.patrolEnd) {
                this.velocityX *= -1;
            }
        } else if (this.type === 'drone-eye') {
            // Літає до гравця
            if (player) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    this.velocityX = (dx / distance) * 3;
                    this.velocityY = (dy / distance) * 3;
                }
            }
            this.x += this.velocityX;
            this.y += this.velocityY;
        }

        // Гравітація для robo-rat
        if (this.type === 'robo-rat') {
            this.velocityY += CONFIG.GRAVITY;
            this.velocityY = Math.min(this.velocityY, 20);
            this.y += this.velocityY;
        }
    }

    draw() {
        if (this.dead) return;

        ctx.save();
        
        if (this.type === 'robo-rat') {
            // Робот-щур
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x + 5, this.y + 5, 8, 8); // Очі
            ctx.fillRect(this.x + 17, this.y + 5, 8, 8);
        } else if (this.type === 'drone-eye') {
            // Дрон-око
            ctx.fillStyle = '#4444ff';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.dead = true;
            score += 50;
            updateUI();
        }
    }
}

// ===== КЛАС ПЛАТФОРМИ =====
class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // normal, trap, falling
        this.falling = false;
        this.fallSpeed = 0;
    }

    draw() {
        if (this.type === 'trap') {
            // Електрична пастка
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Ефект блимання
            if (Math.floor(Date.now() / 200) % 2) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
            }
        } else if (this.type === 'falling') {
            ctx.fillStyle = '#888888';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// ===== КЛАС ЕНЕРГІЇ =====
class Energy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
        this.animation = 0;
    }

    update() {
        this.animation += 0.1;
    }

    draw() {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.animation);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);
        ctx.restore();
    }
}

// ===== КЛАС РІВНЯ =====
class Level {
    constructor(levelNum) {
        this.levelNum = levelNum;
        this.platforms = [];
        this.enemies = [];
        this.energies = [];
        this.door = null;
        this.core = null;
        this.init();
    }

    init() {
        if (this.levelNum === 1) {
            this.initLevel1();
        } else if (this.levelNum === 2) {
            this.initLevel2();
        }
    }

    initLevel1() {
        // Платформи
        this.platforms = [
            new Platform(0, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(250, CONFIG.CANVAS_HEIGHT - 150, 150, 50),
            new Platform(450, CONFIG.CANVAS_HEIGHT - 250, 150, 50),
            new Platform(650, CONFIG.CANVAS_HEIGHT - 350, 150, 50),
            new Platform(850, CONFIG.CANVAS_HEIGHT - 250, 150, 50),
            new Platform(1050, CONFIG.CANVAS_HEIGHT - 150, 150, 50),
            new Platform(300, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(550, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(800, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(1050, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            // Пастки
            new Platform(500, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
            new Platform(750, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
        ];

        // Вороги
        this.enemies = [
            new Enemy(300, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(600, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(900, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
        ];

        // Енергія
        for (let i = 0; i < 10; i++) {
            const x = 100 + i * 100;
            const y = CONFIG.CANVAS_HEIGHT - 200 - (i % 3) * 100;
            this.energies.push(new Energy(x, y));
        }

        // Двері
        this.door = { x: 1150, y: CONFIG.CANVAS_HEIGHT - 200, width: 50, height: 100 };
    }

    initLevel2() {
        // Швидший рівень з ближчими платформами
        this.platforms = [
            new Platform(0, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            new Platform(200, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(350, CONFIG.CANVAS_HEIGHT - 190, 100, 50),
            new Platform(500, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(650, CONFIG.CANVAS_HEIGHT - 190, 100, 50),
            new Platform(800, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(950, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            new Platform(1100, CONFIG.CANVAS_HEIGHT - 50, 100, 50),
            // Падаючі блоки
            new Platform(400, 100, 80, 50, 'falling'),
            new Platform(700, 150, 80, 50, 'falling'),
        ];

        // Дрони
        this.enemies = [
            new Enemy(200, 200, 'drone-eye'),
            new Enemy(500, 300, 'drone-eye'),
            new Enemy(800, 250, 'drone-eye'),
        ];

        // Ядро
        this.core = { x: 1100, y: CONFIG.CANVAS_HEIGHT - 200, width: 80, height: 80 };
    }

    update() {
        // Оновлення ворогів
        this.enemies.forEach(enemy => enemy.update());

        // Оновлення енергії
        this.energies.forEach(energy => energy.update());

        // Падаючі блоки
        this.platforms.forEach(platform => {
            if (platform.type === 'falling' && !platform.falling) {
                // Перевірка чи гравець стоїть на блоці
                if (player && checkCollision(player, platform) && player.onGround && 
                    player.y < platform.y && player.velocityY >= 0) {
                    platform.falling = true;
                }
            }
            if (platform.falling) {
                platform.fallSpeed += CONFIG.GRAVITY;
                platform.y += platform.fallSpeed;
            }
        });
    }

    draw() {
        // Малювання платформ
        this.platforms.forEach(platform => platform.draw());

        // Малювання ворогів
        this.enemies.forEach(enemy => enemy.draw());

        // Малювання енергії
        this.energies.forEach(energy => energy.draw());

        // Двері
        if (this.door) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(this.door.x, this.door.y, this.door.width, this.door.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Courier New';
            ctx.fillText('→', this.door.x + 15, this.door.y + 60);
        }

        // Ядро
        if (this.core) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.core.x + this.core.width/2, this.core.y + this.core.height/2, 
                    this.core.width/2, 0, Math.PI * 2);
            ctx.fill();
            // Пульсація
            const pulse = Math.sin(Date.now() / 200) * 5;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.core.x + this.core.width/2, this.core.y + this.core.height/2, 
                    this.core.width/2 + pulse, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// ===== КОЛІЗІЇ =====
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function handleCollisions() {
    if (!player || !level) return;

    // Колізії з платформами
    player.onGround = false;
    level.platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            if (platform.type === 'trap') {
                // Електрична пастка
                player.takeDamage();
            } else if (platform.type === 'falling') {
                // Падаючий блок - колізія тільки якщо блок не падає
                if (!platform.falling && player.velocityY > 0 && player.y < platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.onGround = true;
                }
            } else {
                // Звичайна платформа
                if (player.velocityY > 0 && player.y < platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.onGround = true;
                }
            }
        }
    });

    // Колізії з ворогами
    level.enemies.forEach(enemy => {
        if (!enemy.dead && checkCollision(player, enemy)) {
            player.takeDamage();
        }

        // Атака гравця
        const attackBox = player.getAttackBox();
        if (attackBox && checkCollision(attackBox, enemy)) {
            enemy.takeDamage();
        }
    });

    // Збір енергії
    level.energies.forEach(energy => {
        if (!energy.collected && checkCollision(player, energy)) {
            energy.collected = true;
            score += 10;
            updateUI();
        }
    });

    // Двері (рівень 1)
    if (level.door && checkCollision(player, level.door)) {
        const collectedCount = level.energies.filter(e => e.collected).length;
        if (collectedCount >= 10) {
            // Перехід на рівень 2
            setTimeout(() => {
                currentLevel = 2;
                startLevel(2);
            }, 500);
        }
    }

    // Ядро (рівень 2)
    if (level.core && checkCollision(player, level.core)) {
        gameState = 'win';
        showScreen('winScreen');
        document.getElementById('winScore').textContent = `Очки: ${score}`;
    }

    // Межі екрану (низ)
    if (player.y > CONFIG.CANVAS_HEIGHT) {
        player.takeDamage();
        player.y = 50;
        player.x = 50;
    }
}

// ===== UI =====
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = currentLevel;
    
    const hearts = document.getElementById('hearts');
    hearts.textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
    
    if (screenId === 'gameOverScreen') {
        document.getElementById('finalScore').textContent = `Очки: ${score}`;
    }
}

// ===== ІГРОВИЙ ЦИКЛ =====
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Оновлення таймера невразливості
    if (invincibilityTimer > 0) {
        invincibilityTimer -= deltaTime;
        if (invincibilityTimer < 0) invincibilityTimer = 0;
    }

    if (gameState === 'playing') {
        // Очищення canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Оновлення
        if (player) player.update();
        if (level) {
            level.update();
            handleCollisions();
        }

        // Малювання
        if (level) level.draw();
        if (player) player.draw();
    }

    requestAnimationFrame(gameLoop);
}

// ===== УПРАВЛІННЯ =====
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// ===== ІНІЦІАЛІЗАЦІЯ =====
function initCanvas() {
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
}

function startLevel(levelNum) {
    currentLevel = levelNum;
    player = new Player(50, CONFIG.CANVAS_HEIGHT - 100);
    level = new Level(levelNum);
    invincibilityTimer = 0;
    updateUI();
}

function startGame() {
    gameState = 'playing';
    score = 0;
    lives = 3;
    invincibilityTimer = 0;
    showScreen('gameUI');
    startLevel(1);
}

// ===== ПОДІЇ UI =====
document.getElementById('startButton').addEventListener('click', () => {
    showScreen('gameUI');
    startGame();
});

document.getElementById('settingsButton').addEventListener('click', () => {
    showScreen('settingsMenu');
});

document.getElementById('backButton').addEventListener('click', () => {
    showScreen('startMenu');
});

document.getElementById('restartButton').addEventListener('click', () => {
    showScreen('gameUI');
    startGame();
});

document.getElementById('menuButton').addEventListener('click', () => {
    gameState = 'menu';
    showScreen('startMenu');
});

document.getElementById('playAgainButton').addEventListener('click', () => {
    showScreen('gameUI');
    startGame();
});

document.getElementById('winMenuButton').addEventListener('click', () => {
    gameState = 'menu';
    showScreen('startMenu');
});

document.getElementById('volumeSlider').addEventListener('input', (e) => {
    document.getElementById('volumeValue').textContent = e.target.value + '%';
});

// ===== ЗАПУСК =====
initCanvas();
showScreen('startMenu');
gameLoop(0);
