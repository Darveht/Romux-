
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
        // Solo crear el suelo básico
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

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
        console.log('Procesando código Lua real:', this.luaCode);
        
        // Limpiar objetos previos (excepto suelo y skybox)
        const objectsToRemove = [];
        this.scene.children.forEach(child => {
            if (child.userData.isUserCreated) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        
        // Analizar código Lua línea por línea
        const lines = this.luaCode.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            
            // Crear cubo con parámetros específicos
            const cuboMatch = line.match(/cubo\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/i);
            if (cuboMatch) {
                const x = parseFloat(cuboMatch[1]) || 0;
                const y = parseFloat(cuboMatch[2]) || 1;
                const z = parseFloat(cuboMatch[3]) || 0;
                this.createCuboAt(x, y, z);
            }
            
            // Crear esfera con parámetros
            const esferaMatch = line.match(/esfera\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/i);
            if (esferaMatch) {
                const x = parseFloat(esferaMatch[1]) || 0;
                const y = parseFloat(esferaMatch[2]) || 1;
                const z = parseFloat(esferaMatch[3]) || 0;
                const radio = parseFloat(esferaMatch[4]) || 1;
                this.createEsferaAt(x, y, z, radio);
            }
            
            // Mover jugador
            const moverMatch = line.match(/mover\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/i);
            if (moverMatch) {
                const x = parseFloat(moverMatch[1]) || 0;
                const y = parseFloat(moverMatch[2]) || 5;
                const z = parseFloat(moverMatch[3]) || 0;
                this.camera.position.set(x, y, z);
            }
            
            // Crear línea de cubos
            const lineaMatch = line.match(/linea\s*\(\s*([^,]+),\s*([^)]+)\s*\)/i);
            if (lineaMatch) {
                const cantidad = parseInt(lineaMatch[1]) || 1;
                const direccion = lineaMatch[2].replace(/['"]/g, '').toLowerCase();
                this.createLinea(cantidad, direccion);
            }
            
            // Cambiar color del suelo
            const colorMatch = line.match(/color_suelo\s*\(\s*([^)]+)\s*\)/i);
            if (colorMatch) {
                const color = colorMatch[1].replace(/['"]/g, '');
                this.changeFloorColor(color);
            }
        });
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
    
    createCuboAt(x, y, z) {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData.isUserCreated = true;
        this.scene.add(cube);
    }
    
    createEsferaAt(x, y, z, radio) {
        const geometry = new THREE.SphereGeometry(radio, 16, 16);
        const material = new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.userData.isUserCreated = true;
        this.scene.add(sphere);
    }
    
    createLinea(cantidad, direccion) {
        for (let i = 0; i < cantidad; i++) {
            let x = 0, z = 0;
            if (direccion === 'x') {
                x = i * 3;
            } else if (direccion === 'z') {
                z = i * 3;
            }
            this.createCuboAt(x, 1, z);
        }
    }
    
    changeFloorColor(colorName) {
        const colors = {
            'rojo': 0xff0000,
            'verde': 0x00ff00,
            'azul': 0x0000ff,
            'amarillo': 0xffff00,
            'morado': 0xff00ff,
            'naranja': 0xff8000
        };
        
        const color = colors[colorName] || 0x00ff00;
        this.scene.children.forEach(child => {
            if (child.geometry && child.geometry.type === 'PlaneGeometry') {
                child.material.color.setHex(color);
            }
        });
    }

    startGame() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameWorld').classList.remove('hidden');
        this.isPlaying = true;
        this.animate();
    }

    startPointerLock() {
        if (!this.isMobile && this.controls) {
            this.controls.lock();
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
