
class Mundo3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.player = null;
        this.isPlaying = false;
        this.luaCode = '';
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Inicializar estado
        this.updateStatus('waiting', '⏳', 'Escribe tu código Lua y presiona "Crear Mundo"', false);
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('createWorldBtn').addEventListener('click', () => {
            this.createWorld();
        });

        document.getElementById('playBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('backToEditorBtn').addEventListener('click', () => {
            this.backToEditor();
        });

        // Instrucciones del juego
        document.getElementById('instructions').addEventListener('click', () => {
            this.startPointerLock();
        });

        // Editor de código con actualización de estado
        document.getElementById('luaEditor').addEventListener('input', (e) => {
            this.luaCode = e.target.value;
            if (e.target.value.trim().length > 10) {
                this.updateStatus('waiting', '📝', 'Código listo. Presiona "Crear Mundo"', false);
            } else {
                this.updateStatus('waiting', '⏳', 'Escribe tu código Lua y presiona "Crear Mundo"', false);
            }
        });

        // Detectar dispositivo móvil de forma más completa
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       window.innerWidth <= 768 || 
                       'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0;
        
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    setupMobileControls() {
        // Prevenir zoom accidental
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });

        // Mejorar responsive del viewport
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }

    setupTouchControls() {
        // Crear controles virtuales para móvil
        const gameContainer = document.getElementById('gameContainer');
        
        // Joystick virtual para movimiento
        const joystick = document.createElement('div');
        joystick.className = 'virtual-joystick';
        joystick.innerHTML = `
            <div class="joystick-base">
                <div class="joystick-handle"></div>
            </div>
        `;
        gameContainer.appendChild(joystick);
        
        // Área táctil para mirar alrededor
        const lookArea = document.createElement('div');
        lookArea.className = 'look-area';
        lookArea.innerHTML = '<p>Arrastra para mirar</p>';
        gameContainer.appendChild(lookArea);
        
        // Botón de salto
        const jumpButton = document.createElement('div');
        jumpButton.className = 'jump-button';
        jumpButton.innerHTML = '↑';
        gameContainer.appendChild(jumpButton);
        
        this.setupJoystickEvents(joystick);
        this.setupLookEvents(lookArea);
        this.setupJumpButton(jumpButton);
    }

    setupJoystickEvents(joystick) {
        const handle = joystick.querySelector('.joystick-handle');
        const base = joystick.querySelector('.joystick-base');
        let isDragging = false;
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isDragging = true;
        });
        
        joystick.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - centerX;
            const deltaY = touch.clientY - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = rect.width / 2;
            
            if (distance < maxDistance) {
                handle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                
                // Convertir a movimiento
                this.moveForward = deltaY < -10;
                this.moveBackward = deltaY > 10;
                this.moveLeft = deltaX < -10;
                this.moveRight = deltaX > 10;
            }
        });
        
        joystick.addEventListener('touchend', () => {
            isDragging = false;
            handle.style.transform = 'translate(0, 0)';
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
        });
    }

    setupLookEvents(lookArea) {
        let lastTouchX = 0;
        let lastTouchY = 0;
        
        lookArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        });
        
        lookArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;
            
            // Simular movimiento del mouse para la cámara
            if (this.camera) {
                this.camera.rotation.y -= deltaX * 0.002;
                this.camera.rotation.x -= deltaY * 0.002;
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
            }
            
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        });
    }

    setupJumpButton(jumpButton) {
        jumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.canJump === true) {
                this.velocity.y += 350;
                this.canJump = false;
            }
        });
    }

    setupAlternativeControls() {
        // Controles alternativos para dispositivos sin PointerLock
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    async createWorld() {
        const createBtn = document.getElementById('createWorldBtn');
        const playBtn = document.getElementById('playBtn');
        const loading = document.getElementById('loadingOverlay');
        const statusIndicator = document.getElementById('statusIndicator');
        
        // Actualizar estado a "creando"
        this.updateStatus('creating', '🔨', 'Creando mundo 3D...', true);
        
        // Mostrar loading
        createBtn.querySelector('.button-text').style.display = 'none';
        createBtn.querySelector('.button-loader').style.display = 'block';
        createBtn.disabled = true;
        loading.classList.remove('hidden');

        // Obtener código Lua
        this.luaCode = document.getElementById('luaEditor').value;

        try {
            // Simular procesamiento del código Lua con pasos
            await this.simulateWorldCreation();

            // Crear mundo 3D
            this.setup3DWorld();

            // Ocultar loading
            loading.classList.add('hidden');
            createBtn.querySelector('.button-text').style.display = 'block';
            createBtn.querySelector('.button-loader').style.display = 'none';
            createBtn.disabled = false;
            
            // Habilitar botón de jugar
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
            playBtn.classList.add('pulse');

            // Actualizar estado a "listo"
            this.updateStatus('ready', '✅', '¡Mundo creado! Presiona "Jugar" para comenzar', false);

            // Procesar código Lua (simulado)
            this.processLuaCode();
            
        } catch (error) {
            console.error('Error creando mundo:', error);
            this.updateStatus('waiting', '❌', 'Error al crear mundo. Intenta de nuevo.', false);
            loading.classList.add('hidden');
            createBtn.querySelector('.button-text').style.display = 'block';
            createBtn.querySelector('.button-loader').style.display = 'none';
            createBtn.disabled = false;
        }
    }

    async simulateWorldCreation() {
        const steps = [
            'Analizando código Lua...',
            'Generando terreno...',
            'Creando objetos 3D...',
            'Configurando física...',
            'Preparando controles...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            this.updateStatus('creating', '🔨', steps[i], true);
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }

    updateStatus(type, icon, text, pulse = false) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusIcon = statusIndicator.querySelector('.status-icon');
        const statusText = statusIndicator.querySelector('.status-text');
        
        // Remover clases anteriores
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(type);
        
        if (pulse) {
            statusIndicator.classList.add('pulse');
        }
        
        statusIcon.textContent = icon;
        statusText.textContent = text;
    }

    setup3DWorld() {
        try {
            const container = document.getElementById('gameContainer');
            console.log('Configurando mundo 3D...');
            
            // Verificar que Three.js esté cargado
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js no está cargado correctamente');
            }
            
            // Escena
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
            console.log('Escena creada');

            // Cámara
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.set(0, 5, 10);
            console.log('Cámara configurada');

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: !this.isMobile, // Desactivar antialias en móvil para mejor rendimiento
                alpha: false,
                powerPreference: this.isMobile ? 'low-power' : 'high-performance'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = !this.isMobile; // Desactivar sombras en móvil
            if (!this.isMobile) {
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            container.appendChild(this.renderer.domElement);
            console.log('Renderer configurado');

            // Controles estilo Roblox
            this.setupRobloxControls();
            console.log('Controles configurados');

            // Iluminación
            this.setupLighting();
            console.log('Iluminación configurada');

            // Mundo base
            this.createBaseWorld();
            console.log('Mundo base creado');

            // Resize handler
            window.addEventListener('resize', () => this.onWindowResize());
            
            // Hacer un render inicial para verificar que todo funciona
            this.renderer.render(this.scene, this.camera);
            console.log('Mundo 3D configurado exitosamente');
            
        } catch (error) {
            console.error('Error configurando mundo 3D:', error);
            this.updateStatus('waiting', '❌', 'Error al crear mundo. Verifica tu conexión e intenta de nuevo.', false);
            throw error;
        }
    }

    setupRobloxControls() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        if (this.isMobile) {
            // Para móviles, usar controles táctiles directamente
            this.setupTouchControls();
            this.setupAlternativeControls();
        } else {
            // Para PC, usar PointerLock
            try {
                this.controls = new THREE.PointerLockControls(this.camera, document.body);
                
                // Controles de teclado
                document.addEventListener('keydown', (event) => this.onKeyDown(event));
                document.addEventListener('keyup', (event) => this.onKeyUp(event));
                
                // Escape para salir del pointer lock
                this.controls.addEventListener('unlock', () => {
                    document.getElementById('instructions').style.display = 'flex';
                });
            } catch (error) {
                console.error('Error configurando controles:', error);
                this.setupAlternativeControls();
            }
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump === true) this.velocity.y += 350;
                this.canJump = false;
                break;
            case 'Escape':
                this.controls.unlock();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    setupLighting() {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Luz direccional (sol)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-1, 1, 1);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    createBaseWorld() {
        // Suelo
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Cubos aleatorios
        for (let i = 0; i < 10; i++) {
            this.createRandomCube();
        }

        // Skybox simple
        this.createSkybox();
    }

    createRandomCube() {
        const geometry = new THREE.BoxGeometry(
            Math.random() * 3 + 1,
            Math.random() * 3 + 1,
            Math.random() * 3 + 1
        );
        const material = new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff
        });
        const cube = new THREE.Mesh(geometry, material);
        
        cube.position.set(
            (Math.random() - 0.5) * 50,
            geometry.parameters.height / 2,
            (Math.random() - 0.5) * 50
        );
        
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.scene.add(cube);
    }

    createSkybox() {
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    processLuaCode() {
        // Procesamiento mejorado del código Lua
        console.log('Procesando código Lua:', this.luaCode);
        
        // Crear una ventana de resultados para mostrar la ejecución
        this.showLuaResults();
        
        let executedCommands = [];
        
        // Procesar diferentes comandos Lua
        if (this.luaCode.includes('crearCubo')) {
            console.log('Ejecutando: crearCubo()');
            this.createRandomCube();
            executedCommands.push('✅ crearCubo() - Cubo creado exitosamente');
        }
        
        if (this.luaCode.includes('moverJugador')) {
            console.log('Ejecutando: moverJugador()');
            this.camera.position.set(0, 10, 5);
            executedCommands.push('✅ moverJugador() - Jugador movido a nueva posición');
        }
        
        // Buscar más comandos Lua
        if (this.luaCode.includes('crearEsfera')) {
            this.createSphere();
            executedCommands.push('✅ crearEsfera() - Esfera creada');
        }
        
        if (this.luaCode.includes('cambiarColor')) {
            this.changeWorldColors();
            executedCommands.push('✅ cambiarColor() - Colores del mundo cambiados');
        }
        
        if (this.luaCode.includes('crearTorre')) {
            this.createTower();
            executedCommands.push('✅ crearTorre() - Torre construida');
        }
        
        // Contar líneas de código
        const codeLines = this.luaCode.split('\n').filter(line => line.trim().length > 0);
        executedCommands.push(`📊 ${codeLines.length} líneas de código procesadas`);
        
        // Mostrar resultados
        this.displayLuaResults(executedCommands);
    }
    
    showLuaResults() {
        // Crear ventana de resultados si no existe
        if (!document.getElementById('luaResults')) {
            const resultsWindow = document.createElement('div');
            resultsWindow.id = 'luaResults';
            resultsWindow.className = 'lua-results';
            resultsWindow.innerHTML = `
                <div class="results-header">
                    <h3>🌟 Resultados del Código Lua</h3>
                    <button class="close-results">×</button>
                </div>
                <div class="results-content">
                    <p>Procesando código...</p>
                </div>
            `;
            document.body.appendChild(resultsWindow);
            
            // Cerrar ventana
            resultsWindow.querySelector('.close-results').addEventListener('click', () => {
                resultsWindow.remove();
            });
        }
    }
    
    displayLuaResults(commands) {
        const resultsWindow = document.getElementById('luaResults');
        if (resultsWindow) {
            const content = resultsWindow.querySelector('.results-content');
            content.innerHTML = `
                <div class="execution-summary">
                    <h4>Ejecución Completada:</h4>
                    ${commands.map(cmd => `<p class="result-line">${cmd}</p>`).join('')}
                </div>
                <div class="lua-tip">
                    <strong>💡 Tip:</strong> Prueba agregando estos comandos a tu código Lua:
                    <ul>
                        <li><code>crearEsfera()</code> - Crea una esfera</li>
                        <li><code>cambiarColor()</code> - Cambia los colores</li>
                        <li><code>crearTorre()</code> - Construye una torre</li>
                    </ul>
                </div>
            `;
        }
    }
    
    createSphere() {
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff
        });
        const sphere = new THREE.Mesh(geometry, material);
        
        sphere.position.set(
            (Math.random() - 0.5) * 30,
            5,
            (Math.random() - 0.5) * 30
        );
        
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        this.scene.add(sphere);
    }
    
    changeWorldColors() {
        // Cambiar color del cielo
        this.scene.background = new THREE.Color(Math.random() * 0xffffff);
        
        // Cambiar colores de objetos existentes
        this.scene.children.forEach(child => {
            if (child.material && child.material.color) {
                child.material.color.setHex(Math.random() * 0xffffff);
            }
        });
    }
    
    createTower() {
        const towerHeight = 5;
        for (let i = 0; i < towerHeight; i++) {
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshLambertMaterial({
                color: 0x8B4513 // Color marrón para la torre
            });
            const block = new THREE.Mesh(geometry, material);
            
            block.position.set(
                10, // Posición fija en X
                1 + (i * 2), // Apilar bloques
                10 // Posición fija en Z
            );
            
            block.castShadow = true;
            block.receiveShadow = true;
            this.scene.add(block);
        }
    }

    startGame() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameWorld').classList.remove('hidden');
        this.isPlaying = true;
        
        // Personalizar instrucciones según el dispositivo
        const instructions = document.getElementById('instructions');
        const instructionText = instructions.querySelector('.instruction-text');
        
        if (this.isMobile) {
            instructionText.innerHTML = `
                <h3>Controles Táctiles</h3>
                <p><strong>Joystick izquierdo</strong> - Caminar</p>
                <p><strong>Área derecha</strong> - Mirar alrededor</p>
                <p><strong>Botón saltar</strong> - Saltar</p>
                <p>Toca la pantalla para comenzar</p>
            `;
        }
        
        this.animate();
    }

    startPointerLock() {
        if (this.isMobile) {
            // En móviles, solo ocultar instrucciones
            document.getElementById('instructions').style.display = 'none';
        } else {
            // En PC, activar pointer lock
            this.controls.lock();
            document.getElementById('instructions').style.display = 'none';
        }
    }

    backToEditor() {
        document.getElementById('gameWorld').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        this.isPlaying = false;
        
        if (this.controls) {
            this.controls.unlock();
        }
    }

    animate() {
        if (!this.isPlaying) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Actualizar FPS
        this.updateFPS();
        
        // Actualizar controles de movimiento
        this.updateMovement();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    updateMovement() {
        const time = performance.now();
        const delta = (time - this.lastTime) / 1000;
        
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 100.0 * delta; // Gravedad
        
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * 400.0 * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * 400.0 * delta;
        }
        
        if (this.isMobile) {
            // Para móviles, mover la cámara directamente
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            const right = new THREE.Vector3();
            right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
            
            this.camera.position.addScaledVector(cameraDirection, -this.velocity.z * delta);
            this.camera.position.addScaledVector(right, -this.velocity.x * delta);
            this.camera.position.y += (this.velocity.y * delta);
            
            if (this.camera.position.y < 5) {
                this.velocity.y = 0;
                this.camera.position.y = 5;
                this.canJump = true;
            }
        } else {
            // Para PC, usar PointerLock si está disponible
            if (this.controls && this.controls.isLocked) {
                this.controls.moveRight(-this.velocity.x * delta);
                this.controls.moveForward(-this.velocity.z * delta);
                
                this.controls.getObject().position.y += (this.velocity.y * delta);
                
                if (this.controls.getObject().position.y < 5) {
                    this.velocity.y = 0;
                    this.controls.getObject().position.y = 5;
                    this.canJump = true;
                }
            }
        }
        
        this.lastTime = time;
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        
        if (now >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
            
            const fpsCounter = document.getElementById('fpsCounter');
            if (fpsCounter) {
                fpsCounter.textContent = this.fps;
            }
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    const mundo3D = new Mundo3D();
});
