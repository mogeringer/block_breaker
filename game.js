const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('gameContainer');

// キャンバスのサイズを設定
function resizeCanvas() {
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // アスペクト比を維持
    const aspectRatio = 800 / 600;
    let width = containerWidth;
    let height = width / aspectRatio;
    
    if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
    }
    
    canvas.width = 800;
    canvas.height = 600;
    
    // キャンバスの表示サイズを設定
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}

// 初期化時にキャンバスのサイズを設定
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 音声要素の取得
const paddleHitSound = document.getElementById('paddleHit');
const brickBreakSound = document.getElementById('brickBreak');
const gameOverSound = document.getElementById('gameOver');
const gameClearSound = document.getElementById('gameClear');

// ゲームの設定
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 10;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 30;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 50;
const BRICK_OFFSET_LEFT = 30;

// 特殊ブロックの設定
const BRICK_TYPES = {
    NORMAL: { color: '#0095DD', border: '#003366', hits: 1 },
    EXPLOSIVE: { color: '#FF0000', border: '#990000', hits: 1 },
    HARD: { color: '#888888', border: '#444444', hits: 3 },
    MOVING: { color: '#00AA00', border: '#006600', hits: 1 }
};

// アイテムの設定
const ITEM_RADIUS = 15;
const ITEM_SPEED = 2;

// アイテムの種類
const ITEM_TYPES = {
    EXTRA_BALL: {
        name: 'ボール増加',
        color: '#FFD700',
        border: '#B8860B',
        effect: 'ボールが10個増える'
    },
    PADDLE_SIZE: {
        name: 'パドル拡大',
        color: '#FF69B4',
        border: '#C71585',
        effect: 'パドルが一時的に大きくなる'
    },
    BALL_SLOW: {
        name: 'ボール減速',
        color: '#87CEEB',
        border: '#4682B4',
        effect: 'ボールの速度が遅くなる'
    },
    BALL_PIERCE: {
        name: '貫通弾',
        color: '#FF4500',
        border: '#8B0000',
        effect: 'ボールがブロックを貫通する'
    },
    PADDLE_MAGNET: {
        name: '磁石パドル',
        color: '#32CD32',
        border: '#006400',
        effect: 'パドルがボールを引き寄せる'
    },
    BALL_SPLIT: {
        name: 'ボール分裂',
        color: '#9370DB',
        border: '#4B0082',
        effect: 'ボールが2つに分裂する'
    }
};

// アイテムクラス
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = ITEM_RADIUS;
        this.speed = ITEM_SPEED;
        this.type = type;
        this.active = true;
        this.name = ITEM_TYPES[type].name;
        this.effect = ITEM_TYPES[type].effect;
        this.color = ITEM_TYPES[type].color;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;
        ctx.beginPath();
        // 横長の四角形の描画
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 25, this.y - 15, 50, 30);  // 幅を50に変更
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 25, this.y - 15, 50, 30);
        
        // テキストの描画
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // アイテムの種類に応じて異なるテキストを表示
        let displayText = '';
        switch(this.type) {
            case 'size':
                displayText = 'WIDE';
                break;
            case 'speed':
                displayText = 'FAST';
                break;
            case 'ball':
                displayText = 'MORE';
                break;
        }
        ctx.fillText(displayText, this.x, this.y);
        
        // アイテム名を表示
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.name, this.x, this.y - 20);
        ctx.closePath();
    }
}

// ゲームオブジェクト
let paddle;
let balls = []; // ボールの配列
let bricks;
let items = []; // アイテムの配列
let gameRunning = false;
let touchStartX = 0;
let touchCurrentX = 0;

// ゲームモード
let gameMode = 'normal'; // 'normal' または 'timeAttack'
let gameTime = 0;
let gameTimer = null;

// ハイスコアの管理
function saveHighScore(time) {
    const highScores = JSON.parse(localStorage.getItem('blockBreakerHighScores') || '[]');
    highScores.push(time);
    highScores.sort((a, b) => a - b);
    const top3 = highScores.slice(0, 3);
    localStorage.setItem('blockBreakerHighScores', JSON.stringify(top3));
    return top3;
}

function getHighScores() {
    return JSON.parse(localStorage.getItem('blockBreakerHighScores') || '[]');
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// タッチイベントの処理
function handleTouchStart(e) {
    if (!gameRunning) return;
    touchStartX = e.touches[0].clientX;
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!gameRunning) return;
    touchCurrentX = e.touches[0].clientX;
    const touchDelta = touchCurrentX - touchStartX;
    const scale = canvas.width / canvas.clientWidth;
    mouseX = (touchCurrentX - canvas.getBoundingClientRect().left) * scale;
    e.preventDefault();
}

// タッチイベントのリスナーを追加
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

// マウスの動きを追跡
let mouseX = 0;
canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / canvas.clientWidth;
    mouseX = (e.clientX - rect.left) * scale;
});

