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
    
    // ゲームタイトルの位置を調整
    if (startScreen) {
        startScreen.style.width = width + 'px';
        startScreen.style.height = height + 'px';
    }
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
    // キャンバス設定
    CANVAS: {
        WIDTH: 360,
        HEIGHT: 640,
        ASPECT_RATIO: 9 / 16
    },
    
    // パドル設定
    PADDLE: {
        DEFAULT_WIDTH: 80,
        HEIGHT: 15,
        SPEED: 8,
        POWER_UP_MULTIPLIER: 1.5
    },
    
    // ボール設定
    BALL: {
        RADIUS: 8,
        MIN_SPEED: 3,
        POWER_UP_SLOW_MULTIPLIER: 0.7
    },
    
    // ブロック設定
    BRICK: {
        ROWS: 12,
        COLUMNS: 8,
        WIDTH: 35,
        HEIGHT: 15,
        PADDING: 3,
        OFFSET_TOP: 40,
        TYPES: {
            NORMAL: { 
                name: '通常',
                color: '#0095DD', 
                border: '#003366', 
                hits: 1 
            },
            EXPLOSIVE: { 
                name: '爆発',
                color: '#FF0000', 
                border: '#990000', 
                hits: 1 
            },
            HARD: { 
                name: '硬い',
                color: '#888888', 
                border: '#444444', 
                hits: 3 
            },
            MOVING: { 
                name: '移動',
                color: '#00AA00', 
                border: '#006600', 
                hits: 1 
            }
        }
    },
    
    // アイテム設定
    ITEM: {
        RADIUS: 15,
        SPEED: 2,
        TYPES: {
            EXTRA_BALL: {
                name: 'ボール増加',
                color: '#FFD700',
                border: '#B8860B',
                effect: 'ボールが10個増える',
                displayText: 'MORE'
            },
            PADDLE_SIZE: {
                name: 'パドル拡大',
                color: '#FF69B4',
                border: '#C71585',
                effect: 'パドルが大きくなる',
                displayText: 'WIDE'
            },
            BALL_SLOW: {
                name: 'ボール減速',
                color: '#87CEEB',
                border: '#4682B4',
                effect: 'ボールの速度が遅くなる',
                displayText: 'SLOW'
            },
            BALL_PIERCE: {
                name: '貫通弾',
                color: '#FF4500',
                border: '#8B0000',
                effect: 'ボールがブロックを貫通する',
                displayText: 'PIERCE'
            },
            BALL_SPLIT: {
                name: 'ボール分裂',
                color: '#9370DB',
                border: '#4B0082',
                effect: 'ボールが2つに分裂する',
                displayText: 'SPLIT'
            }
        }
    },
    
    // ゲーム設定
    GAME: {
        POWERUP_DURATION: 10,
        GAME_OVER_DELAY: 500
    },
    
    // ステージごとの設定
    STAGES: [
        { // ステージ1（簡単）
            paddleWidth: 100,
            ballSpeed: 4,
            itemDropRate: 0.2
        },
        { // ステージ2
            paddleWidth: 95,
            ballSpeed: 4.5,
            itemDropRate: 0.18
        },
        { // ステージ3
            paddleWidth: 90,
            ballSpeed: 5,
            itemDropRate: 0.15
        },
        { // ステージ4
            paddleWidth: 85,
            ballSpeed: 5.5,
            itemDropRate: 0.12
        },
        { // ステージ5
            paddleWidth: 80,
            ballSpeed: 6,
            itemDropRate: 0.1
        },
        { // ステージ6
            paddleWidth: 75,
            ballSpeed: 6.5,
            itemDropRate: 0.08
        },
        { // ステージ7（旧ステージ5の難易度）
            paddleWidth: 60,
            ballSpeed: 8,
            itemDropRate: 0.025
        },
        { // ステージ8（より難しい）
            paddleWidth: 55,
            ballSpeed: 9,
            itemDropRate: 0.02
        },
        { // ステージ9（さらに難しい）
            paddleWidth: 50,
            ballSpeed: 10,
            itemDropRate: 0.015
        },
        { // ステージ10（最難関）
            paddleWidth: 45,
            ballSpeed: 12,
            itemDropRate: 0.01
        }
    ]
};

