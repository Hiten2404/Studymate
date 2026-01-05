/**
 * StudyPortal - Core Logic
 */

// --- Configuration ---
// REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS AFTER CREATING THE PROJECT
// These are currently placeholders. The app will fallback to local data.json if connection fails.
// Based on your PDF link, your project URL is:
const SUPABASE_URL = 'https://qoeoorntostcarjviipi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZW9vcm50b3N0Y2FyanZpaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTcxODEsImV4cCI6MjA4MzE3MzE4MX0.LRWonVkFSfWLV9JE4QpJTIfBu3bMoehWIz_s_YreYOw';

let supabase = null;

// Initialize Supabase if credentials appear valid (basic check)
if (SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 20) {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase client initialized.");
    } catch (e) {
        console.warn("Supabase initialization failed, falling back to local data.", e);
    }
} else {
    console.warn("Supabase credentials missing. Utilizing local data.json Mode.");
}

// --- State Management ---
const CONFIG = {
    useLocalData: !supabase, // Force local if no supabase
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

// --- Initialization ---
// Robust check for DOM readiness
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    console.log("Initializing App...");

    // 1. Simulate splash screen delay for smooth UX
    // We maintain a reference to the timeout so we can potentiall clear it if needed, 
    // but here we just want it to run.
    setTimeout(() => {
        if (dom.splash) {
            dom.splash.style.opacity = '0';
            setTimeout(() => dom.splash.remove(), 500);
        }
    }, 1500);

    // 2. Load Data
    await loadContent();

    // 3. Setup Event Listeners
    setupEventListeners();
}

// --- Data Fetching ---
async function loadContent() {
    showStatus("Loading study materials...");

    let data = null;

    // Try fetching from Supabase first
    if (supabase && !CONFIG.useLocalData) {
        try {
            data = await fetchSupabaseData();
        } catch (error) {
            console.error("Supabase fetch error:", error);
            console.log("Falling back to local data...");
            data = await fetchLocalData();
        }
    } else {
        data = await fetchLocalData();
    }

    if (data) {
        renderApp(data);
        hideStatus();
    } else {
        showStatus("Failed to load content. Please check your connection or data setup.");
    }
}

