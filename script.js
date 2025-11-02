// Google Drive Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXeoLkRkWmoRkTGddNXDanLbRqCjZ8eRtbAoGiNb9ErVmQD_fDn0vP9wYKKKaOTSlg6A/exec';

// App State
let maintenanceLogs = [];
let currentUser = { email: 'user@company.com' };

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('App starting...');
    initApp();
});

async function initApp() {
    console.log('App initialized - Google Drive Storage');
    showMainApp();
    setupEventListeners();
    await loadMaintenanceLogs();
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
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showMainApp();
        });
    }

    const maintenanceForm = document.getElementById('maintenance-form');
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createMaintenanceLog();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', displayMaintenanceLogs);
    }
}

// Google Drive Operations
async function saveToGoogleDrive(formData) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'create_log',
                ...formData
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Google Drive error:', error);
        return { success: false, error: error.toString() };
    }
}

async function uploadFileToDrive(file, fileName, mimeType) {
    try {
        // Convert file to base64 for upload
        const base64Data = await fileToBase64(file);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'upload_file',
                file_name: fileName,
                file_data: base64Data,
                mime_type: mimeType
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('File upload error:', error);
        return { success: false, error: error.toString() };
    }
}

async function loadFromGoogleDrive() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_logs'
            })
        });
        
        const result = await response.json();
        return result.success ? result.logs : [];
    } catch (error) {
        console.error('Google Drive load error:', error);
        return JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
    }
}

