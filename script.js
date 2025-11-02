// Global Firebase variables
let db = window.firestore;
let storage = window.storage;

// App State
let maintenanceLogs = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('App starting...');
    
    // Wait a bit for Firebase to load
    setTimeout(() => {
        if (window.firestore) {
            db = window.firestore;
            storage = window.storage;
            console.log('✅ Firebase loaded successfully');
        } else {
            console.log('❌ Firebase not loaded - check your configuration');
        }
        
        initApp();
    }, 1000);
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
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMainApp();
        });
    }

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

// File Upload
async function uploadFile(file, folder) {
    if (!file || !storage) {
        console.log('Storage not available');
        return null;
    }
    
    try {
        const fileName = `${folder}/${Date.now()}_${file.name}`;
        const storageRef = storage.ref().child(fileName);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
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

// Create Maintenance Log
async function createMaintenanceLog() {
    const machineImageFile = document.getElementById('machine-image')?.files[0];
    const quotationFile = document.getElementById('quotation-file')?.files[0];
    
    let imageUrl = null;
    let quotationUrl = null;

    // Upload files
    if (storage) {
        if (machineImageFile) {
            imageUrl = await uploadFile(machineImageFile, 'machine-images');
        }
        if (quotationFile) {
            quotationUrl = await uploadFile(quotationFile, 'quotations');
        }
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
        image_url: imageUrl,
        quotation_url: quotationUrl,
        created_at: new Date().toISOString(),
        created_by: 'User'
    };

    // Validate
    if (!formData.machine_name || !formData.machine_section || !formData.sub_part_area) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        if (!db) {
            throw new Error('Database not connected');
        }

        // Save to Firebase
        await db.collection('maintenance_logs').add(formData);
        
        alert('Maintenance log saved successfully!');
        document.getElementById('maintenance-form').reset();
        showView('dashboard');
        loadMaintenanceLogs();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving: ' + error.message);
    }
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

// Load logs
async function loadMaintenanceLogs() {
    try {
        if (db) {
            const snapshot = await db.collection('maintenance_logs')
                .orderBy('created_at', 'desc')
                .get();
            
            maintenanceLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded logs:', maintenanceLogs.length);
        } else {
            maintenanceLogs = [];
        }
        
        displayMaintenanceLogs();
    } catch (error) {
        console.error('Load error:', error);
        maintenanceLogs = [];
        displayMaintenanceLogs();
    }
}

function displayMaintenanceLogs() {
    const container = document.getElementById('logs-list');
    if (!container) return;
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    const filteredLogs = maintenanceLogs.filter(log => 
        (log.machine_name && log.machine_name.toLowerCase().includes(searchTerm)) ||
        (log.operator_name && log.operator_name.toLowerCase().includes(searchTerm)) ||
        (log.machine_section && log.machine_section.toLowerCase().includes(searchTerm)) ||
        (log.sub_part_area && log.sub_part_area.toLowerCase().includes(searchTerm))
    );

    if (filteredLogs.length === 0) {
        container.innerHTML = '<p>No maintenance logs found.</p>';
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
                
                ${log.image_url ? `
                    <div>
                        <strong>Machine Image:</strong>
                        <br>
                        <img src="${log.image_url}" alt="Machine Image" style="max-width: 200px; max-height: 200px; margin-top: 10px; border: 1px solid #ddd;">
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
                        ${log.quotation_url ? `
                            <p><a href="${log.quotation_url}" target="_blank">View Quotation</a></p>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <small>Created: ${new Date(log.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');
}

async function deleteLog(id) {
    if (confirm('Delete this log?')) {
        try {
            if (db) {
                await db.collection('maintenance_logs').doc(id).delete();
            }
            maintenanceLogs = maintenanceLogs.filter(log => log.id !== id);
            loadMaintenanceLogs();
            alert('Deleted successfully!');
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
}

// Export functions (keep your existing ones)
function exportToExcel() {
    // Your existing export code
}

function exportToPDF() {
    // Your existing export code
}

function exportAllData() {
    exportToExcel();
}

function logout() {
    showLogin();
}