// --- FALLBACK DATA (For file:// protocol usage where fetch is blocked) ---
const FALLBACK_DATA = {
    "branches": [
        {
            "name": "Computer Engineering",
            "semesters": [
                {
                    "name": "Semester 3",
                    "subjects": [
                        {
                            "name": "Data Structures",
                            "units": [
                                {
                                    "unit_number": "Unit 1",
                                    "title": "Introduction to DS",
                                    "pdf_url": "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                                },
                                {
                                    "unit_number": "Unit 2",
                                    "title": "Arrays & Linked Lists",
                                    "pdf_url": "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                                }
                            ]
                        },
                        {
                            "name": "Digital Logic",
                            "units": [
                                {
                                    "unit_number": "Unit 1",
                                    "title": "Boolean Algebra",
                                    "pdf_url": "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Semester 4",
                    "subjects": [
                        {
                            "name": "Operating Systems",
                            "units": [
                                {
                                    "unit_number": "Unit 1",
                                    "title": "Process Management",
                                    "pdf_url": "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "name": "Information Technology",
            "semesters": [
                {
                    "name": "Semester 3",
                    "subjects": [
                        {
                            "name": "Database Management",
                            "units": [
                                {
                                    "unit_number": "Unit 1",
                                    "title": "ER Modeling",
                                    "pdf_url": "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

async function fetchLocalData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("JSON not found");
        return await response.json();
    } catch (e) {
        console.warn("Fetch failed (likely file:// protocol blocking). Using internal fallback data.");
        return FALLBACK_DATA;
    }
}

// Transform flat SQL tables into nested JSON structure if using Supabase
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

    if (error) throw error;
    return { branches: data };
}

// --- Rendering Logic ---
function renderApp(data) {
    dom.contentRoot.innerHTML = ''; // Clear

    if (!data.branches || data.branches.length === 0) {
        showStatus("No branches found.");
        return;
    }

    data.branches.forEach(branch => {
        const branchSection = document.createElement('section');
        branchSection.className = 'branch-section';

        const branchTitle = document.createElement('h2');
        branchTitle.className = 'branch-title';
        branchTitle.textContent = branch.name;
        branchSection.appendChild(branchTitle);

        if (branch.semesters) {
            branch.semesters.forEach(semester => {
                const semesterGroup = document.createElement('div');
                semesterGroup.className = 'semester-group';

                const semesterTitle = document.createElement('h3');
                semesterTitle.className = 'semester-title';
                semesterTitle.textContent = semester.name;
                semesterGroup.appendChild(semesterTitle);

                const subjectGrid = document.createElement('div');
                subjectGrid.className = 'subject-grid';

                if (semester.subjects) {
                    semester.subjects.forEach(subject => {
                        const card = createSubjectCard(subject);
                        subjectGrid.appendChild(card);
                    });
                }

                semesterGroup.appendChild(subjectGrid);
                branchSection.appendChild(semesterGroup);
            });
        }

        dom.contentRoot.appendChild(branchSection);
    });
}

function createSubjectCard(subject) {
    const card = document.createElement('article');
    card.className = 'subject-card';
    card.setAttribute('data-subject-name', subject.name.toLowerCase());

    const title = document.createElement('h4');
    title.className = 'subject-name';
    title.textContent = subject.name;
    card.appendChild(title);

    const unitList = document.createElement('div');
    unitList.className = 'unit-list';

    if (subject.units) {
        // Sort units by number if needed, currently redundant if SQL sorts
        subject.units.forEach(unit => {
            const unitItem = document.createElement('div');
            unitItem.className = 'unit-item';
            unitItem.onclick = () => openPdfViewer(unit);

            const unitInfo = document.createElement('div');
            unitInfo.className = 'unit-info';

            const unitNum = document.createElement('span');
            unitNum.className = 'unit-number';
            unitNum.textContent = unit.unit_number || 'Unit';

            const unitTitle = document.createElement('span');
            unitTitle.className = 'unit-title';
            unitTitle.textContent = unit.title;

            unitInfo.appendChild(unitNum);
            unitInfo.appendChild(unitTitle);

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-file-pdf unit-icon';

            unitItem.appendChild(unitInfo);
            unitItem.appendChild(icon);
            unitList.appendChild(unitItem);
        });
    }

    card.appendChild(unitList);
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
async function openPdfViewer(unitData) {
    dom.modal.classList.add('active');
    dom.modal.classList.remove('hidden');
    dom.modalTitle.textContent = `${unitData.unit_number}: ${unitData.title}`;
    dom.pdfContainer.innerHTML = ''; // Clear previous
    dom.loader.classList.remove('hidden');

    try {
        const loadingTask = pdfjsLib.getDocument(unitData.pdf_url);
        STATE.currentPdfDoc = await loadingTask.promise;
        STATE.totalPages = STATE.currentPdfDoc.numPages;

        dom.totalPageSpan.textContent = STATE.totalPages;
        STATE.currentPage = 1;

        renderPage(STATE.currentPage);
    } catch (error) {
        console.error("Error loading PDF:", error);
        dom.pdfContainer.innerHTML = `<p class="error-msg">Failed to load PDF. The link might be broken or restricted.</p>`;
        dom.loader.classList.add('hidden');
    }
}

async function renderPage(num) {
    STATE.isRendering = true;
    dom.loader.classList.remove('hidden');

    // Clear previous page canvas logic if we want single page view
    // But requirement said "Render pages sequentially" or "Scroll"?
    // "Render pages sequentially on canvas" usually implies a single view or value list. 
    // Let's implement Single Page View for performance on low-end devices, with Next/Prev buttons.

    dom.pdfContainer.innerHTML = ''; // Clear previous page
    dom.pdfContainer.appendChild(dom.loader);

    try {
        const page = await STATE.currentPdfDoc.getPage(num);

        const viewport = page.getViewport({ scale: CONFIG.pdfScale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        dom.pdfContainer.appendChild(canvas);
        dom.pageCountSpan.textContent = num;

        dom.loader.classList.add('hidden');
        STATE.isRendering = false;

        // Check if there's a pending page request
        if (STATE.pageNumPending !== null) {
            renderPage(STATE.pageNumPending);
            STATE.pageNumPending = null;
        }

    } catch (err) {
        console.error(err);
        STATE.isRendering = false;
    }
}

function queueRenderPage(num) {
    if (STATE.isRendering) {
        STATE.pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (STATE.currentPage <= 1) return;
    STATE.currentPage--;
    queueRenderPage(STATE.currentPage);
}

function onNextPage() {
    if (STATE.currentPage >= STATE.totalPages) return;
    STATE.currentPage++;
    queueRenderPage(STATE.currentPage);
}

function onCloseModal() {
    dom.modal.classList.remove('active');
    setTimeout(() => {
        dom.modal.classList.add('hidden');
        dom.pdfContainer.innerHTML = '';
        STATE.currentPdfDoc = null;
    }, 300);
}

function onZoomIn() {
    if (CONFIG.pdfScale >= 3.0) return;
    CONFIG.pdfScale += 0.2;
    updateZoomDisplay();
    queueRenderPage(STATE.currentPage);
}

function onZoomOut() {
    if (CONFIG.pdfScale <= 0.6) return;
    CONFIG.pdfScale -= 0.2;
    updateZoomDisplay();
    queueRenderPage(STATE.currentPage);
}

function updateZoomDisplay() {
    dom.zoomLevel.textContent = Math.round(CONFIG.pdfScale * 100) + '%';
}

// --- Helpers ---
function showStatus(msg) {
    dom.statusMessage.textContent = msg;
    dom.statusMessage.classList.remove('hidden');
}

function hideStatus() {
    dom.statusMessage.classList.add('hidden');
}

function setupEventListeners() {
    dom.closeBtn.addEventListener('click', onCloseModal);
    dom.prevBtn.addEventListener('click', onPrevPage);
    dom.nextBtn.addEventListener('click', onNextPage);
    dom.zoomIn.addEventListener('click', onZoomIn);
    dom.zoomOut.addEventListener('click', onZoomOut);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === dom.modal) onCloseModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!dom.modal.classList.contains('active')) return;

        if (e.key === 'Escape') onCloseModal();
        if (e.key === 'ArrowLeft') onPrevPage();
        if (e.key === 'ArrowRight') onNextPage();
    });
}