// ゲームの状態管理
const GameState = {
    running: false,
    mode: 'normal',
    stage: 1,
    powerUps: {
        paddleSize: false,
        ballSlow: false,
        ballPierce: false,
        ballSplit: false
    },
    reset() {
        this.running = false;
        this.mode = 'normal';
        this.stage = 1;
        this.powerUps = {
            paddleSize: false,
            ballSlow: false,
            ballPierce: false,
            ballSplit: false
        };
    }
};

// ゲームオブジェクト
let paddle;
let balls = [];
let bricks;
let items = [];
let touchStartX = 0;
let touchCurrentX = 0;

// ハイスコアの管理
function saveHighScore(stage) {
    // 現在のステージを記録（クリアしたステージは現在のステージ-1）
    const clearedStage = stage - 1;
    const highScores = JSON.parse(localStorage.getItem('blockBreakerHighScores') || '[]');
    
    // 新しい記録を追加（0以上の場合のみ）
    if (clearedStage >= 0) {
        highScores.push(clearedStage);
    }
    
    // 重複を除去し、降順にソート
    const uniqueScores = [...new Set(highScores)].sort((a, b) => b - a);
    
    // トップ3を保存
    const top3 = uniqueScores.slice(0, 3);
    localStorage.setItem('blockBreakerHighScores', JSON.stringify(top3));
    
    return top3;
}

function getHighScores() {
    return JSON.parse(localStorage.getItem('blockBreakerHighScores') || '[]');
}

// ハイスコアのリセット
function resetHighScores() {
    localStorage.removeItem('blockBreakerHighScores');
    showHighScores(); // 表示を更新
}

// ハイスコアの表示
function showHighScores() {
    const highScores = getHighScores();
    const highScoresList = document.getElementById('highScoresList');
    if (highScoresList) {
        highScoresList.innerHTML = highScores.length > 0 
            ? highScores.map((score, index) => 
                `<div>${index + 1}位: ステージ${score}</div>`).join('')
            : '<div>記録なし</div>';
    }
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
    GameState.powerUps[type] = true;

    // ボール分裂の処理
    if (type === 'ballSplit' && GameState.running) {
        const currentBalls = [...balls];
        currentBalls.forEach(ball => {
            const newBall = {
                x: ball.x,
                y: ball.y,
                radius: GAME_CONFIG.BALL.RADIUS,
                dx: -ball.dx, // 反対方向に進むように設定
                dy: ball.dy
            };
            balls.push(newBall);
        });
    }
}

// ステージの進行
function advanceStage() {
    if (GameState.stage < GAME_CONFIG.STAGES.length) {
        GameState.stage++;
        // パワーアップ効果をリセット
        GameState.powerUps = {
            paddleSize: false,
            ballSlow: false,
            ballPierce: false, // 追加
            ballSplit: false
        };
        updateStageDisplay();
        initGameObjects();
    }
}

// ステージ表示の更新
function updateStageDisplay() {
    const stageDisplay = document.getElementById('stageDisplay');
    if (stageDisplay) {
        stageDisplay.textContent = `ステージ ${GameState.stage}`;
    }
}

// ゲームオブジェクトの初期化
function initGameObjects() {
    const currentStage = GAME_CONFIG.STAGES[GameState.stage - 1];
    
    // パドルの初期化
    paddle = {
        x: 0,  // キャンバスの一番左に配置
        y: canvas.height - GAME_CONFIG.PADDLE.HEIGHT - 50,
        width: currentStage.paddleWidth,
        height: GAME_CONFIG.PADDLE.HEIGHT,
        dx: GAME_CONFIG.PADDLE.SPEED
    };
    
    // ボールの初期化
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - GAME_CONFIG.PADDLE.HEIGHT - GAME_CONFIG.BALL.RADIUS - 60, // 60px上部に移動
        radius: GAME_CONFIG.BALL.RADIUS,
        dx: currentStage.ballSpeed,
        dy: -currentStage.ballSpeed
    }];
    
    // ブロックの初期化
    initBricks();
    
    // アイテムの初期化
    items = [];
}

