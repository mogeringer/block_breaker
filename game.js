const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('gameContainer');

// キャンバスのサイズを設定
function resizeCanvas() {
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // スマホ向けに縦長のアスペクト比を設定
    const aspectRatio = 9 / 16;  // 縦長の比率に変更
    let width = containerWidth;
    let height = width / aspectRatio;
    
    if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
    }
    
    // キャンバスのサイズを設定
    canvas.width = 360;  // 幅を360に設定
    canvas.height = 640;  // 高さを640に設定
    
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

// ゲームの設定定数
const GAME_CONFIG = {
    CANVAS_WIDTH: 360,
    CANVAS_HEIGHT: 640,
    ASPECT_RATIO: 9 / 16,
    PADDLE_WIDTH: 80,
    PADDLE_HEIGHT: 15,
    BALL_RADIUS: 8,
    BRICK_ROWS: 12,
    BRICK_COLUMNS: 8,
    BRICK_WIDTH: 35,
    BRICK_HEIGHT: 15,
    BRICK_PADDING: 3,
    BRICK_OFFSET_TOP: 40,
    ITEM_RADIUS: 15,
    ITEM_SPEED: 2,
    POWERUP_DURATION: 10,
    GAME_OVER_DELAY: 500
};

// 特殊ブロックの設定
const BRICK_TYPES = {
    NORMAL: { color: '#0095DD', border: '#003366', hits: 1 },
    EXPLOSIVE: { color: '#FF0000', border: '#990000', hits: 1 },
    HARD: { color: '#888888', border: '#444444', hits: 3 },
    MOVING: { color: '#00AA00', border: '#006600', hits: 1 }
};

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
        this.radius = GAME_CONFIG.ITEM_RADIUS;
        this.speed = GAME_CONFIG.ITEM_SPEED;
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
            case 'PADDLE_SIZE':
                displayText = 'WIDE';
                break;
            case 'BALL_SLOW':
                displayText = 'SLOW';
                break;
            case 'EXTRA_BALL':
                displayText = 'MORE';
                break;
            case 'BALL_PIERCE':
                displayText = 'PIERCE';
                break;
            case 'BALL_SPLIT':
                displayText = 'SPLIT';
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

// ゲームの状態管理
const GameState = {
    running: false,
    mode: 'normal',
    time: 0,
    timer: null,
    powerUps: {
        paddleSize: false,
        ballSlow: false,
        ballPierce: false,
        ballSplit: false
    },
    powerUpTimers: {},
    reset() {
        this.running = false;
        this.mode = 'normal';
        this.time = 0;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.powerUps = {
            paddleSize: false,
            ballSlow: false,
            ballPierce: false,
            ballSplit: false
        };
        this.powerUpTimers = {};
    }
};

// ゲームオブジェクト
let paddle;
let balls = []; // ボールの配列
let bricks;
let items = []; // アイテムの配列
let touchStartX = 0;
let touchCurrentX = 0;

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
    if (!GameState.running) return;
    touchStartX = e.touches[0].clientX;
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!GameState.running) return;
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
    if (!GameState.running) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / canvas.clientWidth;
    mouseX = (e.clientX - rect.left) * scale;
});

// パワーアップの効果を適用
function applyPowerUp(type) {
    // 既存のタイマーをクリア
    if (GameState.powerUpTimers[type]) {
        clearInterval(GameState.powerUpTimers[type].timer);
        delete GameState.powerUpTimers[type];
    }

    GameState.powerUps[type] = true;
    GameState.powerUpTimers[type] = {
        duration: GAME_CONFIG.POWERUP_DURATION,
        timer: setInterval(() => {
            GameState.powerUpTimers[type].duration--;
            if (GameState.powerUpTimers[type].duration <= 0) {
                GameState.powerUps[type] = false;
                clearInterval(GameState.powerUpTimers[type].timer);
                delete GameState.powerUpTimers[type];
            }
        }, 1000)
    };

    // ボール分裂の処理
    if (type === 'ballSplit' && GameState.running) {
        const currentBalls = [...balls];
        currentBalls.forEach(ball => {
            const newBall = {
                x: ball.x,
                y: ball.y,
                radius: GAME_CONFIG.BALL_RADIUS,
                dx: -ball.dx,
                dy: ball.dy
            };
            balls.push(newBall);
        });
    }
}

// ゲームオブジェクトの初期化
function initGameObjects() {
    paddle = {
        x: canvas.width / 2 - GAME_CONFIG.PADDLE_WIDTH / 2,
        y: canvas.height - GAME_CONFIG.PADDLE_HEIGHT - 10,
        width: GAME_CONFIG.PADDLE_WIDTH,
        height: GAME_CONFIG.PADDLE_HEIGHT,
        dx: 8
    };

    balls = [{
        x: canvas.width / 2,
        y: canvas.height - GAME_CONFIG.PADDLE_HEIGHT - GAME_CONFIG.BALL_RADIUS - 10,
        radius: GAME_CONFIG.BALL_RADIUS,
        dx: 4,
        dy: -4
    }];

    initBricks();
    items = [];
}

// ブロックの初期化
function initBricks() {
    bricks = [];
    for (let i = 0; i < GAME_CONFIG.BRICK_ROWS; i++) {
        bricks[i] = [];
        for (let j = 0; j < GAME_CONFIG.BRICK_COLUMNS; j++) {
            const type = getRandomBrickType();
            bricks[i][j] = createBrick(i, j, type);
        }
    }
}

