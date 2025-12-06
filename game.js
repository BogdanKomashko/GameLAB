// ===== КОНФІГУРАЦІЯ =====
const CONFIG = {
    CANVAS_WIDTH: 2000, // Збільшено для більших рівнів
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
let cameraX = 0; // Позиція камери
const VIEW_WIDTH = 1200; // Видима ширина екрану
const VIEW_HEIGHT = 700; // Видима висота екрану

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

        // Межі екрану (тепер рівень ширший)
        this.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - this.width, this.x));
    }

    draw() {
        ctx.save();
        
        // Ефект невразливості
        if (invincibilityTimer > 0 && Math.floor(invincibilityTimer / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Тіло жаби (овальне, кібер-стиль)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 5, this.width / 2 - 2, this.height / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Освітлення на тілі
        ctx.fillStyle = '#66ff66';
        ctx.beginPath();
        ctx.ellipse(centerX - 5, centerY - 5, this.width / 3, this.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Кібер-панелі на спині
        ctx.strokeStyle = '#00cc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 5, this.y + 15, 10, 8);
        ctx.strokeRect(this.x + 25, this.y + 15, 10, 8);
        
        // Очі (великі, світляні)
        const eyeY = this.y + 12;
        const eyeSpacing = 12;
        const leftEyeX = centerX - eyeSpacing;
        const rightEyeX = centerX + eyeSpacing;
        const eyeSize = 10;
        
        // Зіниці (червоні, кібер-стиль)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Блики в очах
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(leftEyeX - 2, eyeY - 2, 3, 0, Math.PI * 2);
        ctx.arc(rightEyeX - 2, eyeY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Рот (простий, але стильний)
        ctx.strokeStyle = '#00cc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, this.y + 35, 8, 0, Math.PI);
        ctx.stroke();
        
        // Лапи (нижні)
        ctx.fillStyle = '#00cc00';
        ctx.fillRect(this.x + 5, this.y + this.height - 8, 8, 8);
        ctx.fillRect(this.x + this.width - 13, this.y + this.height - 8, 8, 8);
        
        // Анімація атаки (енергетичний ефект)
        if (this.attacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.fillStyle = '#ffff00';
            ctx.lineWidth = 4;
            const attackX = this.facing === 1 ? this.x + this.width : this.x - 30;
            const attackY = this.y + 15;
            
            // Енергетичний вибух
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(attackX + (this.facing === 1 ? 15 : -15), attackY + 15, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Світлові промені
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i;
                ctx.beginPath();
                ctx.moveTo(attackX + (this.facing === 1 ? 15 : -15), attackY + 15);
                ctx.lineTo(
                    attackX + (this.facing === 1 ? 15 : -15) + Math.cos(angle) * 20,
                    attackY + 15 + Math.sin(angle) * 20
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
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
        // Платформи (розширений рівень)
        this.platforms = [
            // Стартова зона
            new Platform(0, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(250, CONFIG.CANVAS_HEIGHT - 150, 150, 50),
            new Platform(450, CONFIG.CANVAS_HEIGHT - 250, 150, 50),
            new Platform(650, CONFIG.CANVAS_HEIGHT - 350, 150, 50),
            new Platform(850, CONFIG.CANVAS_HEIGHT - 250, 150, 50),
            new Platform(1050, CONFIG.CANVAS_HEIGHT - 150, 150, 50),
            
            // Середня зона
            new Platform(300, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(550, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(800, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(1050, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            
            // Нова зона 1
            new Platform(1250, CONFIG.CANVAS_HEIGHT - 200, 150, 50),
            new Platform(1450, CONFIG.CANVAS_HEIGHT - 300, 150, 50),
            new Platform(1650, CONFIG.CANVAS_HEIGHT - 200, 150, 50),
            new Platform(1200, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(1450, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            new Platform(1700, CONFIG.CANVAS_HEIGHT - 50, 200, 50),
            
            // Нова зона 2 (перед дверима)
            new Platform(1850, CONFIG.CANVAS_HEIGHT - 150, 100, 50),
            new Platform(1900, CONFIG.CANVAS_HEIGHT - 50, 100, 50),
            
            // Пастки
            new Platform(500, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
            new Platform(750, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
            new Platform(1300, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
            new Platform(1600, CONFIG.CANVAS_HEIGHT - 50, 50, 50, 'trap'),
        ];

        // Вороги (більше)
        this.enemies = [
            new Enemy(300, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(600, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(900, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(1200, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(1500, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
            new Enemy(1750, CONFIG.CANVAS_HEIGHT - 80, 'robo-rat'),
        ];

        // Енергія (більше - 20 штук)
        const energyPositions = [
            // Перша зона
            {x: 100, y: CONFIG.CANVAS_HEIGHT - 200},
            {x: 350, y: CONFIG.CANVAS_HEIGHT - 200},
            {x: 500, y: CONFIG.CANVAS_HEIGHT - 300},
            {x: 700, y: CONFIG.CANVAS_HEIGHT - 400},
            {x: 900, y: CONFIG.CANVAS_HEIGHT - 300},
            {x: 1100, y: CONFIG.CANVAS_HEIGHT - 200},
            // Друга зона
            {x: 1300, y: CONFIG.CANVAS_HEIGHT - 250},
            {x: 1500, y: CONFIG.CANVAS_HEIGHT - 350},
            {x: 1700, y: CONFIG.CANVAS_HEIGHT - 250},
            {x: 1250, y: CONFIG.CANVAS_HEIGHT - 100},
            {x: 1450, y: CONFIG.CANVAS_HEIGHT - 100},
            {x: 1650, y: CONFIG.CANVAS_HEIGHT - 100},
            // Третя зона
            {x: 1350, y: CONFIG.CANVAS_HEIGHT - 150},
            {x: 1550, y: CONFIG.CANVAS_HEIGHT - 150},
            {x: 1750, y: CONFIG.CANVAS_HEIGHT - 150},
            {x: 1400, y: CONFIG.CANVAS_HEIGHT - 250},
            {x: 1600, y: CONFIG.CANVAS_HEIGHT - 250},
            {x: 1800, y: CONFIG.CANVAS_HEIGHT - 200},
            {x: 1900, y: CONFIG.CANVAS_HEIGHT - 200},
            {x: 1850, y: CONFIG.CANVAS_HEIGHT - 200},
        ];
        
        energyPositions.forEach(pos => {
            this.energies.push(new Energy(pos.x, pos.y));
        });

        // Двері (перенесені далі)
        this.door = { x: 1950, y: CONFIG.CANVAS_HEIGHT - 200, width: 50, height: 100 };
    }

    initLevel2() {
        // Швидший рівень з ближчими платформами (розширений)
        this.platforms = [
            // Стартова зона
            new Platform(0, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            new Platform(200, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(350, CONFIG.CANVAS_HEIGHT - 190, 100, 50),
            new Platform(500, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(650, CONFIG.CANVAS_HEIGHT - 190, 100, 50),
            new Platform(800, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(950, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            new Platform(1100, CONFIG.CANVAS_HEIGHT - 50, 100, 50),
            
            // Середня зона
            new Platform(1250, CONFIG.CANVAS_HEIGHT - 180, 100, 50),
            new Platform(1400, CONFIG.CANVAS_HEIGHT - 120, 100, 50),
            new Platform(1550, CONFIG.CANVAS_HEIGHT - 200, 100, 50),
            new Platform(1700, CONFIG.CANVAS_HEIGHT - 140, 100, 50),
            new Platform(1850, CONFIG.CANVAS_HEIGHT - 50, 150, 50),
            
            // Падаючі блоки (більше)
            new Platform(400, 100, 80, 50, 'falling'),
            new Platform(700, 150, 80, 50, 'falling'),
            new Platform(1200, 200, 80, 50, 'falling'),
            new Platform(1500, 180, 80, 50, 'falling'),
            new Platform(1800, 220, 80, 50, 'falling'),
        ];

        // Дрони (більше)
        this.enemies = [
            new Enemy(200, 200, 'drone-eye'),
            new Enemy(500, 300, 'drone-eye'),
            new Enemy(800, 250, 'drone-eye'),
            new Enemy(1200, 200, 'drone-eye'),
            new Enemy(1500, 280, 'drone-eye'),
            new Enemy(1800, 220, 'drone-eye'),
        ];

        // Ядро (перенесене далі)
        this.core = { x: 1900, y: CONFIG.CANVAS_HEIGHT - 200, width: 80, height: 80 };
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
        if (collectedCount >= 15) { // Збільшено вимогу до 15 енергій
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
        // Оновлення камери (слідкує за гравцем)
        if (player) {
            cameraX = player.x - VIEW_WIDTH / 2;
            cameraX = Math.max(0, Math.min(cameraX, CONFIG.CANVAS_WIDTH - VIEW_WIDTH));
        }
        
        // Очищення canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        
        // Зсув контексту для камери
        ctx.save();
        ctx.translate(-cameraX, 0);

        // Оновлення
        if (player) player.update();
        if (level) {
            level.update();
            handleCollisions();
        }

        // Малювання
        if (level) level.draw();
        if (player) player.draw();
        
        ctx.restore();
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
    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
}

function startLevel(levelNum) {
    currentLevel = levelNum;
    player = new Player(50, CONFIG.CANVAS_HEIGHT - 100);
    level = new Level(levelNum);
    invincibilityTimer = 0;
    cameraX = 0; // Скидаємо камеру
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