// ブロックの初期化
function initBricks() {
    bricks = [];
    const { ROWS, COLUMNS, WIDTH, HEIGHT, PADDING, OFFSET_TOP } = GAME_CONFIG.BRICK;
    const offsetLeft = (canvas.width - (COLUMNS * (WIDTH + PADDING) - PADDING)) / 2;
    
    for (let i = 0; i < ROWS; i++) {
        bricks[i] = [];
        for (let j = 0; j < COLUMNS; j++) {
            const type = getRandomBrickType();
            bricks[i][j] = {
                x: j * (WIDTH + PADDING) + offsetLeft,
                y: i * (HEIGHT + PADDING) + OFFSET_TOP,
                width: WIDTH,
                height: HEIGHT,
                visible: true,
                type: type,
                hits: type.hits,
                direction: Math.random() < 0.5 ? 1 : -1
            };
        }
    }
}

// ランダムなブロックタイプを取得
function getRandomBrickType() {
    const random = Math.random();
    if (random < 0.1) return GAME_CONFIG.BRICK.TYPES.EXPLOSIVE;
    if (random < 0.2) return GAME_CONFIG.BRICK.TYPES.HARD;
    if (random < 0.3) return GAME_CONFIG.BRICK.TYPES.MOVING;
    return GAME_CONFIG.BRICK.TYPES.NORMAL;
}

// アイテムクラス
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = GAME_CONFIG.ITEM.RADIUS;
        this.speed = GAME_CONFIG.ITEM.SPEED;
        this.type = type;
        this.active = true;
        this.name = GAME_CONFIG.ITEM.TYPES[type].name;
        this.effect = GAME_CONFIG.ITEM.TYPES[type].effect;
        this.color = GAME_CONFIG.ITEM.TYPES[type].color;
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
        ctx.fillRect(this.x - 25, this.y - 15, 50, 30);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 25, this.y - 15, 50, 30);
        
        // テキストの描画
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GAME_CONFIG.ITEM.TYPES[this.type].displayText, this.x, this.y);
        
        // アイテム名を表示
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.name, this.x, this.y - 20);
        ctx.closePath();
    }
}

// アイテムをランダムに生成
function generateRandomItem(x, y) {
    const currentStage = GAME_CONFIG.STAGES[GameState.stage - 1];
    if (Math.random() < currentStage.itemDropRate) { // 条件チェックを追加
        const types = Object.keys(GAME_CONFIG.ITEM.TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        return new Item(x, y, type);
    }
    return null;
}

// ゲームの初期化
function initGame() {
    GameState.reset();
    resetHighScores(); // ゲーム開始時にハイスコアをリセット
    resizeCanvas();
    initGameObjects();
    updateStageDisplay();
    GameState.running = true;
}

// ゲームオーバー処理
function handleGameOver() {
    GameState.running = false;
    gameOverSound.play();
    setTimeout(() => {
        const top3 = saveHighScore(GameState.stage);
        const message = `ゲームオーバー！\n到達ステージ: ${GameState.stage}\n\n` +
            `トップ3の記録:\n${top3.map((score, index) => 
                `${index + 1}位: ステージ${score}`).join('\n')}`;
        alert(message);
        showStartScreen();
    }, GAME_CONFIG.GAME.GAME_OVER_DELAY);
}

// ゲームクリア処理
function handleGameClear() {
    GameState.running = false;
    gameClearSound.play();
    setTimeout(() => {
        if (GameState.stage < GAME_CONFIG.STAGES.length) {
            advanceStage();
            // ゲームオブジェクトの初期化を待ってからrunningをtrueに設定
            setTimeout(() => {
                GameState.running = true;
                draw();
            }, 0);
        } else {
            const top3 = saveHighScore(GameState.stage);
            const message = `おめでとう！全ステージクリア！\n到達ステージ: ${GameState.stage}\n\n` +
                `トップ3の記録:\n${top3.map((score, index) => 
                    `${index + 1}位: ステージ${score}`).join('\n')}`;
            alert(message);
            showStartScreen();
        }
    }, GAME_CONFIG.GAME.GAME_OVER_DELAY);
}

// スタート画面の表示
function showStartScreen() {
    startScreen.style.display = 'block';
    resizeCanvas(); // スタート画面表示時にキャンバスサイズを再設定
    showHighScores();
}

// パドルの位置更新
function updatePaddlePosition() {
    paddle.x = mouseX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

// ボールの更新
function updateBalls() {
    balls.forEach(ball => {
        // 衝突判定を先に行う
        if (handlePaddleCollision(ball)) {
            paddleHitSound.currentTime = 0;
            paddleHitSound.play();
        }

        // 速度の更新（SLOWアイテムの効果を適用）
        const speedMultiplier = GameState.powerUps.ballSlow ? GAME_CONFIG.BALL.POWER_UP_SLOW_MULTIPLIER : 1.0;
        const dx = ball.dx * speedMultiplier;
        const dy = ball.dy * speedMultiplier;

        // 位置の更新
        ball.x += dx;
        ball.y += dy;

        // 壁との衝突判定
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
        }
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        }
    });
}

