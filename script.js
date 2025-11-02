// Maintenance Log System with Local File Storage
let maintenanceLogs = [];
let currentUser = { email: 'user@company.com' };

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('App starting...');
    initApp();
});

function initApp() {
    console.log('App initialized');
    showMainApp();
    setupEventListeners();
    loadMaintenanceLogs();
}

function showMainApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
    showView('dashboard');
}

// Event Listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMainApp();
        });
    }

    // Maintenance form
    const maintenanceForm = document.getElementById('maintenance-form');
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createMaintenanceLog();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', displayMaintenanceLogs);
    }
}

// Navigation
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    if (viewName === 'logs') {
        loadMaintenanceLogs();
    }
}

// Materials Management
function addMaterial() {
    const container = document.getElementById('materials-container');
    if (!container) return;
    
    const newRow = document.createElement('div');
    newRow.className = 'material-row';
    newRow.innerHTML = `
        <input type="text" placeholder="Material Name" class="material-name">
        <input type="number" placeholder="Qty Needed" class="material-qty-needed">
        <input type="number" placeholder="Qty Available" class="material-qty-available">
        <button type="button" onclick="removeMaterial(this)">Remove</button>
    `;
    container.appendChild(newRow);
}

function removeMaterial(button) {
    if (button && button.parentElement) {
        button.parentElement.remove();
    }
}