// Navigation
function showView(viewName) {
    document.querySelectorAll('.view').forEach(function(view) {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewName + '-view');
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
    newRow.innerHTML = '<input type="text" placeholder="Material Name" class="material-name"><input type="number" placeholder="Qty Needed" class="material-qty-needed"><input type="number" placeholder="Qty Available" class="material-qty-available"><button type="button" onclick="removeMaterial(this)">Remove</button>';
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

// File to Base64
function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Create Maintenance Log with File Uploads
async function createMaintenanceLog() {
    console.log('Creating maintenance log...');
    
    const machineImageFile = document.getElementById('machine-image').files[0];
    const quotationFile = document.getElementById('quotation-file').files[0];
    
    let imageUrl = null;
    let quotationUrl = null;

    // Upload files to Google Drive
    if (machineImageFile) {
        console.log('Uploading machine image...');
        const result = await uploadFileToDrive(
            machineImageFile, 
            `machine_image_${Date.now()}_${machineImageFile.name}`,
            machineImageFile.type
        );
        if (result.success) {
            imageUrl = result.downloadUrl;
        }
    }

    if (quotationFile) {
        console.log('Uploading quotation file...');
        const result = await uploadFileToDrive(
            quotationFile,
            `quotation_${Date.now()}_${quotationFile.name}`,
            quotationFile.type
        );
        if (result.success) {
            quotationUrl = result.downloadUrl;
        }
    }

    const formData = {
        id: Date.now().toString(),
        machine_name: document.getElementById('machine-name').value || '',
        machine_section: document.getElementById('machine-section').value || '',
        machine_details: document.getElementById('machine-details').value || '',
        sub_part_area: document.getElementById('sub-part-area').value || '',
        operator_name: document.getElementById('operator-name').value || '',
        maintenance_staff: document.getElementById('maintenance-staff').value || '',
        duration_hours: parseFloat(document.getElementById('duration-hours').value) || 0,
        description: document.getElementById('description').value || '',
        needs_external_repair: document.getElementById('needs-external-repair').checked || false,
        vendor_name: document.getElementById('vendor-name').value || '',
        external_duration_days: parseInt(document.getElementById('external-duration-days').value) || 0,
        materials: getMaterialsData(),
        image_url: imageUrl,
        quotation_url: quotationUrl,
        image_filename: machineImageFile ? machineImageFile.name : null,
        quotation_filename: quotationFile ? quotationFile.name : null,
        created_at: new Date().toISOString(),
        created_by: currentUser.email
    };

    // Validate required fields
    if (!formData.machine_name || !formData.machine_section || !formData.sub_part_area) {
        alert('Please fill in all required fields: Machine Name, Section, and Sub-part Area');
        return;
    }

    try {
        // Save to Google Drive
        const result = await saveToGoogleDrive(formData);
        
        let successMsg = 'Maintenance log created successfully!';
        if (result.success) {
            successMsg += ' (Saved to Google Drive)';
        } else {
            successMsg += ' (Error saving to Drive)';
        }
        if (machineImageFile) successMsg += imageUrl ? ' Image uploaded.' : ' Image upload failed.';
        if (quotationFile) successMsg += quotationUrl ? ' Quotation uploaded.' : ' Quotation upload failed.';
        
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

function getMaterialsData() {
    const materials = [];
    document.querySelectorAll('.material-row').forEach(function(row) {
        const name = row.querySelector('.material-name').value;
        const needed = row.querySelector('.material-qty-needed').value;
        const available = row.querySelector('.material-qty-available').value;
        
        if (name && needed) {
            materials.push({
                name: name,
                quantity_needed: parseInt(needed) || 0,
                quantity_available: parseInt(available) || 0
            });
        }
    });
    return materials;
}

// Load logs from Google Drive
async function loadMaintenanceLogs() {
    maintenanceLogs = await loadFromGoogleDrive();
    displayMaintenanceLogs();
}

function displayMaintenanceLogs() {
    const container = document.getElementById('logs-list');
    if (!container) {
        console.error('logs-list container not found!');
        return;
    }
    
    const searchTerm = document.getElementById('search-input').value.toLowerCase() || '';
    
    const filteredLogs = maintenanceLogs.filter(function(log) {
        return (log.machine_name && log.machine_name.toLowerCase().includes(searchTerm)) ||
               (log.operator_name && log.operator_name.toLowerCase().includes(searchTerm)) ||
               (log.machine_section && log.machine_section.toLowerCase().includes(searchTerm)) ||
               (log.sub_part_area && log.sub_part_area.toLowerCase().includes(searchTerm));
    });

    console.log('Displaying logs:', filteredLogs.length);
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<p>No maintenance logs found. Create your first log!</p>';
        return;
    }

    let html = '';
    filteredLogs.forEach(function(log) {
        html += '<div class="log-card">';
        html += '<div class="card-header">';
        html += '<h3>' + (log.machine_name || 'No Name') + '</h3>';
        html += '<div class="card-actions">';
        html += '<button onclick="editLog(\'' + log.id + '\')">Edit</button>';
        html += '<button onclick="deleteLog(\'' + log.id + '\')">Delete</button>';
        html += '</div></div>';
        html += '<div class="card-content">';
        html += '<p><strong>Section:</strong> ' + (log.machine_section || 'N/A') + '</p>';
        html += '<p><strong>Sub-part:</strong> ' + (log.sub_part_area || 'N/A') + '</p>';
        html += '<p><strong>Operator:</strong> ' + (log.operator_name || 'N/A') + '</p>';
        html += '<p><strong>Maintenance Staff:</strong> ' + (log.maintenance_staff || 'N/A') + '</p>';
        html += '<p><strong>Duration:</strong> ' + (log.duration_hours || 0) + ' hours</p>';
        html += '<p><strong>Description:</strong> ' + (log.description || 'N/A') + '</p>';
        
        if (log.image_url) {
            html += '<div><strong>Machine Image:</strong><br>';
            html += '<img src="' + log.image_url + '" alt="Machine Image" style="max-width: 200px; max-height: 200px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;">';
            html += '<br><small>' + (log.image_filename || 'Image') + '</small></div>';
        }
        
        if (log.materials && log.materials.length > 0) {
            html += '<div><strong>Materials:</strong><ul>';
            log.materials.forEach(function(mat) {
                html += '<li>' + mat.name + ': ' + mat.quantity_needed + ' needed, ' + mat.quantity_available + ' available</li>';
            });
            html += '</ul></div>';
        }
        
        if (log.needs_external_repair) {
            html += '<div><strong>External Repair:</strong>';
            html += '<p>Vendor: ' + (log.vendor_name || 'N/A') + '</p>';
            html += '<p>Duration: ' + (log.external_duration_days || 'N/A') + ' days</p>';
            if (log.quotation_url) {
                html += '<p><a href="' + log.quotation_url + '" target="_blank" style="color: #3498db; text-decoration: none;">📄 View Quotation File</a></p>';
            }
            html += '</div>';
        }
        
        html += '</div>';
        html += '<div class="card-footer">';
        html += '<small>Created: ' + new Date(log.created_at).toLocaleDateString() + ' by ' + (log.created_by || 'User') + '</small>';
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

// ... rest of your functions remain the same
