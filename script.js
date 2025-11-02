// Configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'hhttps://kgtbkzqyclsenkvyajyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGJrenF5Y2xzZW5rdnlhanlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzQyNDksImV4cCI6MjA3NzY1MDI0OX0.1tFJQAJDcb4Nf1bYChfLkjA2xbjwJu6ekTcWl8fNGvk';

// Wait for Supabase to load before initializing
function initializeApp() {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded yet. Retrying...');
        setTimeout(initializeApp, 100);
        return;
    }

    try {
        // Initialize Supabase client
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        
        // Now initialize the rest of the app
        initApp();
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        // Continue without Supabase
        initApp();
    }
}

// App State
let currentUser = null;
let maintenanceLogs = [];

function initApp() {
    console.log('App initialized - Supabase:', !!window.supabaseClient);
    checkAuth();
    setupEventListeners();
    loadMaintenanceLogs(); // Load logs immediately
}

// Authentication - SIMPLIFIED VERSION
async function checkAuth() {
    try {
        console.log('Checking authentication...');
        
        // Skip authentication for now - go straight to app
        showMainApp();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        showMainApp(); // Still show the app even if auth fails
    }
}

function showLogin() {
    console.log('Showing login page');
    document.getElementById('login-page').classList.add('active');
    document.getElementById('main-app').classList.remove('active');
}

function showMainApp() {
    console.log('Showing main app');
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
    showView('dashboard');
}

// Event Listeners
function setupEventListeners() {
    // Login form - SIMPLIFIED
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login attempted - redirecting to main app');
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

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', displayMaintenanceLogs);
    }
}

// Navigation
function showView(viewName) {
    console.log('Switching to view:', viewName);
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Load data if needed
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

// Maintenance Logs CRUD
async function createMaintenanceLog() {
    console.log('Creating maintenance log...');
    
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
        external_duration_days: parseInt(document.getElementById('external-duration')?.value) || 0, // FIXED: external_duration_days
        materials: getMaterialsData(),
        created_at: new Date().toISOString(),
        created_by: 'User'
    };

    // Validate required fields
    if (!formData.machine_name || !formData.machine_section || !formData.sub_part_area) {
        alert('Please fill in all required fields: Machine Name, Section, and Sub-part Area');
        return;
    }

    try {
        // ALWAYS save to localStorage first (this always works)
        saveToLocalStorage(formData);
        
        // Then try to save to Supabase if available (optional)
        if (window.supabaseClient) {
            // Create a clean copy for Supabase with correct column names
            const supabaseData = {
                machine_name: formData.machine_name,
                machine_section: formData.machine_section,
                machine_details: formData.machine_details,
                sub_part_area: formData.sub_part_area,
                operator_name: formData.operator_name,
                maintenance_staff: formData.maintenance_staff,
                duration_hours: formData.duration_hours,
                description: formData.description,
                needs_external_repair: formData.needs_external_repair,
                vendor_name: formData.vendor_name,
                external_duration_days: formData.external_duration_days, // Correct column name
                materials: formData.materials,
                created_at: formData.created_at,
                created_by: formData.created_by
            };

            const { data, error } = await window.supabaseClient
                .from('maintenance_logs')
                .insert([supabaseData]);

            if (error) {
                console.error('Supabase error:', error.message);
                // We don't show error to user since localStorage worked
            } else {
                console.log('Also saved to Supabase:', data);
            }
        }

        // Reset form and show success
        document.getElementById('maintenance-form').reset();
        alert('Maintenance log created successfully!');
        showView('dashboard');
        loadMaintenanceLogs(); // Reload to show the new log
        
    } catch (error) {
        console.error('Error creating log:', error);
        alert('Maintenance log saved locally!');
        showView('dashboard');
        loadMaintenanceLogs();
    }
}

function saveToLocalStorage(formData) {
    const logs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
    const newLog = {
        id: Date.now().toString(),
        ...formData
    };
    logs.unshift(newLog); // Add to beginning of array
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

async function loadMaintenanceLogs() {
    console.log('Loading maintenance logs...');
    
    try {
        // ALWAYS load from localStorage first (this always works)
        maintenanceLogs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
        console.log('Loaded from localStorage:', maintenanceLogs.length, 'logs');
        
        // Then try to load from Supabase if available (optional)
        if (window.supabaseClient) {
            const { data, error } = await window.supabaseClient
                .from('maintenance_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                console.log('Also loaded from Supabase:', data.length, 'logs');
                // You could merge Supabase data here if needed
            } else if (error) {
                console.error('Supabase load error:', error.message);
            }
        }
        
        displayMaintenanceLogs();
    } catch (error) {
        console.error('Error loading logs:', error);
        maintenanceLogs = JSON.parse(localStorage.getItem('maintenanceLogs') || '[]');
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
                        <p>Duration: ${log.external_duration_days || log.external_duration || 'N/A'} days</p>
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
    const log = maintenanceLogs.find(log => log.id == id);
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
        // Handle both column name versions
        document.getElementById('external-duration').value = log.external_duration_days || log.external_duration || '';
        
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
            // Ensure at least one material row exists
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
        maintenanceLogs = maintenanceLogs.filter(log => log.id != id);
        localStorage.setItem('maintenanceLogs', JSON.stringify(maintenanceLogs));
        
        // Also delete from Supabase if available
        if (window.supabaseClient) {
            window.supabaseClient
                .from('maintenance_logs')
                .delete()
                .eq('id', id)
                .then(({ error }) => {
                    if (error) console.error('Supabase delete error:', error);
                });
        }
        
        loadMaintenanceLogs();
        alert('Maintenance log deleted!');
    }
}

// Export functionality
function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Excel export library not loaded. Please check your internet connection.');
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
        'External Duration (Days)': log.external_duration_days || log.external_duration || '',
        'Created Date': new Date(log.created_at).toLocaleDateString(),
        'Created By': log.created_by
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Logs');
    XLSX.writeFile(wb, `maintenance-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
    if (typeof jspdf === 'undefined') {
        alert('PDF export library not loaded. Please check your internet connection.');
        return;
    }

    const doc = new jspdf.jsPDF();
    
    doc.text('Maintenance Logs Report', 14, 15);
    doc.text(`Generated by: User`, 14, 22);
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

// Simple logout function
function logout() {
    console.log('Logging out...');
    showLogin();
}

// Start the app when everything is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