// ブロックの描画
function drawBrick(brick) {
    if (!brick.visible) return;

    // ブロックの描画
    ctx.fillStyle = brick.type.color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = brick.type.border;
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

    // 硬いブロックのヒット数を表示
    if (brick.type === GAME_CONFIG.BRICK.TYPES.HARD) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(brick.hits.toString(), 
            brick.x + brick.width / 2, 
            brick.y + brick.height / 2 + 7);
    }
}

// ゲームのメインループ
function draw() {
    if (!GameState.running) return;

    // キャンバスのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パドルの描画（パワーアップ効果を適用）
    const paddleWidth = GameState.powerUps.paddleSize ? paddle.width * GAME_CONFIG.PADDLE.POWER_UP_MULTIPLIER : paddle.width;
    ctx.fillStyle = '#333';
    ctx.fillRect(paddle.x - (paddleWidth - paddle.width) / 2, paddle.y, paddleWidth, paddle.height);

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
    for (let i = 0; i < GAME_CONFIG.BRICK.ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK.COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                // 移動ブロックの更新
                if (brick.type === GAME_CONFIG.BRICK.TYPES.MOVING) {
                    updateMovingBrick(brick);
                }
                drawBrick(brick);
            }
        }
    }

    // パドルの移動
    updatePaddlePosition();

    // ボールの移動と衝突判定
    updateBalls();

    // ブロックとの衝突判定
    checkBrickCollisions();

    // アイテムとの衝突判定
    checkItemCollisions();

    // ゲームオーバー判定
    if (balls.every(ball => ball.y + ball.radius > canvas.height)) {
        handleGameOver();
        return;
    }

    // ゲームクリア判定
    if (isGameClear()) {
        handleGameClear();
        return;
    }

    requestAnimationFrame(draw);
}

// 移動ブロックの更新
function updateMovingBrick(brick) {
    const { WIDTH, PADDING, COLUMNS } = GAME_CONFIG.BRICK;
    const minX = (canvas.width - (COLUMNS * (WIDTH + PADDING) - PADDING)) / 2;
    const maxX = canvas.width - minX - WIDTH;

    brick.x += brick.direction;
    if (brick.x <= minX || brick.x >= maxX) {
        brick.direction *= -1;
    }
}

// パドルとの衝突判定を改善
function handlePaddleCollision(ball) {
    // 次のフレームでのボールの位置を予測
    const nextX = ball.x + ball.dx;
    const nextY = ball.y + ball.dy;
    
    const ballRight = nextX + ball.radius;
    const ballLeft = nextX - ball.radius;
    const ballBottom = nextY + ball.radius;
    const ballTop = nextY - ball.radius;

    const paddleRight = paddle.x + paddle.width;
    const paddleLeft = paddle.x;
    const paddleBottom = paddle.y + paddle.height;
    const paddleTop = paddle.y;

    // 横方向の衝突
    if (ballRight > paddleLeft && ballLeft < paddleRight) {
        // 上からの衝突
        if (ballBottom > paddleTop && ballTop < paddleTop) {
            ball.dy = -Math.abs(ball.dy); // 必ず下向きに反射
            return true;
        }
        // 下からの衝突
        if (ballTop < paddleBottom && ballBottom > paddleBottom) {
            ball.dy = Math.abs(ball.dy); // 必ず上向きに反射
            return true;
        }
    }

    // 縦方向の衝突
    if (ballBottom > paddleTop && ballTop < paddleBottom) {
        // 左からの衝突
        if (ballRight > paddleLeft && ballLeft < paddleLeft) {
            ball.dx = Math.abs(ball.dx); // 必ず右向きに反射
            return true;
        }
        // 右からの衝突
        if (ballLeft < paddleRight && ballRight > paddleRight) {
            ball.dx = -Math.abs(ball.dx); // 必ず左向きに反射
            return true;
        }
    }

    return false;
}

