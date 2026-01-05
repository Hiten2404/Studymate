/**
 * StudyPortal - Core Logic (Debug Version)
 */

// --- VISIBLE LOGGER ---
function logToScreen(msg) {
    console.log(msg);
    const logContainer = document.getElementById('status-message');
    if (logContainer) {
        logContainer.classList.remove('hidden');
        logContainer.innerHTML += `<div>${msg}</div>`;
        logContainer.style.color = '#fff'; // Ensure white text
        logContainer.style.textAlign = 'left';
        logContainer.style.fontFamily = 'monospace';
    }
}

// --- DEBUG: Global Error Handler to catch "Blank Screen" issues ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.9)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.zIndex = '10000';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.innerHTML = `<h3>Something went wrong!</h3>
                          <p><b>Error:</b> ${msg}</p>
                          <p><b>Line:</b> ${lineNo}</p>
                          <p>Please take a screenshot of this and share it.</p>`;
    document.body.appendChild(errorDiv);
    return false;
};

// --- Configuration ---
const SUPABASE_URL = "https://qoeoorntostcarjviipi.supabase.co";
// WARNING: This key is public, but RLS protects the data.
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZW9vcm50b3N0Y2FyanZpaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTcxODEsImV4cCI6MjA4MzE3MzE4MX0.LRWonVkFSfWLV9JE4QpJTIfBu3bMoehWIz_s_YreYOw";

// Use a unique name or window property to prevent conflicts during hot-reloads or debugging
let supabaseClient = null;

// --- Initialization ---
logToScreen("Script starting...");

if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        logToScreen("Supabase client created.");
    } catch (e) {
        logToScreen("Error creating Supabase client: " + e.message);
    }
} else {
    logToScreen("CRITICAL: window.supabase is undefined. CDN failed?");
}

const CONFIG = {
    useLocalData: !supabaseClient,
    pdfScale: 1.2,
};

const STATE = {
    currentPdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    isRendering: false,
    pageNumPending: null
};

// --- DOM Elements ---
const dom = {
    splash: document.getElementById('splash-screen'),
    contentRoot: document.getElementById('content-root'),
    searchInput: document.getElementById('subject-search'),
    statusMessage: document.getElementById('status-message'),

    // PDF Modal
    modal: document.getElementById('pdf-modal'),
    modalTitle: document.getElementById('pdf-title'),
    closeBtn: document.getElementById('close-modal'),
    pdfContainer: document.getElementById('pdf-render-area'),
    loader: document.getElementById('pdf-loader'),

    // Controls
    prevBtn: document.getElementById('prev-page'),
    nextBtn: document.getElementById('next-page'),
    pageCountSpan: document.getElementById('current-page'),
    totalPageSpan: document.getElementById('total-pages'),
    zoomIn: document.getElementById('zoom-in'),
    zoomOut: document.getElementById('zoom-out'),
    zoomLevel: document.getElementById('zoom-level')
};

// --- Main Init ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    logToScreen("initApp started. Waiting for splash...");

    // Quick Splash Hide
    setTimeout(() => {
        if (dom.splash) {
            dom.splash.remove();
            logToScreen("Splash removed.");
        }
    }, 1000);

    await loadContent();
    setupEventListeners();
}

// --- Data Fetching ---
async function loadContent() {
    logToScreen("Fetching data...");

    let data = null;

    if (supabase) {
        try {
            logToScreen("Attempting Supabase fetch...");
            data = await fetchSupabaseData();
            logToScreen("Supabase fetch complete. Data received.");
        } catch (error) {
            logToScreen("Supabase Error: " + JSON.stringify(error));
            console.error(error);
        }
    } else {
        logToScreen("Skipping Supabase (client null).");
    }

    if (!data) {
        logToScreen("Trying fallback local data...");
        data = await fetchLocalData();
    }

    if (data) {
        logToScreen("Data valid. Rendering...");
        renderApp(data);
    } else {
        logToScreen("FINAL ERROR: No data could be loaded.");
    }
}

async function fetchLocalData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("JSON not found");
        return await response.json();
    } catch (e) {
        logToScreen("Fetch failed (likely file:// protocol blocking). Using internal fallback data.");
        return {
            "branches": [
                {
                    "name": "Fallback Data (If you see this, DB failed)",
                    "semesters": []
                }
            ]
        };
    }
}

async function fetchSupabaseData() {
    // We need to join Branches -> Semesters -> Subjects -> Units
    // Supabase JS allows this with deep selection
    const { data, error } = await supabase
        .from('branches')
        .select(`
            name,
            semesters (
                name,
                subjects (
                    name,
                    units (
                        unit_number,
                        title,
                        pdf_url
                    )
                )
            )
        `);

    if (error) {
        logToScreen("Supabase Query Error: " + error.message);
        throw error;
    }

    logToScreen(`Got ${data ? data.length : 0} branches from DB.`);
    return { branches: data };
}

// --- Rendering Logic ---
function renderApp(data) {
    // Only clear if we really have data, otherwise keep logs
    if (data.branches && data.branches.length > 0) {
        // dom.contentRoot.innerHTML = ''; // Don't clear logs yet
    }

    if (!data.branches || data.branches.length === 0) {
        logToScreen("Data branches is empty array.");
        return;
    }

    data.branches.forEach(branch => {
        const branchSection = document.createElement('section');
        branchSection.className = 'branch-section';
        branchSection.innerHTML = `<h2 class="branch-title">${branch.name}</h2>`;

        if (branch.semesters) {
            branch.semesters.forEach(semester => {
                const group = document.createElement('div');
                group.className = 'semester-group';
                group.innerHTML = `<h3 class="semester-title">${semester.name}</h3>`;

                const grid = document.createElement('div');
                grid.className = 'subject-grid';

                if (semester.subjects) {
                    semester.subjects.forEach(subject => {
                        grid.appendChild(createSubjectCard(subject));
                    });
                }
                group.appendChild(grid);
                branchSection.appendChild(group);
            });
        }
        dom.contentRoot.appendChild(branchSection);
    });

    logToScreen("Render complete.");
}

function createSubjectCard(subject) {
    const card = document.createElement('article');
    card.className = 'subject-card';
    card.setAttribute('data-subject-name', subject.name.toLowerCase());

    let html = `<h4 class="subject-name">${subject.name}</h4><div class="unit-list">`;
    if (subject.units) {
        subject.units.forEach((unit, idx) => {
            html += `
                <div class="unit-item" onclick="openPdfViewer('${unit.pdf_url}', '${unit.title}')">
                    <div class="unit-info">
                        <span class="unit-number">${unit.unit_number || 'Unit'}</span>
                        <span class="unit-title">${unit.title}</span>
                    </div>
                </div>`; // Simplifed click handler/structure for debug
        });
    }
    html += `</div>`;
    card.innerHTML = html;

    // Re-attach listeners manually or use global delegation for simplicity in debug
    // Used onclick string above for safety in debug rewrite
    return card;
}

// --- Search Functionality ---
dom.searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.subject-card');

    cards.forEach(card => {
        const name = card.getAttribute('data-subject-name');
        if (name.includes(term)) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease';
        } else {
            card.style.display = 'none';
        }
    });

    // Optional: Hide empty Semester/Branch headers if all children are hidden
    // For simplicity, we keep headers visible in this version
});

// --- PDF Viewer Logic ---
// Global scope for debug onclick
window.openPdfViewer = async function (url, title) {
    dom.modal.classList.add('active');
    dom.modal.classList.remove('hidden');
    dom.modalTitle.textContent = title;
    dom.pdfContainer.innerHTML = '';

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        STATE.currentPdfDoc = await loadingTask.promise;
        STATE.totalPages = STATE.currentPdfDoc.numPages;
        dom.totalPageSpan.textContent = STATE.totalPages;
        STATE.currentPage = 1;
        renderPage(1);
    } catch (e) {
        alert("PDF Error: " + e.message);
    }
};

async function renderPage(num) {
    dom.pdfContainer.innerHTML = '';
    const page = await STATE.currentPdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: CONFIG.pdfScale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    dom.pdfContainer.appendChild(canvas);
    dom.pageCountSpan.textContent = num;
}

// Listeners
function setupEventListeners() {
    dom.closeBtn?.addEventListener('click', () => dom.modal.classList.remove('active'));
    dom.prevBtn?.addEventListener('click', () => {
        if (STATE.currentPage > 1) renderPage(--STATE.currentPage);
    });
    dom.nextBtn?.addEventListener('click', () => {
        if (STATE.currentPage < STATE.totalPages) renderPage(++STATE.currentPage);
    });
}
