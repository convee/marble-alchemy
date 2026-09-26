// Angry Birds game logic
const Game = (function() {
    // Matter.js modules
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Events = Matter.Events,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Vector = Matter.Vector,
          Body = Matter.Body,
          Constraint = Matter.Constraint;

    // Game configuration
    const CONFIG = {
        width: 1200,
        height: 675,
        slingshotPos: { x: 200, y: 450 },
        slingshotStiffness: 0.1,
        maxDragDistance: 100,
        birdRadius: 15,
        pigRadius: 20,
        gravity: 1,
        woodDensity: 0.002,
        stoneDensity: 0.005
    };

    // Game state
    let engine, render, runner;
    let currentBird = null;
    let slingshotConstraint = null;
    let birdsLeft = 3;
    let score = 0;
    let currentLevel = 1;
    let isDragging = false;
    let gameActive = false;
    let pigs = [];
    let obstacles = [];

    // DOM elements
    const canvas = document.getElementById('game-canvas');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const birdsLeftEl = document.getElementById('birds-left');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const resultTitle = document.getElementById('result-title');
    const resultScore = document.getElementById('result-score');
    const nextLevelBtn = document.getElementById('next-level-btn');

    // Initialize the game
    function init() {
        // Set canvas size
        canvas.width = CONFIG.width;
        canvas.height = CONFIG.height;

        // Create the physics engine
        engine = Engine.create();
        engine.world.gravity.y = CONFIG.gravity;

        // Create the renderer
        render = Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: CONFIG.width,
                height: CONFIG.height,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio
            }
        });

        // Create the runner
        runner = Runner.create();

        // Set collision events
        Events.on(engine, 'collisionStart', handleCollision);

        // Bind UI events
        bindEvents();

        // Start rendering
        Render.run(render);
        Runner.run(runner, engine);

        // Render the initial empty scene
        renderScene();
    }

    // Bind events
    function bindEvents() {
        document.getElementById('start-btn').addEventListener('click', startGame);
        document.getElementById('restart-btn').addEventListener('click', restartGame);
        document.getElementById('next-level-btn').addEventListener('click', nextLevel);

        // Mouse and touch events
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleMouseUp);

        // Resize handling
        window.addEventListener('resize', handleResize);
    }

    // Start the game
    function startGame() {
        startScreen.classList.remove('active');
        gameActive = true;
        window.chaoschemyTrack?.('game_start');
        resetLevel();
    }

    // Restart the game
    function restartGame() {
        gameOverScreen.classList.remove('active');
        score = 0;
        currentLevel = 1;
        window.chaoschemyTrack?.('run_restart');
        updateUI();
        resetLevel();
        gameActive = true;
    }

    // Next level
    function nextLevel() {
        gameOverScreen.classList.remove('active');
        currentLevel++;
        window.chaoschemyTrack?.('level_complete', { level: currentLevel - 1 });
        updateUI();
        resetLevel();
        gameActive = true;
    }

    // Reset the level
    function resetLevel() {
        // Clear the world
        Composite.clear(engine.world);
        Engine.clear(engine);
        
        pigs = [];
        obstacles = [];
        birdsLeft = 3 + Math.floor(currentLevel / 2);
        currentBird = null;
        isDragging = false;

        // Create boundaries
        createBoundaries();
        
        // Create the slingshot
        createSlingshot();
        
        // Load the level
        loadLevel(currentLevel);
        
        // Spawn the first bird
        spawnBird();
        
        updateUI();
    }

    // Create boundaries
    function createBoundaries() {
        const ground = Bodies.rectangle(CONFIG.width / 2, CONFIG.height + 30, CONFIG.width, 60, { 
            isStatic: true,
            render: { fillStyle: '#8B4513' },
            label: 'ground'
        });
        
        const leftWall = Bodies.rectangle(-30, CONFIG.height / 2, 60, CONFIG.height, { 
            isStatic: true,
            render: { fillStyle: '#8B4513' }
        });
        
        const rightWall = Bodies.rectangle(CONFIG.width + 30, CONFIG.height / 2, 60, CONFIG.height, { 
            isStatic: true,
            render: { fillStyle: '#8B4513' }
        });

        Composite.add(engine.world, [ground, leftWall, rightWall]);
    }

    // Create the slingshot
    function createSlingshot() {
        // Slingshot base
        const base = Bodies.rectangle(CONFIG.slingshotPos.x, CONFIG.slingshotPos.y + 50, 20, 100, {
            isStatic: true,
            render: { fillStyle: '#8B4513' },
            label: 'slingshot-base'
        });

        Composite.add(engine.world, base);
    }

    // Spawn a bird
    function spawnBird() {
        if (birdsLeft <= 0) {
            setTimeout(checkGameEnd, 2000);
            return;
        }

        birdsLeft--;
        updateUI();

        currentBird = Bodies.circle(CONFIG.slingshotPos.x, CONFIG.slingshotPos.y, CONFIG.birdRadius, {
            restitution: 0.6,
            friction: 0.005,
            density: 0.004,
            render: { fillStyle: '#FF0000' },
            label: 'bird'
        });

        // Create the slingshot constraint
        slingshotConstraint = Constraint.create({
            pointA: CONFIG.slingshotPos,
            bodyB: currentBird,
            stiffness: CONFIG.slingshotStiffness,
            render: { 
                visible: true,
                strokeStyle: '#8B4513',
                lineWidth: 5
            }
        });

        Composite.add(engine.world, [currentBird, slingshotConstraint]);
    }

    // Load the level
    function loadLevel(level) {
        const baseX = 700;
        const baseY = CONFIG.height - 50;

        if (level === 1) {
            // Level 1: simple structure
            createObstacle(baseX, baseY - 50, 20, 100, 'wood');
            createObstacle(baseX + 100, baseY - 50, 20, 100, 'wood');
            createObstacle(baseX + 50, baseY - 110, 120, 20, 'wood');
            createPig(baseX + 50, baseY - 140);
        } else if (level === 2) {
            // Level 2: two-layer structure
            createObstacle(baseX, baseY - 50, 20, 100, 'wood');
            createObstacle(baseX + 80, baseY - 50, 20, 100, 'wood');
            createObstacle(baseX + 160, baseY - 50, 20, 100, 'wood');
            createObstacle(baseX + 80, baseY - 110, 180, 20, 'wood');
            createObstacle(baseX + 40, baseY - 160, 20, 100, 'wood');
            createObstacle(baseX + 120, baseY - 160, 20, 100, 'wood');
            createObstacle(baseX + 80, baseY - 220, 120, 20, 'wood');
            createPig(baseX + 80, baseY - 140);
            createPig(baseX + 80, baseY - 250);
        } else {
            // Level 3+: complex structure
            for (let i = 0; i < 3; i++) {
                createObstacle(baseX + i * 60, baseY - 50, 20, 100, 'wood');
            }
            createObstacle(baseX + 60, baseY - 110, 160, 20, 'wood');
            createObstacle(baseX + 60, baseY - 160, 20, 100, 'stone');
            createPig(baseX + 60, baseY - 140);
            createPig(baseX + 120, baseY - 50);
        }
    }

    // Create obstacles
    function createObstacle(x, y, width, height, type) {
        const density = type === 'stone' ? CONFIG.stoneDensity : CONFIG.woodDensity;
        const color = type === 'stone' ? '#808080' : '#DEB887';
        
        const obstacle = Bodies.rectangle(x, y, width, height, {
            density: density,
            friction: 0.5,
            render: { fillStyle: color },
            label: type
        });

        obstacle.maxHp = type === 'stone' ? 200 : 100;
        obstacle.hp = obstacle.maxHp;
        
        obstacles.push(obstacle);
        Composite.add(engine.world, obstacle);
    }

    // Create pigs
    function createPig(x, y) {
        const pig = Bodies.circle(x, y, CONFIG.pigRadius, {
            density: 0.001,
            friction: 0.3,
            restitution: 0.2,
            render: { fillStyle: '#00FF00' },
            label: 'pig'
        });

        pig.hp = 100;
        pigs.push(pig);
        Composite.add(engine.world, pig);
    }

    // Mouse and touch input
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function handleMouseDown(e) {
        if (!gameActive || !currentBird) return;
        
        const pos = getMousePos(e);
        const birdPos = currentBird.position;
        const dist = Vector.magnitude(Vector.sub(pos, birdPos));
        
        if (dist < CONFIG.birdRadius * 3) {
            isDragging = true;
        }
    }

    function handleMouseMove(e) {
        if (!isDragging || !currentBird) return;
        
        const pos = getMousePos(e);
        const slingPos = CONFIG.slingshotPos;
        
        // Limit drag distance
        let dragVector = Vector.sub(pos, slingPos);
        const dragDistance = Vector.magnitude(dragVector);
        
        if (dragDistance > CONFIG.maxDragDistance) {
            dragVector = Vector.mult(Vector.normalise(dragVector), CONFIG.maxDragDistance);
        }
        
        // Limit backward drag
        if (dragVector.x > 0) {
            dragVector.x = 0;
        }
        
        const newPos = Vector.add(slingPos, dragVector);
        Body.setPosition(currentBird, newPos);
        Body.setVelocity(currentBird, { x: 0, y: 0 });
        Body.setAngularVelocity(currentBird, 0);
    }

    function handleMouseUp(e) {
        if (!isDragging || !currentBird) return;
        
        isDragging = false;
        
        // Remove the constraint and launch the bird
        Composite.remove(engine.world, slingshotConstraint);
        slingshotConstraint = null;
        
        // Calculate launch velocity
        const slingPos = CONFIG.slingshotPos;
        const birdPos = currentBird.position;
        const pullVector = Vector.sub(slingPos, birdPos);
        const power = 0.035;
        
        const velocity = Vector.mult(pullVector, power);
        Body.setVelocity(currentBird, velocity);
        window.chaoschemyTrack?.('shot_attempt', { level: currentLevel });
        
        currentBird = null;
        
        // Spawn the next bird after a delay
        setTimeout(() => {
            if (gameActive) {
                spawnBird();
            }
        }, 3000);
        
        // Check for game over
        setTimeout(checkGameEnd, 4000);
    }

    function handleTouchStart(e) {
        e.preventDefault();
        handleMouseDown(e);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        handleMouseMove(e);
    }

    // Collision handling
    function handleCollision(e) {
        const pairs = e.pairs;
        
        pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Calculate collision force
            const speed = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity));
            const damage = speed * 10;
            const birdImpact = bodyA.label === 'bird' || bodyB.label === 'bird';
            const structureImpact = ['wood', 'stone'].includes(bodyA.label) && ['wood', 'stone'].includes(bodyB.label);
            
            // Check for pig hits
            if (bodyA.label === 'pig' || bodyB.label === 'pig') {
                const pig = bodyA.label === 'pig' ? bodyA : bodyB;
                const other = bodyA.label === 'pig' ? bodyB : bodyA;
                
                if (other.label === 'bird' || damage > 5) {
                    pig.hp -= damage;
                    if (pig.hp <= 0 && pigs.includes(pig)) {
                        destroyPig(pig);
                    }
                }
            }
            
            // Check for obstacle damage
            [bodyA, bodyB].forEach(body => {
                if ((body.label === 'wood' || body.label === 'stone') && damage > 3 && (birdImpact || structureImpact)) {
                    body.hp -= damage;
                    if (body.hp <= 0 && obstacles.includes(body)) {
                        destroyObstacle(body);
                    }
                }
            });
        });
    }

    // Destroy a pig
    function destroyPig(pig) {
        const index = pigs.indexOf(pig);
        if (index > -1) {
            pigs.splice(index, 1);
            Composite.remove(engine.world, pig);
            score += 500;
            updateUI();
        }
    }

    // Destroy an obstacle
    function destroyObstacle(obstacle) {
        const index = obstacles.indexOf(obstacle);
        if (index > -1) {
            obstacles.splice(index, 1);
            Composite.remove(engine.world, obstacle);
            score += obstacle.label === 'stone' ? 100 : 50;
            updateUI();
        }
    }

    // Check for game over
    function checkGameEnd() {
        if (!gameActive) return;
        
        if (pigs.length === 0) {
            // Victory
            gameOver(true);
        } else if (birdsLeft === 0 && !currentBird) {
            // Check for flying birds
            const allBodies = Composite.allBodies(engine.world);
            const flyingBird = allBodies.find(b => b.label === 'bird');
            
            if (!flyingBird) {
                gameOver(false);
            }
        }
    }

    // Game over
    function gameOver(won) {
        gameActive = false;
        
        resultTitle.textContent = won ? '🎉 Victory!' : '😢 Try again';
        resultTitle.style.color = won ? '#4ECDC4' : '#FF6B6B';
        resultScore.textContent = `Final score: ${score}`;
        nextLevelBtn.style.display = won ? 'inline-block' : 'none';
        window.chaoschemyTrack?.(won ? 'run_won' : 'run_lost', { level: currentLevel, score });
        window.chaoschemyTrack?.('run_complete', { level: currentLevel, score, result: won ? 'won' : 'lost' });
        
        gameOverScreen.classList.add('active');
    }

    // Update the UI
    function updateUI() {
        scoreEl.textContent = score;
        levelEl.textContent = currentLevel;
        birdsLeftEl.textContent = birdsLeft + (currentBird ? 1 : 0);
    }

    // Resize handling
    function handleResize() {
        const container = document.getElementById('game-container');
        const aspectRatio = CONFIG.width / CONFIG.height;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        if (containerWidth / containerHeight > aspectRatio) {
            canvas.style.width = `${containerHeight * aspectRatio}px`;
            canvas.style.height = '100%';
        } else {
            canvas.style.width = '100%';
            canvas.style.height = `${containerWidth / aspectRatio}px`;
        }
    }

    // Custom rendering (draw the slingshot line)
    function renderScene() {
        (function renderLoop() {
            if (render) {
                Render.world(render);
                
                // Draw the drag line
                if (isDragging && currentBird) {
                    const ctx = canvas.getContext('2d');
                    ctx.beginPath();
                    ctx.moveTo(CONFIG.slingshotPos.x, CONFIG.slingshotPos.y);
                    ctx.lineTo(currentBird.position.x, currentBird.position.y);
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    
                    // Draw the aim line
                    const slingPos = CONFIG.slingshotPos;
                    const birdPos = currentBird.position;
                    const pullVector = Vector.sub(slingPos, birdPos);
                    const aimEnd = Vector.add(slingPos, Vector.mult(pullVector, 2));
                    
                    ctx.beginPath();
                    ctx.setLineDash([10, 10]);
                    ctx.moveTo(slingPos.x, slingPos.y);
                    ctx.lineTo(aimEnd.x, aimEnd.y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                
                // Draw pig faces
                pigs.forEach(pig => {
                    const ctx = canvas.getContext('2d');
                    const pos = pig.position;
                    
                    // Eyes
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(pos.x - 6, pos.y - 5, 5, 0, Math.PI * 2);
                    ctx.arc(pos.x + 6, pos.y - 5, 5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Pupils
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(pos.x - 6, pos.y - 5, 2, 0, Math.PI * 2);
                    ctx.arc(pos.x + 6, pos.y - 5, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Nose
                    ctx.fillStyle = '#228B22';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y + 3, 6, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Nostrils
                    ctx.fillStyle = '#006400';
                    ctx.beginPath();
                    ctx.arc(pos.x - 2, pos.y + 3, 1.5, 0, Math.PI * 2);
                    ctx.arc(pos.x + 2, pos.y + 3, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Draw the bird face
                if (currentBird) {
                    const ctx = canvas.getContext('2d');
                    const pos = currentBird.position;
                    
                    // Eyes
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(pos.x - 4, pos.y - 3, 4, 0, Math.PI * 2);
                    ctx.arc(pos.x + 4, pos.y - 3, 4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Pupils
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(pos.x - 4, pos.y - 3, 1.5, 0, Math.PI * 2);
                    ctx.arc(pos.x + 4, pos.y - 3, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Eyebrows (angry expression)
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(pos.x - 7, pos.y - 8);
                    ctx.lineTo(pos.x - 1, pos.y - 5);
                    ctx.moveTo(pos.x + 7, pos.y - 8);
                    ctx.lineTo(pos.x + 1, pos.y - 5);
                    ctx.stroke();
                    
                    // Beak
                    ctx.fillStyle = 'orange';
                    ctx.beginPath();
                    ctx.moveTo(pos.x - 3, pos.y + 3);
                    ctx.lineTo(pos.x + 3, pos.y + 3);
                    ctx.lineTo(pos.x, pos.y + 7);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            requestAnimationFrame(renderLoop);
        })();
    }

    // Public API
    return {
        init: init
    };
})();

// Initialize after the page loads
document.addEventListener('DOMContentLoaded', Game.init);
