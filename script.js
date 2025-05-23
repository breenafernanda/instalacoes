document.addEventListener('DOMContentLoaded', () => {
    const svgLayer = document.getElementById('wiring-layer');
    const terminals = document.querySelectorAll('.terminal');
    const wireSelectorButtons = document.querySelectorAll('#wire-selector button[data-color]');
    const resetButton = document.getElementById('reset-button');
    const lampBulb = document.getElementById('lamp-bulb');
    const statusMessage = document.getElementById('status-message');
    const gameContainer = document.getElementById('game-container');

    let selectedWireColor = null;
    let firstTerminal = null;
    let connections = []; // Stores { id1: 'comp-term', id2: 'comp-term', color: 'red', element: lineElement }

    // --- Wire Selection --- 
    wireSelectorButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedWireColor = button.getAttribute('data-color');
            statusMessage.textContent = `Fio ${selectedWireColor} selecionado. Clique no primeiro terminal.`;
            firstTerminal = null; // Reset first terminal selection when changing wire
            // Optional: Add visual feedback for selected button
            wireSelectorButtons.forEach(btn => btn.style.border = 'none');
            button.style.border = '2px solid yellow'; 
        });
    });

    // --- Terminal Clicking --- 
    terminals.forEach(terminal => {
        terminal.addEventListener('click', () => {
            if (!selectedWireColor) {
                statusMessage.textContent = 'Erro: Selecione uma cor de fio primeiro!';
                return;
            }

            const currentTerminalId = `${terminal.dataset.component}-${terminal.dataset.terminal}`;

            if (!firstTerminal) {
                // First terminal clicked
                firstTerminal = terminal;
                statusMessage.textContent = `Primeiro terminal (${currentTerminalId}) selecionado. Clique no segundo terminal.`;
                // Optional: Add visual feedback for first selected terminal
                terminal.style.boxShadow = '0 0 10px yellow'; 
            } else {
                // Second terminal clicked
                const firstTerminalId = `${firstTerminal.dataset.component}-${firstTerminal.dataset.terminal}`;
                
                // Clear visual feedback for first terminal
                firstTerminal.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';

                if (firstTerminal === terminal) {
                    // Clicked the same terminal twice
                    statusMessage.textContent = `Seleção cancelada. Fio ${selectedWireColor} ainda selecionado. Clique no primeiro terminal.`;
                    firstTerminal = null;
                    return;
                }

                // Check if connection already exists (in either direction)
                const connectionExists = connections.some(conn => 
                    (conn.id1 === firstTerminalId && conn.id2 === currentTerminalId) ||
                    (conn.id1 === currentTerminalId && conn.id2 === firstTerminalId)
                );

                if (connectionExists) {
                    statusMessage.textContent = 'Erro: Já existe uma conexão entre esses terminais.';
                    firstTerminal = null;
                    return;
                }

                // Draw the wire
                const line = drawWire(firstTerminal, terminal, selectedWireColor);
                
                // Store the connection
                connections.push({
                    id1: firstTerminalId,
                    id2: currentTerminalId,
                    color: selectedWireColor,
                    element: line
                });

                statusMessage.textContent = `Conexão ${selectedWireColor} feita entre ${firstTerminalId} e ${currentTerminalId}.`;
                
                // Reset for next connection
                firstTerminal = null;
                // Keep wire color selected

                // Check connections after drawing
                checkConnections(); 
            }
        });
    });

    // --- Drawing Wires --- 
    function drawWire(term1, term2, color) {
        const rect = svgLayer.getBoundingClientRect();
        const gameRect = gameContainer.getBoundingClientRect();

        // Calculate coordinates relative to the SVG container
        const x1 = term1.getBoundingClientRect().left - gameRect.left + term1.offsetWidth / 2;
        const y1 = term1.getBoundingClientRect().top - gameRect.top + term1.offsetHeight / 2;
        const x2 = term2.getBoundingClientRect().left - gameRect.left + term2.offsetWidth / 2;
        const y2 = term2.getBoundingClientRect().top - gameRect.top + term2.offsetHeight / 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        svgLayer.appendChild(line);
        return line;
    }

    // --- Connection Verification --- 
    function checkConnections() {
        const correctConnections = [
            { t1: 'db-phase', t2: 'switch-phase', color: 'red' },
            { t1: 'db-neutral', t2: 'lamp-neutral', color: 'blue' },
            { t1: 'switch-return', t2: 'lamp-return', color: 'black' }
        ];

        let correctCount = 0;
        let isCorrect = false;

        if (connections.length === correctConnections.length) {
            isCorrect = correctConnections.every(correctConn => {
                return connections.some(userConn => 
                    userConn.color === correctConn.color &&
                    (
                        (userConn.id1 === correctConn.t1 && userConn.id2 === correctConn.t2) ||
                        (userConn.id1 === correctConn.t2 && userConn.id2 === correctConn.t1)
                    )
                );
            });
        }

        if (isCorrect) {
            lampBulb.classList.remove('lamp-off');
            lampBulb.classList.add('lamp-on');
            statusMessage.textContent = 'Parabéns! A ligação está correta e a lâmpada acendeu!';
        } else {
            lampBulb.classList.remove('lamp-on');
            lampBulb.classList.add('lamp-off');
            // Provide more specific feedback if needed, or keep the last connection message
            // statusMessage.textContent = 'Ligação incorreta. Verifique as conexões.'; 
        }
    }

    // --- Reset Button --- 
    resetButton.addEventListener('click', () => {
        // Clear SVG lines
        while (svgLayer.firstChild) {
            svgLayer.removeChild(svgLayer.firstChild);
        }
        // Clear connections array
        connections = [];
        // Reset state variables
        selectedWireColor = null;
        firstTerminal = null;
        // Reset lamp
        lampBulb.classList.remove('lamp-on');
        lampBulb.classList.add('lamp-off');
        // Reset status message
        statusMessage.textContent = 'Jogo reiniciado. Selecione um fio e clique em dois terminais para conectar.';
        // Reset button styles
        wireSelectorButtons.forEach(btn => btn.style.border = 'none');
        terminals.forEach(term => term.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)');
    });

});