function toggleExternalRepair() {
    const externalFields = document.getElementById('external-repair-fields');
    const checkbox = document.getElementById('needs-external-repair');
    
    if (externalFields && checkbox) {
        externalFields.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Create Maintenance Log (LOCAL STORAGE - NO FIREBASE)
async function createMaintenanceLog() {
    console.log('Creating maintenance log...');
    
    // Get file inputs
    const machineImageFile = document.getElementById('machine-image')?.files[0];
    const quotationFile = document.getElementById('quotation-file')?.files[0];
    
    let imageData = null;
    let quotationData = null;

    // Convert files to base64 for local storage
    if (machineImageFile) {
        imageData = await fileToBase64(machineImageFile);
    }
    if (quotationFile) {
        quotationData = await fileToBase64(quotationFile);
    }

    const formData = {
        machine_name: document.getElementById('machine-name')?.value || '',
        machine_section: document.getElementById('machine-section')?.value || '',
        machine_details: document.getElementById('machine-details')?.value || '',
        sub_part_area: document.getElementById('sub-part-area')?.value || '',
        operator_name: document.getElementById('operator-name')?.value || '',
        maintenance_staff: document.getElementById('maintenance-staff')?.value || '',
        duration_hours: parseFloat(document.getElementById('duration-hours')?.value) || 0,
        description: document.getElementById('description')?.value || '',
        needs_external_repair: document.getElementById('needs-external-repair')?.checked || false,
        vendor_name: document.getElementById('vendor-name')?.value || '',
        external_duration_days: parseInt(document.getElementById('external-duration-days')?.value) || 0,
        materials: getMaterialsData(),
        image_data: imageData, // Store base64 data directly
        quotation_data: quotationData, // Store base64 data directly
        image_filename: machineImageFile?.name || null,
        quotation_filename: quotationFile?.name || null,
        created_at: new Date().toISOString(),
        created_by: currentUser.email
    };

    // Validate required fields
    if (!formData.machine_name || !formData.machine_section || !formData.sub_part_area) {
        alert('Please fill in all required fields: Machine Name, Section, and Sub-part Area');
        return;
    }

    try {
        // Save to localStorage
        saveToLocalStorage(formData);
        
        // Show success message
        let successMsg = 'Maintenance log created successfully!';
        if (machineImageFile) successMsg += ' Image saved.';
        if (quotationFile) successMsg += ' Quotation saved.';
        
        alert(successMsg);
        
        // Reset form
        document.getElementById('maintenance-form').reset();
        document.getElementById('materials-container').innerHTML = '<div class="material-row"><input type="text" placeholder="Material Name" class="material-name"><input type="number" placeholder="Qty Needed" class="material-qty-needed"><input type="number" placeholder="Qty Available" class="material-qty-available"><button type="button" onclick="removeMaterial(this)">Remove</button></div>';
        
        // Show dashboard and reload logs
        showView('dashboard');
        loadMaintenanceLogs();
        
    } catch (error) {
        console.error('Error creating log:', error);
        alert('Error creating maintenance log: ' + error.message);
    }
}

// Convert file to Base64 for local storage
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Save to localStorage
function saveToLocalStorage(formData) {
    const logs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
    const newLog = {
        id: Date.now().toString(),
        ...formData
    };
    logs.unshift(newLog); // Add to beginning
    localStorage.setItem('maintenanceLogs', JSON.stringify(logs));
    console.log('Saved to localStorage:', newLog);
}

function getMaterialsData() {
    const materials = [];
    document.querySelectorAll('.material-row').forEach(row => {
        const name = row.querySelector('.material-name')?.value;
        const needed = row.querySelector('.material-qty-needed')?.value;
        const available = row.querySelector('.material-qty-available')?.value;
        
        if (name && needed) {
            materials.push({
                name,
                quantity_needed: parseInt(needed) || 0,
                quantity_available: parseInt(available) || 0
            });
        }
    });
    return materials;
}

// Load logs from localStorage
function loadMaintenanceLogs() {
    try {
        maintenanceLogs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
        console.log('Loaded logs from localStorage:', maintenanceLogs.length);
        displayMaintenanceLogs();
    } catch (error) {
        console.error('Error loading logs:', error);
        maintenanceLogs = [];
        displayMaintenanceLogs();
    }
}

function displayMaintenanceLogs() {
    const container = document.getElementById('logs-list');
    if (!container) {
        console.error('logs-list container not found!');
        return;
    }
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    const filteredLogs = maintenanceLogs.filter(log => 
        (log.machine_name && log.machine_name.toLowerCase().includes(searchTerm)) ||
        (log.operator_name && log.operator_name.toLowerCase().includes(searchTerm)) ||
        (log.machine_section && log.machine_section.toLowerCase().includes(searchTerm)) ||
        (log.sub_part_area && log.sub_part_area.toLowerCase().includes(searchTerm))
    );

    console.log('Displaying logs:', filteredLogs.length);
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<p>No maintenance logs found. Create your first log!</p>';
        return;
    }

    container.innerHTML = filteredLogs.map(log => `
        <div class="log-card">
            <div class="card-header">
                <h3>${log.machine_name || 'No Name'}</h3>
                <div class="card-actions">
                    <button onclick="editLog('${log.id}')">Edit</button>
                    <button onclick="deleteLog('${log.id}')">Delete</button>
                </div>
            </div>
            <div class="card-content">
                <p><strong>Section:</strong> ${log.machine_section || 'N/A'}</p>
                <p><strong>Sub-part:</strong> ${log.sub_part_area || 'N/A'}</p>
                <p><strong>Operator:</strong> ${log.operator_name || 'N/A'}</p>
                <p><strong>Maintenance Staff:</strong> ${log.maintenance_staff || 'N/A'}</p>
                <p><strong>Duration:</strong> ${log.duration_hours || 0} hours</p>
                <p><strong>Description:</strong> ${log.description || 'N/A'}</p>
                
                ${log.image_data ? `
                    <div>
                        <strong>Machine Image:</strong>
                        <br>
                        <img src="${log.image_data}" alt="Machine Image" style="max-width: 200px; max-height: 200px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <br>
                        <small>${log.image_filename || 'Image'}</small>
                    </div>
                ` : ''}
                
                ${log.materials && log.materials.length > 0 ? `
                    <div>
                        <strong>Materials:</strong>
                        <ul>
                            ${log.materials.map(mat => `
                                <li>${mat.name}: ${mat.quantity_needed} needed, ${mat.quantity_available} available</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${log.needs_external_repair ? `
                    <div>
                        <strong>External Repair:</strong>
                        <p>Vendor: ${log.vendor_name || 'N/A'}</p>
                        <p>Duration: ${log.external_duration_days || 'N/A'} days</p>
                        ${log.quotation_data ? `
                            <p>
                                <a href="${log.quotation_data}" download="${log.quotation_filename || 'quotation'}" style="color: #3498db; text-decoration: none;">
                                    📄 Download Quotation File
                                </a>
                            </p>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <small>Created: ${new Date(log.created_at).toLocaleDateString()} by ${log.created_by || 'User'}</small>
            </div>
        </div>
    `).join('');
}

function editLog(id) {
    const log = maintenanceLogs.find(log => log.id === id);
    if (log) {
        // Populate form with log data
        document.getElementById('machine-name').value = log.machine_name || '';
        document.getElementById('machine-section').value = log.machine_section || '';
        document.getElementById('machine-details').value = log.machine_details || '';
        document.getElementById('sub-part-area').value = log.sub_part_area || '';
        document.getElementById('operator-name').value = log.operator_name || '';
        document.getElementById('maintenance-staff').value = log.maintenance_staff || '';
        document.getElementById('duration-hours').value = log.duration_hours || '';
        document.getElementById('description').value = log.description || '';
        
        const needsExternalRepair = document.getElementById('needs-external-repair');
        needsExternalRepair.checked = log.needs_external_repair || false;
        
        document.getElementById('vendor-name').value = log.vendor_name || '';
        document.getElementById('external-duration-days').value = log.external_duration_days || '';
        
        // Populate materials
        document.getElementById('materials-container').innerHTML = '';
        if (log.materials && log.materials.length > 0) {
            log.materials.forEach(material => {
                addMaterial();
                const rows = document.querySelectorAll('.material-row');
                const lastRow = rows[rows.length - 1];
                lastRow.querySelector('.material-name').value = material.name || '';
                lastRow.querySelector('.material-qty-needed').value = material.quantity_needed || '';
                lastRow.querySelector('.material-qty-available').value = material.quantity_available || '';
            });
        } else {
            addMaterial();
        }
        
        toggleExternalRepair();
        showView('new-log');
        
        // Store the ID for update
        document.getElementById('maintenance-form').dataset.editingId = id;
    } else {
        alert('Log not found!');
    }
}

function deleteLog(id) {
    if (confirm('Are you sure you want to delete this maintenance log?')) {
        maintenanceLogs = maintenanceLogs.filter(log => log.id !== id);
        localStorage.setItem('maintenanceLogs', JSON.stringify(maintenanceLogs));
        loadMaintenanceLogs();
        alert('Maintenance log deleted successfully!');
    }
}

// Export functionality
function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Excel export library not loaded.');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(maintenanceLogs.map(log => ({
        'Machine Name': log.machine_name,
        'Section': log.machine_section,
        'Sub-part Area': log.sub_part_area,
        'Operator': log.operator_name,
        'Maintenance Staff': log.maintenance_staff,
        'Duration (Hours)': log.duration_hours,
        'Description': log.description,
        'External Repair': log.needs_external_repair ? 'Yes' : 'No',
        'Vendor Name': log.vendor_name,
        'External Duration (Days)': log.external_duration_days || '',
        'Image File': log.image_filename || '',
        'Quotation File': log.quotation_filename || '',
        'Created Date': new Date(log.created_at).toLocaleDateString(),
        'Created By': log.created_by
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Logs');
    XLSX.writeFile(wb, `maintenance-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
    if (typeof jspdf === 'undefined') {
        alert('PDF export library not loaded.');
        return;
    }

    const doc = new jspdf.jsPDF();
    
    doc.text('Maintenance Logs Report', 14, 15);
    doc.text(`Generated by: ${currentUser.email}`, 14, 22);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 29);
    
    const tableData = maintenanceLogs.map(log => [
        log.machine_name || 'N/A',
        log.machine_section || 'N/A',
        log.sub_part_area || 'N/A',
        log.operator_name || 'N/A',
        log.duration_hours || 0,
        log.needs_external_repair ? 'Yes' : 'No',
        new Date(log.created_at).toLocaleDateString()
    ]);
    
    doc.autoTable({
        head: [['Machine', 'Section', 'Sub-part', 'Operator', 'Duration (h)', 'External', 'Date']],
        body: tableData,
        startY: 35,
    });
    
    doc.save(`maintenance-logs-${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportAllData() {
    exportToExcel();
}

function logout() {
    showLogin();
}