// ブロックとの衝突判定
function checkBrickCollisions() {
    for (let i = 0; i < GAME_CONFIG.BRICK.ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK.COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                balls.forEach(ball => {
                    if (checkCollision(ball, brick)) {
                        handleBrickCollision(ball, brick, i, j);
                    }
                });
            }
        }
    }
}

// ブロック衝突時の処理
function handleBrickCollision(ball, brick, row, col) {
    if (!GameState.powerUps.ballPierce) {
        ball.dy = -ball.dy;
    }

    if (brick.type === GAME_CONFIG.BRICK.TYPES.HARD) {
        brick.hits--;
        if (brick.hits <= 0) {
            destroyBrick(brick, row, col);
        }
    } else {
        destroyBrick(brick, row, col);
    }
}

// ブロックの破壊処理
function destroyBrick(brick, row, col) {
    brick.visible = false;
    brickBreakSound.currentTime = 0;
    brickBreakSound.play();

    // 爆発ブロックの処理
    if (brick.type === GAME_CONFIG.BRICK.TYPES.EXPLOSIVE) {
        handleExplosiveBrick(row, col);
    }

    // アイテムの生成（確率を100%に変更）
    const item = generateRandomItem(
        brick.x + brick.width / 2,
        brick.y + brick.height / 2
    );
    if (item) items.push(item);
}

// 爆発ブロックの処理
function handleExplosiveBrick(row, col) {
    for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
            const ni = row + di;
            const nj = col + dj;
            if (ni >= 0 && ni < GAME_CONFIG.BRICK.ROWS && 
                nj >= 0 && nj < GAME_CONFIG.BRICK.COLUMNS) {
                bricks[ni][nj].visible = false;
            }
        }
    }
}

// アイテムとの衝突判定
function checkItemCollisions() {
    items = items.filter(item => {
        if (item.active && checkCollision(item, paddle)) {
            applyItemEffect(item);
            return false;
        }
        return true;
    });
}

// アイテム効果の適用
function applyItemEffect(item) {
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
            break;
    }
}

// ゲームクリア判定
function isGameClear() {
    for (let i = 0; i < GAME_CONFIG.BRICK.ROWS; i++) {
        for (let j = 0; j < GAME_CONFIG.BRICK.COLUMNS; j++) {
            if (bricks[i][j].visible) return false;
        }
    }
    return true;
}

// 新しいボールを追加する関数
function addBall() {
    const newBall = {
        x: paddle.x + paddle.width / 2,
        y: paddle.y - GAME_CONFIG.BALL.RADIUS,
        radius: GAME_CONFIG.BALL.RADIUS,
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

// 衝突判定のユーティリティ関数
function checkCollision(ball, object) {
    // ボールとオブジェクトの衝突判定
    const ballRight = ball.x + ball.radius;
    const ballLeft = ball.x - ball.radius;
    const ballBottom = ball.y + ball.radius;
    const ballTop = ball.y - ball.radius;

    const objectRight = object.x + object.width;
    const objectLeft = object.x;
    const objectBottom = object.y + object.height;
    const objectTop = object.y;

    // 横方向の衝突判定
    const horizontalCollision = ballRight > objectLeft && ballLeft < objectRight;
    // 縦方向の衝突判定
    const verticalCollision = ballBottom > objectTop && ballTop < objectBottom;

    return horizontalCollision && verticalCollision;
}

// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    draw();
}); 