// キャンバスとコンテキストを取得
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// ブロックのサイズ
const BLOCK_SIZE = 20;
const ROWS = 20;
const COLS = 12;

// スコアとレベルの情報
let score = 0;
let level = 1;
let lines = 0;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;
let dropCounter = 0;
let dropInterval = 1000; // 1秒

// ゲームボード（20行 x 12列）
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));

// テトリミノ（ブロック）の形
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

// ブロックの色
const COLORS = {
    I: '#00f0f0',  // 水色
    O: '#f0f000',  // 黄色
    T: '#a000f0',  // 紫
    S: '#00f000',  // 緑
    Z: '#f00000',  // 赤
    J: '#0000f0',  // 青
    L: '#f0a000'   // オレンジ
};

// 現在のブロックと次のブロック
let currentPiece = null;
let nextPiece = null;

// ブロックの位置と形
let position = { x: 0, y: 0 };

// ランダムなブロックを作る
function createPiece() {
    const pieces = Object.keys(SHAPES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
        shape: SHAPES[randomPiece],
        color: COLORS[randomPiece],
        type: randomPiece
    };
}

// ボードを描画
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // グリッドを描く
    ctx.strokeStyle = '#333';
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            if (board[row][col]) {
                ctx.fillStyle = board[row][col];
                ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#333';
            }
        }
    }
}

// 現在のブロックを描画
function drawPiece() {
    if (!currentPiece) return;
    
    ctx.fillStyle = currentPiece.color;
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillRect(
                    (position.x + x) * BLOCK_SIZE,
                    (position.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                ctx.strokeStyle = '#000';
                ctx.strokeRect(
                    (position.x + x) * BLOCK_SIZE,
                    (position.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// 次のブロックを描画
function drawNextPiece() {
    if (!nextPiece) return;
    
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;
    
    nextCtx.fillStyle = nextPiece.color;
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextCtx.fillRect(
                    (offsetX + x) * BLOCK_SIZE,
                    (offsetY + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                nextCtx.strokeStyle = '#000';
                nextCtx.strokeRect(
                    (offsetX + x) * BLOCK_SIZE,
                    (offsetY + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// ブロックが他のブロックやボードの端に当たるかチェック
function collision(piece, pos) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = pos.x + x;
                const newY = pos.y + y;
                
                // 左右の壁
                if (newX < 0 || newX >= COLS) return true;
                // 床
                if (newY >= ROWS) return true;
                // 他のブロック
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
}

// ブロックを固定する
function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = position.y + y;
                const boardX = position.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// 完成した行を消す
function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // 同じ行をもう一度チェック
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        
        // レベルアップ（10行ごと）
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

// スコアを更新
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// ブロックを回転
function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    
    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    if (collision(currentPiece, position)) {
        currentPiece.shape = previousShape;
    }
}

// ブロックを左に移動
function moveLeft() {
    position.x--;
    if (collision(currentPiece, position)) {
        position.x++;
    }
}

// ブロックを右に移動
function moveRight() {
    position.x++;
    if (collision(currentPiece, position)) {
        position.x--;
    }
}

// ブロックを下に移動
function moveDown() {
    position.y++;
    if (collision(currentPiece, position)) {
        position.y--;
        merge();
        clearLines();
        spawnPiece();
    }
    dropCounter = 0;
}

// 一番下まで落とす
function hardDrop() {
    while (!collision(currentPiece, { x: position.x, y: position.y + 1 })) {
        position.y++;
    }
    merge();
    clearLines();
    spawnPiece();
}

// 新しいブロックを出現させる
function spawnPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    position = { 
        x: Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2), 
        y: 0 
    };
    
    drawNextPiece();
    
    if (collision(currentPiece, position)) {
        gameOver();
    }
}

// ゲームオーバー
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(gameLoop);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// ゲームループ
let lastTime = 0;
function update(time = 0) {
    if (isPaused || isGameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        moveDown();
    }
    
    drawBoard();
    drawPiece();
    
    gameLoop = requestAnimationFrame(update);
}

// キー操作
document.addEventListener('keydown', (e) => {
    if (isGameOver || !currentPiece) return;
    
    if (e.key === 'ArrowLeft') {
        moveLeft();
    } else if (e.key === 'ArrowRight') {
        moveRight();
    } else if (e.key === 'ArrowDown') {
        moveDown();
    } else if (e.key === 'ArrowUp') {
        rotate();
    } else if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
    }
    
    drawBoard();
    drawPiece();
});

// ボタン操作
document.getElementById('startBtn').addEventListener('click', () => {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    isGameOver = false;
    updateScore();
    
    nextPiece = createPiece();
    spawnPiece();
    update();
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('restartBtn').disabled = false;
    document.getElementById('gameOver').classList.add('hidden');
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '再開' : 'ポーズ';
    if (!isPaused) {
        lastTime = performance.now();
        update();
    }
});

document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
});

// 初期描画
drawBoard();
