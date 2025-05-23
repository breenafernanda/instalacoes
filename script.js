document.addEventListener('DOMContentLoaded', () => {
    // Elementos comuns
    const wireSelectorButtons = document.querySelectorAll('#wire-selector button[data-color]');
    const resetButton = document.getElementById('reset-button');
    const statusMessage = document.getElementById('status-message');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Tooltip element para estado do circuito
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    
    // Estado global
    let selectedWireColor = null;
    let currentTab = 'simples';
    
    // --- Sistema de Abas ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Atualizar botões de aba
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Atualizar conteúdo de aba
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Atualizar aba atual
            currentTab = tabId;
            
            // Resetar estado ao trocar de aba
            resetCurrentTab();
            
            statusMessage.textContent = `Aba ${tabId} selecionada. Selecione um fio e clique em dois terminais para conectar.`;
        });
    });
    
    // --- Seleção de Fios ---
    wireSelectorButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedWireColor = button.getAttribute('data-color');
            statusMessage.textContent = `Fio ${selectedWireColor} selecionado. Clique no primeiro terminal.`;
            
            // Feedback visual para botão selecionado
            wireSelectorButtons.forEach(btn => btn.style.border = 'none');
            button.style.border = '2px solid yellow';
            
            // Cancelar qualquer desenho de fio em andamento
            cancelWireDrawing();
        });
    });
    
    // --- Botão Reset ---
    resetButton.addEventListener('click', () => {
        resetCurrentTab();
        statusMessage.textContent = 'Jogo reiniciado. Selecione um fio e clique em dois terminais para conectar.';
        
        // Resetar botões de seleção de fio
        wireSelectorButtons.forEach(btn => btn.style.border = 'none');
        selectedWireColor = null;
    });
    
    // --- Função para resetar a aba atual ---
    function resetCurrentTab() {
        switch(currentTab) {
            case 'simples':
                simplesCircuit.reset();
                break;
            case 'paralelo':
                paraleloCircuit.reset();
                break;
            case 'intermediario':
                intermediarioCircuit.reset();
                break;
        }
    }
    
    // --- Função para cancelar desenho de fio ---
    function cancelWireDrawing() {
        switch(currentTab) {
            case 'simples':
                simplesCircuit.cancelWireDrawing();
                break;
            case 'paralelo':
                paraleloCircuit.cancelWireDrawing();
                break;
            case 'intermediario':
                intermediarioCircuit.cancelWireDrawing();
                break;
        }
    }
    
    // --- Função para mostrar tooltip ---
    function showTooltip(event, message) {
        tooltip.textContent = message;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        
        // Esconder tooltip após 2 segundos
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 2000);
    }
    
    // --- Adicionar handler para tecla ESC ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelWireDrawing();
        }
    });
    
    // ========== CIRCUITO SIMPLES ==========
    const simplesCircuit = {
        svgLayer: document.getElementById('wiring-layer'),
        gameContainer: document.getElementById('game-container'),
        terminals: document.querySelectorAll('#tab-simples .terminal'),
        lampSvg: document.getElementById('lamp-svg'),
        switchElement: document.getElementById('switch'),
        
        // Estado do circuito simples
        isDrawingWire: false,
        currentPolyline: null,
        currentPoints: [],
        startTerminal: null,
        endTerminal: null,
        connections: [],
        isCircuitComplete: false,
        isSwitchOn: true,
        isLampOn: false,
        
        // Configuração do grid
        gridSize: 10,
        gridVisible: true,
        
        // Inicialização
        init: function() {
            this.initializeGrid();
            this.drawLamp();
            this.setupEventListeners();
        },
        
        // Configurar event listeners
        setupEventListeners: function() {
            // Click nos terminais
            this.terminals.forEach(terminal => {
                terminal.addEventListener('click', (e) => this.handleTerminalClick(e, terminal));
            });
            
            // Click no interruptor
            this.switchElement.addEventListener('click', (e) => this.handleSwitchClick(e));
            
            // Click no container do jogo para desenhar fios
            this.gameContainer.addEventListener('click', (e) => this.handleGameContainerClick(e));
        },
        
        // Inicializar grid
        initializeGrid: function() {
            // Limpar grid existente
            const gridLines = this.svgLayer.querySelectorAll('.grid-line');
            gridLines.forEach(line => line.remove());
            
            if (this.gridVisible) {
                const width = this.gameContainer.clientWidth;
                const height = this.gameContainer.clientHeight;
                
                // Criar linhas verticais
                for (let x = 0; x <= width; x += this.gridSize) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x);
                    line.setAttribute('y1', 0);
                    line.setAttribute('x2', x);
                    line.setAttribute('y2', height);
                    line.setAttribute('stroke', '#ddd');
                    line.setAttribute('stroke-width', '0.5');
                    line.setAttribute('stroke-dasharray', '2,2');
                    line.classList.add('grid-line');
                    this.svgLayer.appendChild(line);
                }
                
                // Criar linhas horizontais
                for (let y = 0; y <= height; y += this.gridSize) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', 0);
                    line.setAttribute('y1', y);
                    line.setAttribute('x2', width);
                    line.setAttribute('y2', y);
                    line.setAttribute('stroke', '#ddd');
                    line.setAttribute('stroke-width', '0.5');
                    line.setAttribute('stroke-dasharray', '2,2');
                    line.classList.add('grid-line');
                    this.svgLayer.appendChild(line);
                }
            }
        },
        
        // Desenhar lâmpada
        drawLamp: function() {
            // Limpar conteúdo existente
            this.lampSvg.innerHTML = '';
            
            // Socket (parte preta)
            const socket = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            socket.setAttribute('d', 'M30,20 L50,20 L45,40 L35,40 Z');
            socket.setAttribute('fill', '#333');
            socket.setAttribute('stroke', '#222');
            socket.setAttribute('stroke-width', '1');
            this.lampSvg.appendChild(socket);
            
            // Base do socket
            const socketBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            socketBase.setAttribute('x', '35');
            socketBase.setAttribute('y', '40');
            socketBase.setAttribute('width', '10');
            socketBase.setAttribute('height', '5');
            socketBase.setAttribute('fill', '#555');
            socketBase.setAttribute('stroke', '#333');
            socketBase.setAttribute('stroke-width', '1');
            this.lampSvg.appendChild(socketBase);
            
            // Vidro da lâmpada
            const bulbGlass = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            bulbGlass.setAttribute('cx', '40');
            bulbGlass.setAttribute('cy', '65');
            bulbGlass.setAttribute('rx', '20');
            bulbGlass.setAttribute('ry', '25');
            bulbGlass.setAttribute('fill', this.isLampOn ? '#ffffc0' : '#f0f0f0');
            bulbGlass.setAttribute('stroke', '#ddd');
            bulbGlass.setAttribute('stroke-width', '1');
            bulbGlass.setAttribute('id', 'bulb-glass');
            this.lampSvg.appendChild(bulbGlass);
            
            // Filamentos
            const filament1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            filament1.setAttribute('d', 'M40,45 C35,50 45,60 40,65');
            filament1.setAttribute('fill', 'none');
            filament1.setAttribute('stroke', this.isLampOn ? '#ffff00' : '#aaa');
            filament1.setAttribute('stroke-width', this.isLampOn ? '2' : '1');
            filament1.setAttribute('id', 'filament1');
            this.lampSvg.appendChild(filament1);
            
            const filament2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            filament2.setAttribute('d', 'M40,45 C45,50 35,60 40,65');
            filament2.setAttribute('fill', 'none');
            filament2.setAttribute('stroke', this.isLampOn ? '#ffff00' : '#aaa');
            filament2.setAttribute('stroke-width', this.isLampOn ? '2' : '1');
            filament2.setAttribute('id', 'filament2');
            this.lampSvg.appendChild(filament2);
            
            // Efeito de brilho quando a lâmpada está acesa
            if (this.isLampOn) {
                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                glow.setAttribute('cx', '40');
                glow.setAttribute('cy', '65');
                glow.setAttribute('rx', '25');
                glow.setAttribute('ry', '30');
                glow.setAttribute('fill', 'rgba(255, 255, 200, 0.5)');
                glow.setAttribute('filter', 'blur(5px)');
                
                // Inserir brilho atrás da lâmpada
                this.lampSvg.insertBefore(glow, bulbGlass);
            }
        },
        
        // Desenhar interruptor
        drawSwitch: function() {
            // Atualizar visual do interruptor baseado no estado
            if (this.isSwitchOn) {
                this.switchElement.classList.remove('switch-off');
                this.switchElement.classList.add('switch-on');
            } else {
                this.switchElement.classList.remove('switch-on');
                this.switchElement.classList.add('switch-off');
            }
            
            // Atualizar estado da lâmpada
            this.updateLampState();
        },
        
        // Atualizar estado da lâmpada
        updateLampState: function() {
            // Lâmpada acesa apenas se circuito estiver completo E interruptor ligado
            this.isLampOn = this.isCircuitComplete && this.isSwitchOn;
            this.drawLamp();
        },
        
        // Handler para click no interruptor
        handleSwitchClick: function(e) {
            // Ignorar clicks nos terminais
            if (e.target.classList.contains('terminal')) {
                return;
            }
            
            // Alternar estado do interruptor
            this.isSwitchOn = !this.isSwitchOn;
            
            // Atualizar visual
            this.drawSwitch();
            
            // Mostrar tooltip
            showTooltip(e, this.getCircuitStateMessage());
            
            // Atualizar mensagem de status
            if (this.isCircuitComplete) {
                statusMessage.textContent = this.isSwitchOn ? 
                    'Interruptor ligado. Lâmpada acesa!' : 
                    'Interruptor desligado. Lâmpada apagada.';
            } else {
                statusMessage.textContent = 'Interruptor ' + (this.isSwitchOn ? 'ligado' : 'desligado') + 
                    ', mas o circuito não está completo.';
            }
        },
        
        // Obter mensagem de estado do circuito
        getCircuitStateMessage: function() {
            if (!this.isCircuitComplete) {
                return 'Circuito desconectado';
            }
            return this.isSwitchOn ? 'Lâmpada acesa' : 'Lâmpada apagada';
        },
        
        // Handler para click nos terminais
        handleTerminalClick: function(e, terminal) {
            if (!selectedWireColor) {
                statusMessage.textContent = 'Erro: Selecione uma cor de fio primeiro!';
                return;
            }
            
            const currentTerminalId = `${terminal.dataset.component}-${terminal.dataset.terminal}`;
            
            // Se já estamos desenhando um fio
            if (this.isDrawingWire) {
                // Verificar se clicamos em um terminal que não é o terminal inicial
                if (terminal !== this.startTerminal) {
                    // Completar o desenho do fio
                    this.endTerminal = terminal;
                    
                    // Adicionar o ponto final (posição do terminal)
                    const gameRect = this.gameContainer.getBoundingClientRect();
                    const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
                    const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
                    
                    this.currentPoints.push(x, y);
                    this.updatePolyline();
                    
                    // Armazenar a conexão
                    const startTerminalId = `${this.startTerminal.dataset.component}-${this.startTerminal.dataset.terminal}`;
                    this.connections.push({
                        id1: startTerminalId,
                        id2: currentTerminalId,
                        color: selectedWireColor,
                        element: this.currentPolyline
                    });
                    
                    statusMessage.textContent = `Conexão ${selectedWireColor} feita entre ${startTerminalId} e ${currentTerminalId}.`;
                    
                    // Resetar estado de desenho
                    this.isDrawingWire = false;
                    this.currentPolyline = null;
                    this.currentPoints = [];
                    this.startTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
                    this.startTerminal = null;
                    this.endTerminal = null;
                    
                    // Verificar conexões
                    this.checkConnections();
                }
                return;
            }
            
            // Iniciar desenho de um novo fio
            this.startTerminal = terminal;
            this.isDrawingWire = true;
            
            // Criar uma nova polyline
            this.currentPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            this.currentPolyline.setAttribute('fill', 'none');
            this.currentPolyline.setAttribute('stroke', selectedWireColor);
            this.currentPolyline.setAttribute('stroke-width', '3');
            this.currentPolyline.setAttribute('stroke-linecap', 'round');
            this.currentPolyline.setAttribute('stroke-linejoin', 'round');
            this.svgLayer.appendChild(this.currentPolyline);
            
            // Adicionar o primeiro ponto (posição do terminal)
            const gameRect = this.gameContainer.getBoundingClientRect();
            const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
            const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
            
            this.currentPoints = [x, y];
            this.updatePolyline();
            
            // Feedback visual
            terminal.style.boxShadow = '0 0 10px yellow';
            
            statusMessage.textContent = `Iniciando conexão do terminal ${currentTerminalId}. Clique nos pontos do grid para desenhar o fio e termine clicando em outro terminal.`;
        },
        
        // Handler para click no container do jogo
        handleGameContainerClick: function(e) {
            // Processar apenas clicks quando estamos desenhando um fio e não clicando em terminais
            if (!this.isDrawingWire || e.target.classList.contains('terminal')) {
                return;
            }
            
            // Obter posição do click relativa ao container do jogo
            const gameRect = this.gameContainer.getBoundingClientRect();
            const x = e.clientX - gameRect.left;
            const y = e.clientY - gameRect.top;
            
            // Alinhar ao grid
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            
            // Adicionar ponto à polyline atual
            this.currentPoints.push(snappedX, snappedY);
            this.updatePolyline();
            
            statusMessage.textContent = `Ponto adicionado (${snappedX}, ${snappedY}). Continue clicando para adicionar mais pontos ou clique em um terminal para finalizar.`;
        },
        
        // Alinhar ao grid
        snapToGrid: function(value) {
            return Math.round(value / this.gridSize) * this.gridSize;
        },
        
        // Atualizar polyline
        updatePolyline: function() {
            if (this.currentPolyline) {
                this.currentPolyline.setAttribute('points', this.currentPoints.join(','));
            }
        },
        
        // Cancelar desenho de fio
        cancelWireDrawing: function() {
            if (this.isDrawingWire && this.currentPolyline) {
                // Remover a polyline do SVG
                this.svgLayer.removeChild(this.currentPolyline);
                
                // Resetar estado de desenho
                this.isDrawingWire = false;
                this.currentPolyline = null;
                this.currentPoints = [];
                
                // Resetar feedback visual
                if (this.startTerminal) {
                    this.startTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
                    this.startTerminal = null;
                }
                
                statusMessage.textContent = `Desenho de fio cancelado. Selecione um terminal para começar novamente.`;
            }
        },
        
        // Verificar conexões
        checkConnections: function() {
            const correctConnections = [
                { t1: 'db-phase', t2: 'switch-phase', color: 'red' },
                { t1: 'db-neutral', t2: 'lamp-neutral', color: 'blue' },
                { t1: 'switch-return', t2: 'lamp-return', color: 'black' }
            ];
            
            if (this.connections.length === correctConnections.length) {
                this.isCircuitComplete = correctConnections.every(correctConn => {
                    return this.connections.some(userConn => 
                        userConn.color === correctConn.color &&
                        (
                            (userConn.id1 === correctConn.t1 && userConn.id2 === correctConn.t2) ||
                            (userConn.id1 === correctConn.t2 && userConn.id2 === correctConn.t1)
                        )
                    );
                });
            } else {
                this.isCircuitComplete = false;
            }
            
            // Atualizar estado da lâmpada
            this.updateLampState();
            
            if (this.isCircuitComplete) {
                if (this.isSwitchOn) {
                    statusMessage.textContent = 'Parabéns! A ligação está correta e a lâmpada acendeu!';
                } else {
                    statusMessage.textContent = 'Ligação correta! Clique no interruptor para acender a lâmpada.';
                }
            }
        },
        
        // Resetar circuito
        reset: function() {
            // Cancelar qualquer desenho de fio em andamento
            this.cancelWireDrawing();
            
            // Limpar linhas SVG
            const wireElements = this.svgLayer.querySelectorAll('polyline:not(.grid-line)');
            wireElements.forEach(el => el.remove());
            
            // Reinicializar grid
            this.initializeGrid();
            
            // Limpar array de conexões
            this.connections = [];
            
            // Resetar variáveis de estado
            this.isCircuitComplete = false;
            this.isSwitchOn = true;
            
            // Resetar lâmpada
            this.updateLampState();
            this.drawSwitch();
            
            // Resetar estilo dos terminais
            this.terminals.forEach(term => term.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)');
        }
    };
    
    // ========== CIRCUITO PARALELO ==========
    const paraleloCircuit = {
        svgLayer: document.getElementById('wiring-layer-paralelo'),
        gameContainer: document.getElementById('game-container-paralelo'),
        terminals: document.querySelectorAll('#tab-paralelo .terminal'),
        lampSvg: document.getElementById('lamp-svg-paralelo'),
        switchElement1: document.getElementById('switch-paralelo-1'),
        switchElement2: document.getElementById('switch-paralelo-2'),
        
        // Estado do circuito paralelo
        isDrawingWire: false,
        currentPolyline: null,
        currentPoints: [],
        startTerminal: null,
        endTerminal: null,
        connections: [],
        isCircuitComplete: false,
        isSwitch1On: true,
        isSwitch2On: true,
        isLampOn: false,
        
        // Configuração do grid
        gridSize: 10,
        gridVisible: true,
        
        // Inicialização
        init: function() {
            this.initializeGrid();
            this.drawLamp();
            this.setupEventListeners();
        },
        
        // Configurar event listeners
        setupEventListeners: function() {
            // Click nos terminais
            this.terminals.forEach(terminal => {
                terminal.addEventListener('click', (e) => this.handleTerminalClick(e, terminal));
            });
            
            // Click nos interruptores
            this.switchElement1.addEventListener('click', (e) => this.handleSwitchClick(e, 1));
            this.switchElement2.addEventListener('click', (e) => this.handleSwitchClick(e, 2));
            
            // Click no container do jogo para desenhar fios
            this.gameContainer.addEventListener('click', (e) => this.handleGameContainerClick(e));
        },
        
        // Inicializar grid
        initializeGrid: function() {
            // Limpar grid existente
            const gridLines = this.svgLayer.querySelectorAll('.grid-line');
            gridLines.forEach(line => line.remove());
            
            if (this.gridVisible) {
                const width = this.gameContainer.clientWidth;
                const height = this.gameContainer.clientHeight;
                
                // Criar linhas verticais
                for (let x = 0; x <= width; x += this.gridSize) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x);
                    line.setAttribute('y1', 0);
                    line.setAttribute('x2', x);
                    line.setAttribute('y2', height);
                    line.setAttribute('stroke', '#ddd');
                    line.setAttribute('stroke-width', '0.5');
                    line.setAttribute('stroke-dasharray', '2,2');
                    line.classList.add('grid-line');
                    this.svgLayer.appendChild(line);
                }
                
                // Criar linhas horizontais
                for (let y = 0; y <= height; y += this.gridSize) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', 0);
                    line.setAttribute('y1', y);
                    line.setAttribute('x2', width);
                    line.setAttribute('y2', y);
                    line.setAttribute('stroke', '#ddd');
                    line.setAttribute('stroke-width', '0.5');
                    line.setAttribute('stroke-dasharray', '2,2');
                    line.classList.add('grid-line');
                    this.svgLayer.appendChild(line);
                }
            }
        },
        
        // Desenhar lâmpada
        drawLamp: function() {
            // Limpar conteúdo existente
            this.lampSvg.innerHTML = '';
            
            // Socket (parte preta)
            const socket = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            socket.setAttribute('d', 'M30,20 L50,20 L45,40 L35,40 Z');
            socket.setAttribute('fill', '#333');
            socket.setAttribute('stroke', '#222');
            socket.setAttribute('stroke-width', '1');
            this.lampSvg.appendChild(socket);
            
            // Base do socket
            const socketBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            socketBase.setAttribute('x', '35');
            socketBase.setAttribute('y', '40');
            socketBase.setAttribute('width', '10');
            socketBase.setAttribute('height', '5');
            socketBase.setAttribute('fill', '#555');
            socketBase.setAttribute('stroke', '#333');
            socketBase.setAttribute('stroke-width', '1');
            this.lampSvg.appendChild(socketBase);
            
            // Vidro da lâmpada
            const bulbGlass = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            bulbGlass.setAttribute('cx', '40');
            bulbGlass.setAttribute('cy', '65');
            bulbGlass.setAttribute('rx', '20');
            bulbGlass.setAttribute('ry', '25');
            bulbGlass.setAttribute('fill', this.isLampOn ? '#ffffc0' : '#f0f0f0');
            bulbGlass.setAttribute('stroke', '#ddd');
            bulbGlass.setAttribute('stroke-width', '1');
            bulbGlass.setAttribute('id', 'bulb-glass-paralelo');
            this.lampSvg.appendChild(bulbGlass);
            
            // Filamentos
            const filament1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            filament1.setAttribute('d', 'M40,45 C35,50 45,60 40,65');
            filament1.setAttribute('fill', 'none');
            filament1.setAttribute('stroke', this.isLampOn ? '#ffff00' : '#aaa');
            filament1.setAttribute('stroke-width', this.isLampOn ? '2' : '1');
            filament1.setAttribute('id', 'filament1-paralelo');
            this.lampSvg.appendChild(filament1);
            
            const filament2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            filament2.setAttribute('d', 'M40,45 C45,50 35,60 40,65');
            filament2.setAttribute('fill', 'none');
            filament2.setAttribute('stroke', this.isLampOn ? '#ffff00' : '#aaa');
            filament2.setAttribute('stroke-width', this.isLampOn ? '2' : '1');
            filament2.setAttribute('id', 'filament2-paralelo');
            this.lampSvg.appendChild(filament2);
            
            // Efeito de brilho quando a lâmpada está acesa
            if (this.isLampOn) {
                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                glow.setAttribute('cx', '40');
                glow.setAttribute('cy', '65');
                glow.setAttribute('rx', '25');
                glow.setAttribute('ry', '30');
                glow.setAttribute('fill', 'rgba(255, 255, 200, 0.5)');
                glow.setAttribute('filter', 'blur(5px)');
                
                // Inserir brilho atrás da lâmpada
                this.lampSvg.insertBefore(glow, bulbGlass);
            }
        },
        
        // Desenhar interruptores
        drawSwitches: function() {
            // Atualizar visual dos interruptores baseado no estado
            if (this.isSwitch1On) {
                this.switchElement1.classList.remove('switch-off');
                this.switchElement1.classList.add('switch-on');
            } else {
                this.switchElement1.classList.remove('switch-on');
                this.switchElement1.classList.add('switch-off');
            }
            
            if (this.isSwitch2On) {
                this.switchElement2.classList.remove('switch-off');
                this.switchElement2.classList.add('switch-on');
            } else {
                this.switchElement2.classList.remove('switch-on');
                this.switchElement2.classList.add('switch-off');
            }
            
            // Atualizar estado da lâmpada
            this.updateLampState();
        },
        
        // Atualizar estado da lâmpada
        updateLampState: function() {
            // Em um circuito paralelo, a lâmpada acende se o circuito estiver completo E pelo menos um dos interruptores estiver ligado
            this.isLampOn = this.isCircuitComplete && (this.isSwitch1On || this.isSwitch2On);
            this.drawLamp();
        },
        
        // Handler para click nos interruptores
        handleSwitchClick: function(e, switchNumber) {
            // Ignorar clicks nos terminais
            if (e.target.classList.contains('terminal')) {
                return;
            }
            
            // Alternar estado do interruptor clicado
            if (switchNumber === 1) {
                this.isSwitch1On = !this.isSwitch1On;
            } else {
                this.isSwitch2On = !this.isSwitch2On;
            }
            
            // Atualizar visual
            this.drawSwitches();
            
            // Mostrar tooltip
            showTooltip(e, this.getCircuitStateMessage());
            
            // Atualizar mensagem de status
            if (this.isCircuitComplete) {
                if (this.isLampOn) {
                    statusMessage.textContent = `Interruptor ${switchNumber} alterado. Lâmpada acesa!`;
                } else {
                    statusMessage.textContent = `Interruptor ${switchNumber} alterado. Lâmpada apagada.`;
                }
            } else {
                statusMessage.textContent = `Interruptor ${switchNumber} alterado, mas o circuito não está completo.`;
            }
        },
        
        // Obter mensagem de estado do circuito
        getCircuitStateMessage: function() {
            if (!this.isCircuitComplete) {
                return 'Circuito desconectado';
            }
            return this.isLampOn ? 'Lâmpada acesa' : 'Lâmpada apagada';
        },
        
        // Handler para click nos terminais
        handleTerminalClick: function(e, terminal) {
            if (!selectedWireColor) {
                statusMessage.textContent = 'Erro: Selecione uma cor de fio primeiro!';
                return;
            }
            
            const currentTerminalId = `${terminal.dataset.component}-${terminal.dataset.terminal}`;
            
            // Se já estamos desenhando um fio
            if (this.isDrawingWire) {
                // Verificar se clicamos em um terminal que não é o terminal inicial
                if (terminal !== this.startTerminal) {
                    // Completar o desenho do fio
                    this.endTerminal = terminal;
                    
                    // Adicionar o ponto final (posição do terminal)
                    const gameRect = this.gameContainer.getBoundingClientRect();
                    const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
                    const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
                    
                    this.currentPoints.push(x, y);
                    this.updatePolyline();
                    
                    // Armazenar a conexão
                    const startTerminalId = `${this.startTerminal.dataset.component}-${this.startTerminal.dataset.terminal}`;
                    this.connections.push({
                        id1: startTerminalId,
                        id2: currentTerminalId,
                        color: selectedWireColor,
                        element: this.currentPolyline
                    });
                    
                    statusMessage.textContent = `Conexão ${selectedWireColor} feita entre ${startTerminalId} e ${currentTerminalId}.`;
                    
                    // Resetar estado de desenho
                    this.isDrawingWire = false;
                    this.currentPolyline = null;
                    this.currentPoints = [];
                    this.startTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
                    this.startTerminal = null;
                    this.endTerminal = null;
                    
                    // Verificar conexões
                    this.checkConnections();
                }
                return;
            }
            
            // Iniciar desenho de um novo fio
            this.startTerminal = terminal;
            this.isDrawingWire = true;
            
            // Criar uma nova polyline
            this.currentPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            this.currentPolyline.setAttribute('fill', 'none');
            this.currentPolyline.setAttribute('stroke', selectedWireColor);
            this.currentPolyline.setAttribute('stroke-width', '3');
            this.currentPolyline.setAttribute('stroke-linecap', 'round');
            this.currentPolyline.setAttribute('stroke-linejoin', 'round');
            this.svgLayer.appendChild(this.currentPolyline);
            
            // Adicionar o primeiro ponto (posição do terminal)
            const gameRect = this.gameContainer.getBoundingClientRect();
            const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
            const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
            
            this.currentPoints = [x, y];
            this.updatePolyline();
            
            // Feedback visual
            terminal.style.boxShadow = '0 0 10px yellow';
            
            statusMessage.textContent = `Iniciando conexão do terminal ${currentTerminalId}. Clique nos pontos do grid para desenhar o fio e termine clicando em outro terminal.`;
        },
        
        // Handler para click no container do jogo
        handleGameContainerClick: function(e) {
            // Processar apenas clicks quando estamos desenhando um fio e não clicando em terminais
            if (!this.isDrawingWire || e.target.classList.contains('terminal')) {
                return;
            }
            
            // Obter posição do click relativa ao container do jogo
            const gameRect = this.gameContainer.getBoundingClientRect();
            const x = e.clientX - gameRect.left;
            const y = e.clientY - gameRect.top;
            
            // Alinhar ao grid
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            
            // Adicionar ponto à polyline atual
            this.currentPoints.push(snappedX, snappedY);
            this.updatePolyline();
            
            statusMessage.textContent = `Ponto adicionado (${snappedX}, ${snappedY}). Continue clicando para adicionar mais pontos ou clique em um terminal para finalizar.`;
        },
        
        // Alinhar ao grid
        snapToGrid: function(value) {
            return Math.round(value / this.gridSize) * this.gridSize;
        },
        
        // Atualizar polyline
        updatePolyline: function() {
            if (this.currentPolyline) {
                this.currentPolyline.setAttribute('points', this.currentPoints.join(','));
            }
        },
        
        // Cancelar desenho de fio
        cancelWireDrawing: function() {
            if (this.isDrawingWire && this.currentPolyline) {
                // Remover a polyline do SVG
                this.svgLayer.removeChild(this.currentPolyline);
                
                // Resetar estado de desenho
                this.isDrawingWire = false;
                this.currentPolyline = null;
                this.currentPoints = [];
                
                // Resetar feedback visual
                if (this.startTerminal) {
                    this.startTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
                    this.startTerminal = null;
                }
                
                statusMessage.textContent = `Desenho de fio cancelado. Selecione um terminal para começar novamente.`;
            }
        },
        
        // Verificar conexões
        checkConnections: function() {
            // Conexões obrigatórias para o circuito paralelo
            const requiredConnections = [
                // Fase do quadro ao borne superior do primeiro interruptor
                { t1: 'db-p-phase', t2: 'switch-p1-top', color: 'red' },
                
                // Neutro do quadro ao neutro da lâmpada
                { t1: 'db-p-neutral', t2: 'lamp-p-neutral', color: 'blue' },
                
                // Borne inferior do segundo interruptor ao retorno da lâmpada
                { t1: 'switch-p2-bottom', t2: 'lamp-p-return', color: 'black' },
                
                // Conexão entre os interruptores pelos bornes do meio
                { t1: 'switch-p1-middle', t2: 'switch-p2-middle', color: 'black' }
            ];
            
            // Verificar se todas as conexões obrigatórias estão presentes
            this.isCircuitComplete = requiredConnections.every(reqConn => {
                return this.connections.some(userConn => 
                    userConn.color === reqConn.color &&
                    (
                        (userConn.id1 === reqConn.t1 && userConn.id2 === reqConn.t2) ||
                        (userConn.id1 === reqConn.t2 && userConn.id2 === reqConn.t1)
                    )
                );
            });
            
            // Atualizar estado da lâmpada
            this.updateLampState();
            
            if (this.isCircuitComplete) {
                if (this.isLampOn) {
                    statusMessage.textContent = 'Parabéns! A ligação do circuito paralelo está correta e a lâmpada acendeu!';
                } else {
                    statusMessage.textContent = 'Ligação do circuito paralelo correta! Clique em um dos interruptores para acender a lâmpada.';
                }
            }
        },
        
        // Resetar circuito
        reset: function() {
            // Cancelar qualquer desenho de fio em andamento
            this.cancelWireDrawing();
            
            // Limpar linhas SVG
            const wireElements = this.svgLayer.querySelectorAll('polyline:not(.grid-line)');
            wireElements.forEach(el => el.remove());
            
            // Reinicializar grid
            this.initializeGrid();
            
            // Limpar array de conexões
            this.connections = [];
            
            // Resetar variáveis de estado
            this.isCircuitComplete = false;
            this.isSwitch1On = true;
            this.isSwitch2On = true;
            
            // Resetar lâmpada e interruptores
            this.updateLampState();
            this.drawSwitches();
            
            // Resetar estilo dos terminais
            this.terminals.forEach(term => term.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)');
        }
    };
    
    // ========== CIRCUITO INTERMEDIÁRIO ==========
    const intermediarioCircuit = {
        // Implementação básica para evitar erros
        reset: function() {
            // Será implementado posteriormente
        },
        cancelWireDrawing: function() {
            // Será implementado posteriormente
        }
    };
    
    // Inicializar os circuitos
    simplesCircuit.init();
    paraleloCircuit.init();
});
