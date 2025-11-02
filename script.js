// Google Drive Configuration - REPLACE WITH YOUR ACTUAL URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxiY-ZHk0pZwG-r6I9wbSSeLEoeOCFbAjIMrIdqurGCGNFxPpvHOaVHcXlcN4aSGS62BQ/exec';

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
    await testConnection();
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
}

// Test Connection First
async function testConnection() {
    console.log('Testing Google Drive connection...');
    
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
        console.log('Connection test result:', result);
        
        if (result.success) {
            alert('✅ Connected to Google Drive! Folder: "Maintenance Logs App"');
            maintenanceLogs = result.logs;
            displayMaintenanceLogs();
        } else {
            alert('❌ Connection failed: ' + result.error);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        alert('❌ Connection failed. Check browser console.');
    }
}

// Simple Create Function for Testing
async function createMaintenanceLog() {
    console.log('Creating test maintenance log...');
    
    const formData = {
        id: Date.now().toString(),
        machine_name: document.getElementById('machine-name').value || 'Test Machine',
        machine_section: document.getElementById('machine-section').value || 'Test Section',
        sub_part_area: document.getElementById('sub-part-area').value || 'Test Part',
        operator_name: document.getElementById('operator-name').value || 'Test Operator',
        maintenance_staff: 'Test Staff',
        duration_hours: 2.5,
        description: 'Test maintenance description',
        needs_external_repair: false,
        vendor_name: '',
        external_duration_days: 0,
        materials: [{name: 'Test Material', quantity_needed: 5, quantity_available: 3}],
        created_at: new Date().toISOString(),
        created_by: currentUser.email
    };

    try {
        // Save to Google Drive
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
        console.log('Save result:', result);
        
        if (result.success) {
            alert('✅ Maintenance log saved to Google Drive!\nCheck your Google Drive for folder: "Maintenance Logs App"');
            
            // Reset form
            document.getElementById('maintenance-form').reset();
            
            // Reload logs
            await testConnection();
        } else {
            alert('❌ Save failed: ' + result.error);
        }
        
    } catch (error) {
        console.error('Error creating log:', error);
        alert('Error: ' + error.message);
    }
}

function displayMaintenanceLogs() {
    const container = document.getElementById('logs-list');
    if (!container) return;
    
    if (maintenanceLogs.length === 0) {
        container.innerHTML = '<p>No maintenance logs found. Create your first log!</p>';
        return;
    }

    let html = '';
    maintenanceLogs.forEach(function(log) {
        html += '<div class="log-card">';
        html += '<div class="card-header">';
        html += '<h3>' + (log.machine_name || 'No Name') + '</h3>';
        html += '</div>';
        html += '<div class="card-content">';
        html += '<p><strong>Section:</strong> ' + (log.machine_section || 'N/A') + '</p>';
        html += '<p><strong>Sub-part:</strong> ' + (log.sub_part_area || 'N/A') + '</p>';
        html += '<p><strong>Operator:</strong> ' + (log.operator_name || 'N/A') + '</p>';
        html += '<p><strong>Created:</strong> ' + new Date(log.created_at).toLocaleDateString() + '</p>';
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(function(view) {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewName + '-view');
    if (targetView) {
        targetView.classList.add('active');
    }
}

function logout() {
    showLogin();
}

