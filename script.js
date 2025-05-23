document.addEventListener('DOMContentLoaded', () => {
    const svgLayer = document.getElementById('wiring-layer');
    const terminals = document.querySelectorAll('.terminal');
    const wireSelectorButtons = document.querySelectorAll('#wire-selector button[data-color]');
    const resetButton = document.getElementById('reset-button');
    const statusMessage = document.getElementById('status-message');
    const gameContainer = document.getElementById('game-container');
    const lampSvg = document.getElementById('lamp-svg');
    const switchElement = document.getElementById('switch');

    let selectedWireColor = null;
    let firstTerminal = null;
    let connections = []; // Stores { id1: 'comp-term', id2: 'comp-term', color: 'red', element: polylineElement }
    
    // Separate states for circuit and switch
    let isCircuitComplete = false; // Whether all connections are correct
    let isSwitchOn = true; // Whether the switch is in ON position
    let isLampOn = false; // Actual lamp state (depends on both circuit and switch)
    
    // Grid configuration
    const gridSize = 10; // Size of grid cells in pixels
    const gridVisible = true; // Set to true for debugging
    
    // Polyline drawing state
    let isDrawingWire = false;
    let currentPolyline = null;
    let currentPoints = [];
    let currentWireColor = null;
    let startTerminal = null;
    let endTerminal = null;
    
    // Tooltip element for circuit state
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // --- Initialize Grid ---
    function initializeGrid() {
        // Clear existing grid
        const gridLines = svgLayer.querySelectorAll('.grid-line');
        gridLines.forEach(line => line.remove());
        
        if (gridVisible) {
            // Create grid lines for debugging
            const width = gameContainer.clientWidth;
            const height = gameContainer.clientHeight;
            
            // Create vertical lines
            for (let x = 0; x <= width; x += gridSize) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', 0);
                line.setAttribute('x2', x);
                line.setAttribute('y2', height);
                line.setAttribute('stroke', '#ddd');
                line.setAttribute('stroke-width', '0.5');
                line.setAttribute('stroke-dasharray', '2,2');
                line.classList.add('grid-line');
                svgLayer.appendChild(line);
            }
            
            // Create horizontal lines
            for (let y = 0; y <= height; y += gridSize) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', 0);
                line.setAttribute('y1', y);
                line.setAttribute('x2', width);
                line.setAttribute('y2', y);
                line.setAttribute('stroke', '#ddd');
                line.setAttribute('stroke-width', '0.5');
                line.setAttribute('stroke-dasharray', '2,2');
                line.classList.add('grid-line');
                svgLayer.appendChild(line);
            }
        }
    }
    
    // --- Snap to Grid ---
    function snapToGrid(value) {
        return Math.round(value / gridSize) * gridSize;
    }

    // --- Draw Lamp using SVG ---
    function drawLamp() {
        // Clear existing content
        lampSvg.innerHTML = '';
        
        // Create SVG elements for lamp
        // Socket (black part)
        const socket = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        socket.setAttribute('d', 'M30,20 L50,20 L45,40 L35,40 Z');
        socket.setAttribute('fill', '#333');
        socket.setAttribute('stroke', '#222');
        socket.setAttribute('stroke-width', '1');
        lampSvg.appendChild(socket);
        
        // Socket base (small connector)
        const socketBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        socketBase.setAttribute('x', '35');
        socketBase.setAttribute('y', '40');
        socketBase.setAttribute('width', '10');
        socketBase.setAttribute('height', '5');
        socketBase.setAttribute('fill', '#555');
        socketBase.setAttribute('stroke', '#333');
        socketBase.setAttribute('stroke-width', '1');
        lampSvg.appendChild(socketBase);
        
        // Bulb glass
        const bulbGlass = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        bulbGlass.setAttribute('cx', '40');
        bulbGlass.setAttribute('cy', '65');
        bulbGlass.setAttribute('rx', '20');
        bulbGlass.setAttribute('ry', '25');
        bulbGlass.setAttribute('fill', isLampOn ? '#ffffc0' : '#f0f0f0');
        bulbGlass.setAttribute('stroke', '#ddd');
        bulbGlass.setAttribute('stroke-width', '1');
        bulbGlass.setAttribute('id', 'bulb-glass');
        lampSvg.appendChild(bulbGlass);
        
        // Filament
        const filament1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        filament1.setAttribute('d', 'M40,45 C35,50 45,60 40,65');
        filament1.setAttribute('fill', 'none');
        filament1.setAttribute('stroke', isLampOn ? '#ffff00' : '#aaa');
        filament1.setAttribute('stroke-width', isLampOn ? '2' : '1');
        filament1.setAttribute('id', 'filament1');
        lampSvg.appendChild(filament1);
        
        const filament2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        filament2.setAttribute('d', 'M40,45 C45,50 35,60 40,65');
        filament2.setAttribute('fill', 'none');
        filament2.setAttribute('stroke', isLampOn ? '#ffff00' : '#aaa');
        filament2.setAttribute('stroke-width', isLampOn ? '2' : '1');
        filament2.setAttribute('id', 'filament2');
        lampSvg.appendChild(filament2);
        
        // Glow effect when lamp is on
        if (isLampOn) {
            const glow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            glow.setAttribute('cx', '40');
            glow.setAttribute('cy', '65');
            glow.setAttribute('rx', '25');
            glow.setAttribute('ry', '30');
            glow.setAttribute('fill', 'rgba(255, 255, 200, 0.5)');
            glow.setAttribute('filter', 'blur(5px)');
            
            // Insert glow behind the bulb
            lampSvg.insertBefore(glow, bulbGlass);
        }
    }
    
    // --- Draw Switch ---
    function drawSwitch() {
        // Update switch visual based on state
        if (isSwitchOn) {
            switchElement.classList.remove('switch-off');
            switchElement.classList.add('switch-on');
        } else {
            switchElement.classList.remove('switch-on');
            switchElement.classList.add('switch-off');
        }
        
        // Update lamp state based on both circuit and switch
        updateLampState();
    }
    
    // --- Update Lamp State ---
    function updateLampState() {
        // Lamp is on only if circuit is complete AND switch is on
        isLampOn = isCircuitComplete && isSwitchOn;
        drawLamp();
    }
    
    // --- Initial drawings ---
    initializeGrid();
    drawLamp();
    drawSwitch();

    // --- Switch Click Handler ---
    switchElement.addEventListener('click', (e) => {
        // Ignore clicks on terminals
        if (e.target.classList.contains('terminal')) {
            return;
        }
        
        // Toggle switch state
        isSwitchOn = !isSwitchOn;
        
        // Update visuals
        drawSwitch();
        
        // Show tooltip
        showTooltip(e, getCircuitStateMessage());
        
        // Update status message
        if (isCircuitComplete) {
            statusMessage.textContent = isSwitchOn ? 
                'Interruptor ligado. Lâmpada acesa!' : 
                'Interruptor desligado. Lâmpada apagada.';
        } else {
            statusMessage.textContent = 'Interruptor ' + (isSwitchOn ? 'ligado' : 'desligado') + 
                ', mas o circuito não está completo.';
        }
    });
    
    // --- Tooltip Functions ---
    function showTooltip(event, message) {
        tooltip.textContent = message;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        
        // Hide tooltip after 2 seconds
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 2000);
    }
    
    function getCircuitStateMessage() {
        if (!isCircuitComplete) {
            return 'Circuito desconectado';
        }
        return isSwitchOn ? 'Lâmpada acesa' : 'Lâmpada apagada';
    }

    // --- Wire Selection --- 
    wireSelectorButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedWireColor = button.getAttribute('data-color');
            statusMessage.textContent = `Fio ${selectedWireColor} selecionado. Clique no primeiro terminal.`;
            firstTerminal = null; // Reset first terminal selection when changing wire
            // Visual feedback for selected button
            wireSelectorButtons.forEach(btn => btn.style.border = 'none');
            button.style.border = '2px solid yellow'; 
            
            // Cancel any ongoing wire drawing
            cancelWireDrawing();
        });
    });

    // --- Terminal Clicking --- 
    terminals.forEach(terminal => {
        terminal.addEventListener('click', (e) => {
            if (!selectedWireColor) {
                statusMessage.textContent = 'Erro: Selecione uma cor de fio primeiro!';
                return;
            }

            const currentTerminalId = `${terminal.dataset.component}-${terminal.dataset.terminal}`;

            // If we're already drawing a wire
            if (isDrawingWire) {
                // Check if we clicked on a terminal that's not the start terminal
                if (terminal !== startTerminal) {
                    // Complete the wire drawing
                    endTerminal = terminal;
                    
                    // Add the final point (terminal position)
                    const gameRect = gameContainer.getBoundingClientRect();
                    const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
                    const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
                    
                    currentPoints.push(x, y);
                    updatePolyline();
                    
                    // Store the connection
                    const startTerminalId = `${startTerminal.dataset.component}-${startTerminal.dataset.terminal}`;
                    connections.push({
                        id1: startTerminalId,
                        id2: currentTerminalId,
                        color: currentWireColor,
                        element: currentPolyline
                    });
                    
                    statusMessage.textContent = `Conexão ${currentWireColor} feita entre ${startTerminalId} e ${currentTerminalId}.`;
                    
                    // Reset drawing state
                    isDrawingWire = false;
                    currentPolyline = null;
                    currentPoints = [];
                    startTerminal = null;
                    endTerminal = null;
                    
                    // Check connections
                    checkConnections();
                }
                return;
            }

            // Start drawing a new wire
            startTerminal = terminal;
            currentWireColor = selectedWireColor;
            isDrawingWire = true;
            
            // Create a new polyline
            currentPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            currentPolyline.setAttribute('fill', 'none');
            currentPolyline.setAttribute('stroke', currentWireColor);
            currentPolyline.setAttribute('stroke-width', '3');
            currentPolyline.setAttribute('stroke-linecap', 'round');
            currentPolyline.setAttribute('stroke-linejoin', 'round');
            svgLayer.appendChild(currentPolyline);
            
            // Add the first point (terminal position)
            const gameRect = gameContainer.getBoundingClientRect();
            const x = terminal.getBoundingClientRect().left - gameRect.left + terminal.offsetWidth / 2;
            const y = terminal.getBoundingClientRect().top - gameRect.top + terminal.offsetHeight / 2;
            
            currentPoints = [x, y];
            updatePolyline();
            
            // Visual feedback
            terminal.style.boxShadow = '0 0 10px yellow';
            
            statusMessage.textContent = `Iniciando conexão do terminal ${currentTerminalId}. Clique nos pontos do grid para desenhar o fio e termine clicando em outro terminal.`;
        });
    });
    
    // --- Game Container Click for Wire Drawing ---
    gameContainer.addEventListener('click', (e) => {
        // Only process clicks when drawing a wire and not clicking on terminals
        if (!isDrawingWire || e.target.classList.contains('terminal')) {
            return;
        }
        
        // Get click position relative to game container
        const gameRect = gameContainer.getBoundingClientRect();
        const x = e.clientX - gameRect.left;
        const y = e.clientY - gameRect.top;
        
        // Snap to grid
        const snappedX = snapToGrid(x);
        const snappedY = snapToGrid(y);
        
        // Add point to current polyline
        currentPoints.push(snappedX, snappedY);
        updatePolyline();
        
        statusMessage.textContent = `Ponto adicionado (${snappedX}, ${snappedY}). Continue clicando para adicionar mais pontos ou clique em um terminal para finalizar.`;
    });
    
    // --- Update Polyline ---
    function updatePolyline() {
        if (currentPolyline) {
            currentPolyline.setAttribute('points', currentPoints.join(','));
        }
    }
    
    // --- Cancel Wire Drawing ---
    function cancelWireDrawing() {
        if (isDrawingWire && currentPolyline) {
            // Remove the polyline from SVG
            svgLayer.removeChild(currentPolyline);
            
            // Reset drawing state
            isDrawingWire = false;
            currentPolyline = null;
            currentPoints = [];
            
            // Reset visual feedback
            if (startTerminal) {
                startTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
                startTerminal = null;
            }
            
            statusMessage.textContent = `Desenho de fio cancelado. Selecione um terminal para começar novamente.`;
        }
    }
    
    // Add key handler for Escape to cancel wire drawing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelWireDrawing();
        }
    });

    // --- Connection Verification --- 
    function checkConnections() {
        const correctConnections = [
            { t1: 'db-phase', t2: 'switch-phase', color: 'red' },
            { t1: 'db-neutral', t2: 'lamp-neutral', color: 'blue' },
            { t1: 'switch-return', t2: 'lamp-return', color: 'black' }
        ];

        if (connections.length === correctConnections.length) {
            isCircuitComplete = correctConnections.every(correctConn => {
                return connections.some(userConn => 
                    userConn.color === correctConn.color &&
                    (
                        (userConn.id1 === correctConn.t1 && userConn.id2 === correctConn.t2) ||
                        (userConn.id1 === correctConn.t2 && userConn.id2 === correctConn.t1)
                    )
                );
            });
        } else {
            isCircuitComplete = false;
        }

        // Update lamp state based on circuit and switch
        updateLampState();
        
        if (isCircuitComplete) {
            if (isSwitchOn) {
                statusMessage.textContent = 'Parabéns! A ligação está correta e a lâmpada acendeu!';
            } else {
                statusMessage.textContent = 'Ligação correta! Clique no interruptor para acender a lâmpada.';
            }
        }
    }

    // --- Reset Button --- 
    resetButton.addEventListener('click', () => {
        // Cancel any ongoing wire drawing
        cancelWireDrawing();
        
        // Clear SVG lines
        const wireElements = svgLayer.querySelectorAll('polyline:not(.grid-line)');
        wireElements.forEach(el => el.remove());
        
        // Reinitialize grid
        initializeGrid();
        
        // Clear connections array
        connections = [];
        
        // Reset state variables
        selectedWireColor = null;
        firstTerminal = null;
        isCircuitComplete = false;
        isSwitchOn = true;
        
        // Reset lamp
        updateLampState();
        drawSwitch();
        
        // Reset status message
        statusMessage.textContent = 'Jogo reiniciado. Selecione um fio e clique em dois terminais para conectar.';
        
        // Reset button styles
        wireSelectorButtons.forEach(btn => btn.style.border = 'none');
        terminals.forEach(term => term.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)');
    });

});
