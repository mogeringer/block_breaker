const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');

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

// ゲームオブジェクト
let paddle;
let ball;
let bricks;
let gameRunning = false;

// ゲームの初期化
function initGame() {
    paddle = {
        x: canvas.width / 2 - PADDLE_WIDTH / 2,
        y: canvas.height - PADDLE_HEIGHT - 10,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        dx: 8
    };

    ball = {
        x: canvas.width / 2,
        y: canvas.height - PADDLE_HEIGHT - BALL_RADIUS - 10,
        radius: BALL_RADIUS,
        dx: 4,
        dy: -4
    };

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
}

// マウスの動きを追跡
let mouseX = 0;
canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
});

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
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0095DD';
    ctx.fill();
    ctx.closePath();

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

    // ボールの移動
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

    // ブロックとの衝突判定
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            const brick = bricks[i][j];
            if (brick.visible) {
                if (ball.x + ball.radius > brick.x && 
                    ball.x - ball.radius < brick.x + brick.width &&
                    ball.y + ball.radius > brick.y && 
                    ball.y - ball.radius < brick.y + brick.height) {
                    ball.dy = -ball.dy;
                    brick.visible = false;
                    brickBreakSound.currentTime = 0;
                    brickBreakSound.play();
                }
            }
        }
    }

    // ゲームオーバー判定
    if (ball.y + ball.radius > canvas.height) {
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