// パワーアップの効果
let powerUps = {
    paddleSize: false,
    ballSlow: false,
    ballPierce: false,
    paddleMagnet: false,
    ballSplit: false
};

// パワーアップの持続時間（秒）
const POWERUP_DURATION = 10;
let powerUpTimers = {};

// パワーアップの効果を適用
function applyPowerUp(type) {
    powerUps[type] = true;
    powerUpTimers[type] = POWERUP_DURATION;

    // タイマーを設定
    const timer = setInterval(() => {
        powerUpTimers[type]--;
        if (powerUpTimers[type] <= 0) {
            powerUps[type] = false;
            clearInterval(timer);
        }
    }, 1000);
}

// ゲームの初期化
function initGame() {
    paddle = {
        x: canvas.width / 2 - PADDLE_WIDTH / 2,
        y: canvas.height - PADDLE_HEIGHT - 10,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        dx: 8
    };

    // 最初のボールを追加
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - PADDLE_HEIGHT - BALL_RADIUS - 10,
        radius: BALL_RADIUS,
        dx: 4,
        dy: -4
    }];

    // ブロックの配列
    bricks = [];
    for (let i = 0; i < BRICK_ROWS; i++) {
        bricks[i] = [];
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            // 特殊ブロックをランダムに配置
            let type = BRICK_TYPES.NORMAL;
            const random = Math.random();
            if (random < 0.1) type = BRICK_TYPES.EXPLOSIVE;
            else if (random < 0.2) type = BRICK_TYPES.HARD;
            else if (random < 0.3) type = BRICK_TYPES.MOVING;

            bricks[i][j] = {
                x: j * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
                y: i * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                visible: true,
                type: type,
                hits: type.hits,
                direction: Math.random() < 0.5 ? 1 : -1 // 移動ブロックの方向
            };
        }
    }

    // アイテムの配列を初期化
    items = [];

    // タイマーをリセット
    gameTime = 0;
    if (gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        gameTime++;
        updateTimer();
    }, 1000);

    // パワーアップの状態をリセット
    powerUps = {
        paddleSize: false,
        ballSlow: false,
        ballPierce: false,
        paddleMagnet: false,
        ballSplit: false
    };
    powerUpTimers = {};
}

// タイマーの更新
function updateTimer() {
    document.getElementById('timer').textContent = formatTime(gameTime);
}

// ハイスコアの表示
function showHighScores() {
    const highScores = getHighScores();
    const highScoresList = document.getElementById('highScoresList');
    if (highScoresList) {
        highScoresList.innerHTML = highScores.length > 0 
            ? highScores.map((score, index) => 
                `<div>${index + 1}位: ${formatTime(score)}</div>`).join('')
            : '<div>記録なし</div>';
    }
}

// 新しいボールを追加する関数
function addBall() {
    const newBall = {
        x: paddle.x + paddle.width / 2,
        y: paddle.y - BALL_RADIUS,
        radius: BALL_RADIUS,
        dx: (Math.random() - 0.5) * 8, // ランダムな方向
        dy: -4
    };
    balls.push(newBall);
}

// 10個のボールを一度に追加する関数
function addTenBalls() {
    for (let i = 0; i < 10; i++) {
        addBall();
    }
}

