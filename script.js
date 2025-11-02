// Configuration - UPDATE THESE WITH YOUR SUPABASE DETAILS
const SUPABASE_URL = 'https://eelvnresijjzfswqwtrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHZucmVzaWpqemZzd3F3dHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNzQ4ODMsImV4cCI6MjA3Njg1MDg4M30.MpMUT_zzXAk0yhbSuVFAY8gKUAsJQigngpLPZXlMn_4';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App State
let currentUser = null;
let maintenanceLogs = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Authentication
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showMainApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('main-app').classList.remove('active');
}

function showMainApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
    showView('dashboard');
}

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            document.getElementById('login-message').textContent = error.message;
        } else {
            checkAuth();
        }
    });

    // Maintenance form
    document.getElementById('maintenance-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createMaintenanceLog();
    });
}

// Navigation
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Load data if needed
    if (viewName === 'logs') {
        loadMaintenanceLogs();
    }
}

// Materials Management
function addMaterial() {
    const container = document.getElementById('materials-container');
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
    button.parentElement.remove();
}

function toggleExternalRepair() {
    const externalFields = document.getElementById('external-repair-fields');
    const checkbox = document.getElementById('needs-external-repair');
    externalFields.style.display = checkbox.checked ? 'block' : 'none';
}

// Maintenance Logs CRUD
async function createMaintenanceLog() {
    const formData = {
        machine_name: document.getElementById('machine-name').value,
        machine_section: document.getElementById('machine-section').value,
        machine_details: document.getElementById('machine-details').value,
        sub_part_area: document.getElementById('sub-part-area').value,
        operator_name: document.getElementById('operator-name').value,
        maintenance_staff: document.getElementById('maintenance-staff').value,
        duration_hours: parseFloat(document.getElementById('duration-hours').value),
        description: document.getElementById('description').value,
        needs_external_repair: document.getElementById('needs-external-repair').checked,
        vendor_name: document.getElementById('vendor-name').value,
        external_duration: document.getElementById('external-duration').value,
        materials: getMaterialsData(),
        created_at: new Date().toISOString(),
        created_by: currentUser.email
    };

    // Store in localStorage (for demo - in real app, save to Supabase)
    const logs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
    logs.push({
        id: Date.now().toString(),
        ...formData
    });
    localStorage.setItem('maintenanceLogs', JSON.stringify(logs));

    alert('Maintenance log created successfully!');
    document.getElementById('maintenance-form').reset();
    showView('dashboard');
}

function getMaterialsData() {
    const materials = [];
    document.querySelectorAll('.material-row').forEach(row => {
        const name = row.querySelector('.material-name').value;
        const needed = row.querySelector('.material-qty-needed').value;
        const available = row.querySelector('.material-qty-available').value;
        
        if (name && needed) {
            materials.push({
                name,
                quantity_needed: parseInt(needed),
                quantity_available: parseInt(available) || 0
            });
        }
    });
    return materials;
}

async function loadMaintenanceLogs() {
    // Load from localStorage (for demo)
    maintenanceLogs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
    displayMaintenanceLogs();
}

function displayMaintenanceLogs() {
    const container = document.getElementById('logs-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const filteredLogs = maintenanceLogs.filter(log => 
        log.machine_name.toLowerCase().includes(searchTerm) ||
        log.operator_name.toLowerCase().includes(searchTerm) ||
        log.machine_section.toLowerCase().includes(searchTerm) ||
        log.sub_part_area.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = filteredLogs.map(log => `
        <div class="log-card">
            <div class="card-header">
                <h3>${log.machine_name}</h3>
                <div class="card-actions">
                    <button onclick="editLog('${log.id}')">Edit</button>
                    <button onclick="deleteLog('${log.id}')">Delete</button>
                </div>
            </div>
            <div class="card-content">
                <p><strong>Section:</strong> ${log.machine_section}</p>
                <p><strong>Sub-part:</strong> ${log.sub_part_area}</p>
                <p><strong>Operator:</strong> ${log.operator_name}</p>
                <p><strong>Maintenance Staff:</strong> ${log.maintenance_staff}</p>
                <p><strong>Duration:</strong> ${log.duration_hours} hours</p>
                <p><strong>Description:</strong> ${log.description}</p>
                
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
                        <p>Vendor: ${log.vendor_name}</p>
                        <p>Duration: ${log.external_duration} days</p>
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <small>Created: ${new Date(log.created_at).toLocaleDateString()} by ${log.created_by}</small>
            </div>
        </div>
    `).join('');
}

function editLog(id) {
    const log = maintenanceLogs.find(log => log.id === id);
    if (log) {
        // Populate form with log data
        document.getElementById('machine-name').value = log.machine_name;
        document.getElementById('machine-section').value = log.machine_section;
        document.getElementById('machine-details').value = log.machine_details;
        document.getElementById('sub-part-area').value = log.sub_part_area;
        document.getElementById('operator-name').value = log.operator_name;
        document.getElementById('maintenance-staff').value = log.maintenance_staff;
        document.getElementById('duration-hours').value = log.duration_hours;
        document.getElementById('description').value = log.description;
        document.getElementById('needs-external-repair').checked = log.needs_external_repair;
        document.getElementById('vendor-name').value = log.vendor_name;
        document.getElementById('external-duration').value = log.external_duration;
        
        // Populate materials
        document.getElementById('materials-container').innerHTML = '';
        if (log.materials) {
            log.materials.forEach(material => {
                addMaterial();
                const rows = document.querySelectorAll('.material-row');
                const lastRow = rows[rows.length - 1];
                lastRow.querySelector('.material-name').value = material.name;
                lastRow.querySelector('.material-qty-needed').value = material.quantity_needed;
                lastRow.querySelector('.material-qty-available').value = material.quantity_available;
            });
        }
        
        showView('new-log');
        
        // Store the ID for update
        document.getElementById('maintenance-form').dataset.editingId = id;
    }
}

function deleteLog(id) {
    if (confirm('Are you sure you want to delete this maintenance log?')) {
        maintenanceLogs = maintenanceLogs.filter(log => log.id !== id);
        localStorage.setItem('maintenanceLogs', JSON.stringify(maintenanceLogs));
        loadMaintenanceLogs();
    }
}

// Search functionality
document.getElementById('search-input')?.addEventListener('input', displayMaintenanceLogs);

// Export functionality
function exportToExcel() {
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
        'External Duration (Days)': log.external_duration,
        'Created Date': new Date(log.created_at).toLocaleDateString(),
        'Created By': log.created_by
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Logs');
    XLSX.writeFile(wb, `maintenance-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text('Maintenance Logs Report', 14, 15);
    doc.text(`Generated by: ${currentUser.email}`, 14, 22);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 29);
    
    const tableData = maintenanceLogs.map(log => [
        log.machine_name,
        log.machine_section,
        log.sub_part_area,
        log.operator_name,
        log.duration_hours,
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

async function logout() {
    await supabase.auth.signOut();
    checkAuth();

}
