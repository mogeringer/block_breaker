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

// アイテムの設定
const ITEM_RADIUS = 15;
const ITEM_SPEED = 2;
const ITEM_COLOR = '#FFD700'; // 金色

// アイテムクラス
class Item {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = ITEM_RADIUS;
        this.speed = ITEM_SPEED;
        this.type = 'extraBall'; // アイテムの種類
        this.active = true;
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
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = ITEM_COLOR;
        ctx.fill();
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
            bricks[i][j] = {
                x: j * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
                y: i * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                visible: true
            };
        }
    }

    // アイテムの配列を初期化
    items = [];
}

// 新しいボールを追加する関数
function addBall() {
    if (balls.length >= 10) return; // 最大10個まで
    const newBall = {
        x: paddle.x + paddle.width / 2,
        y: paddle.y - BALL_RADIUS,
        radius: BALL_RADIUS,
        dx: (Math.random() - 0.5) * 8, // ランダムな方向
        dy: -4
    };
    balls.push(newBall);
}

// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    gameRunning = true;
    draw();
});

// ゲームのメインループ
function draw() {
    if (!gameRunning) return;

    // キャンバスのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パドルの描画
    ctx.fillStyle = '#333';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

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

    // ブロックの描画
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            if (bricks[i][j].visible) {
                ctx.fillStyle = '#0095DD';
                ctx.fillRect(bricks[i][j].x, bricks[i][j].y, bricks[i][j].width, bricks[i][j].height);
                ctx.strokeStyle = '#003366';
                ctx.strokeRect(bricks[i][j].x, bricks[i][j].y, bricks[i][j].width, bricks[i][j].height);
            }
        }
    }

    // パドルの移動
    paddle.x = mouseX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

    // ボールの移動と衝突判定
    balls.forEach(ball => {
        ball.x += ball.dx;
        ball.y += ball.dy;

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
                        ball.dy = -ball.dy;
                        brick.visible = false;
                        brickBreakSound.currentTime = 0;
                        brickBreakSound.play();

                        // アイテムをランダムに生成
                        if (Math.random() < 0.3) { // 30%の確率でアイテムを生成
                            const item = new Item(
                                brick.x + brick.width / 2,
                                brick.y + brick.height / 2
                            );
                            items.push(item);
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
            // アイテムを取得
            if (item.type === 'extraBall') {
                addBall();
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
        gameClearSound.play();
        setTimeout(() => {
            alert('おめでとう！ゲームクリア！');
            startScreen.style.display = 'block';
        }, 500);
        return;
    }

    requestAnimationFrame(draw);
} 