// アイテムをランダムに生成
function generateRandomItem(x, y) {
    const types = Object.keys(ITEM_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return new Item(x, y, type);
}

// ゲームのメインループ
function draw() {
    if (!gameRunning) return;

    // キャンバスのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パドルの描画（パワーアップ効果を適用）
    const paddleWidth = powerUps.paddleSize ? PADDLE_WIDTH * 1.5 : PADDLE_WIDTH;
    ctx.fillStyle = '#333';
    ctx.fillRect(paddle.x - (paddleWidth - PADDLE_WIDTH) / 2, paddle.y, paddleWidth, paddle.height);

    // ボールの描画
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0095DD';
        ctx.fill();
        ctx.closePath();
    });

    // アイテムの描画と更新
    items.forEach(item => {
        item.update();
        item.draw();
    });

    // ブロックの描画と更新
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                // 移動ブロックの更新
                if (brick.type === BRICK_TYPES.MOVING) {
                    brick.x += brick.direction;
                    if (brick.x <= BRICK_OFFSET_LEFT || 
                        brick.x + brick.width >= canvas.width - BRICK_OFFSET_LEFT) {
                        brick.direction *= -1;
                    }
                }

                // ブロックの描画
                ctx.fillStyle = brick.type.color;
                ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                ctx.strokeStyle = brick.type.border;
                ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

                // 硬いブロックのヒット数を表示
                if (brick.type === BRICK_TYPES.HARD) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(brick.hits.toString(), 
                        brick.x + brick.width / 2, 
                        brick.y + brick.height / 2 + 7);
                }
            }
        }
    }

    // パドルの移動
    paddle.x = mouseX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

    // ボールの移動と衝突判定
    balls.forEach(ball => {
        // ボールの速度を調整
        const speedMultiplier = powerUps.ballSlow ? 0.7 : 1.0;
        ball.x += ball.dx * speedMultiplier;
        ball.y += ball.dy * speedMultiplier;

        // 磁石パドルの効果
        if (powerUps.paddleMagnet && ball.y > paddle.y - 100) {
            const dx = (paddle.x + paddle.width / 2) - ball.x;
            const dy = paddle.y - ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 200) {
                ball.x += dx * 0.02;
                ball.y += dy * 0.02;
            }
        }

        // 壁との衝突判定
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
        }
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        }

        // パドルとの衝突判定
        if (ball.y + ball.radius > paddle.y && 
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x + ball.radius > paddle.x && 
            ball.x - ball.radius < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
            paddleHitSound.currentTime = 0;
            paddleHitSound.play();
        }
    });

    // ブロックとの衝突判定
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                balls.forEach(ball => {
                    if (ball.x + ball.radius > brick.x && 
                        ball.x - ball.radius < brick.x + brick.width &&
                        ball.y + ball.radius > brick.y && 
                        ball.y - ball.radius < brick.y + brick.height) {
                        
                        if (!powerUps.ballPierce) {
                            ball.dy = -ball.dy;
                        }

                        // 硬いブロックの処理
                        if (brick.type === BRICK_TYPES.HARD) {
                            brick.hits--;
                            if (brick.hits <= 0) {
                                brick.visible = false;
                                brickBreakSound.currentTime = 0;
                                brickBreakSound.play();
                            }
                        } else {
                            brick.visible = false;
                            brickBreakSound.currentTime = 0;
                            brickBreakSound.play();

                            // 爆発ブロックの処理
                            if (brick.type === BRICK_TYPES.EXPLOSIVE) {
                                // 周囲のブロックを破壊
                                for (let di = -1; di <= 1; di++) {
                                    for (let dj = -1; dj <= 1; dj++) {
                                        const ni = i + di;
                                        const nj = j + dj;
                                        if (ni >= 0 && ni < BRICK_ROWS && 
                                            nj >= 0 && nj < BRICK_COLUMNS) {
                                            bricks[ni][nj].visible = false;
                                        }
                                    }
                                }
                            }

                            // アイテムをランダムに生成
                            if (Math.random() < 0.3) {
                                const item = generateRandomItem(
                                    brick.x + brick.width / 2,
                                    brick.y + brick.height / 2
                                );
                                items.push(item);
                            }
                        }
                    }
                });
            }
        }
    }

    // アイテムとパドルの衝突判定
    items = items.filter(item => {
        if (item.active && 
            item.y + item.radius > paddle.y && 
            item.y - item.radius < paddle.y + paddle.height &&
            item.x + item.radius > paddle.x && 
            item.x - item.radius < paddle.x + paddle.width) {
            
            // アイテムの効果を適用
            switch (item.type) {
                case 'EXTRA_BALL':
                    addTenBalls();
                    break;
                case 'PADDLE_SIZE':
                    applyPowerUp('paddleSize');
                    break;
                case 'BALL_SLOW':
                    applyPowerUp('ballSlow');
                    break;
                case 'BALL_PIERCE':
                    applyPowerUp('ballPierce');
                    break;
                case 'PADDLE_MAGNET':
                    applyPowerUp('paddleMagnet');
                    break;
                case 'BALL_SPLIT':
                    applyPowerUp('ballSplit');
                    // 全てのボールを分裂
                    const currentBalls = [...balls];
                    currentBalls.forEach(ball => {
                        const newBall = {
                            x: ball.x,
                            y: ball.y,
                            radius: ball.radius,
                            dx: -ball.dx,
                            dy: ball.dy
                        };
                        balls.push(newBall);
                    });
                    break;
            }
            return false;
        }
        return true;
    });

    // ゲームオーバー判定
    let allBallsLost = true;
    balls.forEach(ball => {
        if (ball.y + ball.radius <= canvas.height) {
            allBallsLost = false;
        }
    });

    if (allBallsLost) {
        gameRunning = false;
        if (gameTimer) clearInterval(gameTimer);
        gameOverSound.play();
        setTimeout(() => {
            alert('ゲームオーバー！');
            startScreen.style.display = 'block';
        }, 500);
        return;
    }

    // ゲームクリア判定
    let bricksLeft = 0;
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            if (bricks[i][j].visible) bricksLeft++;
        }
    }
    if (bricksLeft === 0) {
        gameRunning = false;
        if (gameTimer) clearInterval(gameTimer);
        gameClearSound.play();
        setTimeout(() => {
            const top3 = saveHighScore(gameTime);
            const message = `おめでとう！クリアタイム: ${formatTime(gameTime)}\n\n` +
                `トップ3の記録:\n${top3.map((score, index) => 
                    `${index + 1}位: ${formatTime(score)}`).join('\n')}`;
            alert(message);
            startScreen.style.display = 'block';
            showHighScores();
        }, 500);
        return;
    }

    requestAnimationFrame(draw);
}

// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    gameRunning = true;
    draw();
}); 