// ランダムなブロックタイプを取得
function getRandomBrickType() {
    const random = Math.random();
    if (random < 0.1) return BRICK_TYPES.EXPLOSIVE;
    if (random < 0.2) return BRICK_TYPES.HARD;
    if (random < 0.3) return BRICK_TYPES.MOVING;
    return BRICK_TYPES.NORMAL;
}

// ブロックオブジェクトの作成
function createBrick(row, col, type) {
    return {
        x: col * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_PADDING) + 
           (canvas.width - (GAME_CONFIG.BRICK_COLUMNS * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_PADDING) - GAME_CONFIG.BRICK_PADDING)) / 2,
        y: row * (GAME_CONFIG.BRICK_HEIGHT + GAME_CONFIG.BRICK_PADDING) + GAME_CONFIG.BRICK_OFFSET_TOP,
        width: GAME_CONFIG.BRICK_WIDTH,
        height: GAME_CONFIG.BRICK_HEIGHT,
        visible: true,
        type: type,
        hits: type.hits,
        direction: Math.random() < 0.5 ? 1 : -1
    };
}

// ゲームの初期化
function initGame() {
    GameState.reset();
    initGameObjects();
    startGameTimer();
    GameState.running = true; // ゲーム状態を先に設定
}

// ゲームタイマーの開始
function startGameTimer() {
    GameState.timer = setInterval(() => {
        GameState.time++;
        updateTimer();
    }, 1000);
}

// ゲームオーバー処理
function handleGameOver() {
    GameState.running = false;
    if (GameState.timer) clearInterval(GameState.timer);
    gameOverSound.play();
    setTimeout(() => {
        alert('ゲームオーバー！');
        showStartScreen();
    }, GAME_CONFIG.GAME_OVER_DELAY);
}

// ゲームクリア処理
function handleGameClear() {
    GameState.running = false;
    if (GameState.timer) clearInterval(GameState.timer);
    gameClearSound.play();
    setTimeout(() => {
        const top3 = saveHighScore(GameState.time);
        const message = `おめでとう！クリアタイム: ${formatTime(GameState.time)}\n\n` +
            `トップ3の記録:\n${top3.map((score, index) => 
                `${index + 1}位: ${formatTime(score)}`).join('\n')}`;
        alert(message);
        showStartScreen();
    }, GAME_CONFIG.GAME_OVER_DELAY);
}

// スタート画面の表示
function showStartScreen() {
    startScreen.style.display = 'block';
    resizeCanvas();
    showHighScores();
}

// タイマーの更新
function updateTimer() {
    document.getElementById('timer').textContent = formatTime(GameState.time);
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
        y: paddle.y - GAME_CONFIG.BALL_RADIUS,
        radius: GAME_CONFIG.BALL_RADIUS,
        dx: (Math.random() - 0.5) * 8, // ランダムな方向
        dy: -4
    };
    // 速度の最小値を設定
    const minSpeed = 3;
    const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy);
    if (speed < minSpeed) {
        const ratio = minSpeed / speed;
        newBall.dx *= ratio;
        newBall.dy *= ratio;
    }
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
    if (!GameState.running) return;

    // キャンバスのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パドルの描画（パワーアップ効果を適用）
    const paddleWidth = GameState.powerUps.paddleSize ? GAME_CONFIG.PADDLE_WIDTH * 1.5 : GAME_CONFIG.PADDLE_WIDTH;
    ctx.fillStyle = '#333';
    ctx.fillRect(paddle.x - (paddleWidth - GAME_CONFIG.PADDLE_WIDTH) / 2, paddle.y, paddleWidth, paddle.height);

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
    for (let i = 0; i < GAME_CONFIG.BRICK_ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK_COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                // 移動ブロックの更新
                if (brick.type === BRICK_TYPES.MOVING) {
                    brick.x += brick.direction;
                    if (brick.x <= (canvas.width - (GAME_CONFIG.BRICK_COLUMNS * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_PADDING) - GAME_CONFIG.BRICK_PADDING)) / 2 || 
                        brick.x + brick.width >= canvas.width - (canvas.width - (GAME_CONFIG.BRICK_COLUMNS * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_PADDING) - GAME_CONFIG.BRICK_PADDING)) / 2) {
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
        const speedMultiplier = GameState.powerUps.ballSlow ? 0.7 : 1.0;
        ball.x += ball.dx * speedMultiplier;
        ball.y += ball.dy * speedMultiplier;

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
    for (let i = 0; i < GAME_CONFIG.BRICK_ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK_COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                balls.forEach(ball => {
                    if (ball.x + ball.radius > brick.x && 
                        ball.x - ball.radius < brick.x + brick.width &&
                        ball.y + ball.radius > brick.y && 
                        ball.y - ball.radius < brick.y + brick.height) {
                        
                        if (!GameState.powerUps.ballPierce) {
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
                                        if (ni >= 0 && ni < GAME_CONFIG.BRICK_ROWS && 
                                            nj >= 0 && nj < GAME_CONFIG.BRICK_COLUMNS) {
                                            bricks[ni][nj].visible = false;
                                        }
                                    }
                                }
                            }

                            // アイテムをランダムに生成（確率を10%に調整）
                            if (Math.random() < 0.1) {
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

    // ゲームオーバー判定の最適化
    let activeBalls = balls.filter(ball => ball.y + ball.radius <= canvas.height);
    if (activeBalls.length === 0) {
        handleGameOver();
        return;
    }

    // ゲームクリア判定
    let bricksLeft = 0;
    for (let i = 0; i < GAME_CONFIG.BRICK_ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK_COLUMNS; j++) {
            if (bricks[i][j].visible) bricksLeft++;
        }
    }
    if (bricksLeft === 0) {
        handleGameClear();
        return;
    }

    requestAnimationFrame(draw);
}

// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    draw();
}); 