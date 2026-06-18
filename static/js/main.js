// Application State
let appState = {
    notes: [],
    filteredNotes: [],
    activeFilter: 'all',
    searchQuery: '',
    sortBy: 'date-desc',
    selectedNote: null,
    activeTemplate: 'casual'
};

// DOM Elements
const notesContainer = document.getElementById('notes-container');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const exportCsvBtn = document.getElementById('export-csv-btn');
const typeFilters = document.getElementById('type-filters');
const refreshBtn = document.getElementById('refresh-btn');
const themeCheckbox = document.getElementById('theme-checkbox');
const connectionStatus = document.getElementById('connection-status');
const cacheTimeIndicator = document.getElementById('cache-time-indicator');

// Stat Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statBreaking = document.getElementById('stat-breaking');
const statIssues = document.getElementById('stat-issues');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charStatusText = document.getElementById('char-status-text');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const modalNotePreview = document.getElementById('modal-note-preview');
const modalNoteDate = document.getElementById('modal-note-date');
const templateChips = document.querySelectorAll('.template-chip');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes(false);
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        if (themeCheckbox) themeCheckbox.checked = false;
    } else {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        if (themeCheckbox) themeCheckbox.checked = true;
    }
}

// Fetch Release Notes
async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    updateConnectionStatus('connecting');

    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        appState.notes = data.notes || [];
        
        // Update Cache Indicator
        if (data.last_fetched) {
            const fetchDate = new Date(data.last_fetched);
            cacheTimeIndicator.textContent = `Last synced: ${fetchDate.toLocaleTimeString()} (${data.source === 'cache' ? 'Cached' : 'Live'})`;
        }
        
        updateConnectionStatus('connected');
        calculateStats();
        applyFiltersAndRender();
        
        if (forceRefresh) {
            showToast('Release notes successfully refreshed!', 'success');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        updateConnectionStatus('error');
        showToast('Failed to fetch release notes. Displaying offline/cached data.', 'error');
        notesContainer.innerHTML = `
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
                <h3>Unable to load Feed</h3>
                <p>Please check your connection and click refresh to try again.</p>
                <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="fetchReleaseNotes(true)">Retry Connection</button>
            </div>
        `;
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    const spinnerIcon = refreshBtn.querySelector('.spinner-icon');
    const btnText = refreshBtn.querySelector('span');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    if (isLoading) {
        spinnerIcon.classList.add('spinning');
        btnText.textContent = 'Refreshing...';
        refreshBtn.disabled = true;
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
    } else {
        spinnerIcon.classList.remove('spinning');
        btnText.textContent = 'Refresh';
        refreshBtn.disabled = false;
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function updateConnectionStatus(status) {
    const dot = connectionStatus.querySelector('.status-dot');
    const text = connectionStatus.querySelector('.status-text');
    
    dot.className = 'status-dot';
    
    if (status === 'connected') {
        dot.classList.add('green');
        text.textContent = 'Live Connected';
    } else if (status === 'connecting') {
        dot.style.backgroundColor = '#3b82f6';
        text.textContent = 'Syncing...';
    } else {
        dot.style.backgroundColor = '#ef4444';
        text.textContent = 'Connection Offline';
    }
}

// Calculate Stats Dashboard
function calculateStats() {
    const notes = appState.notes;
    
    const totals = {
        all: notes.length,
        Feature: 0,
        Announcement: 0,
        Breaking: 0,
        Issue: 0
    };
    
    notes.forEach(note => {
        if (totals[note.type] !== undefined) {
            totals[note.type]++;
        }
    });
    
    statTotal.textContent = totals.all;
    statFeatures.textContent = totals.Feature;
    statAnnouncements.textContent = totals.Announcement;
    statBreaking.textContent = totals.Breaking;
    statIssues.textContent = totals.Issue;
}

// Event Listeners Setup
function setupEventListeners() {
    // Search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchQuery = e.target.value.toLowerCase().trim();
            applyFiltersAndRender();
        }, 150);
    });
    
    // Sort dropdown
    sortSelect.addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        applyFiltersAndRender();
    });
    
    // Export CSV Button
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportFilteredToCSV);
    }
    
    // Type Filters
    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all
            typeFilters.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            
            // Add active class to clicked
            e.target.classList.add('active');
            
            appState.activeFilter = e.target.dataset.filter;
            applyFiltersAndRender();
        }
    });

    // Stat Dashboard Quick Filtering
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.type;
            const correspondingPill = typeFilters.querySelector(`.filter-pill[data-filter="${filterType}"]`);
            if (correspondingPill) {
                correspondingPill.click();
                // Smooth scroll to search bar area if needed
                window.scrollTo({
                    top: searchInput.offsetTop - 40,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Theme Switch Slider
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
                showToast('Switched to dark theme', 'info');
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                showToast('Switched to light theme', 'info');
            }
        });
    }

    // Close Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Key event to close modal (ESC)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetModal();
        }
    });

    // Character counter live check
    tweetTextarea.addEventListener('input', updateTweetLengthChecks);

    // Template chip changes
    templateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            templateChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            appState.activeTemplate = chip.dataset.template;
            generateTweetDraft();
        });
    });

    // Copy Tweet button
    copyTweetBtn.addEventListener('click', () => {
        tweetTextarea.select();
        navigator.clipboard.writeText(tweetTextarea.value);
        showToast('Tweet copied to clipboard!', 'success');
    });

    // Share/Submit Tweet Button
    submitTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const encodedText = encodeURIComponent(tweetText);
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
        showToast('Redirected to X Composer!', 'success');
    });
}

// Filtering & Rendering Algorithm
function applyFiltersAndRender() {
    let results = [...appState.notes];
    
    // 1. Filter by category pill
    if (appState.activeFilter !== 'all') {
        results = results.filter(note => note.type === appState.activeFilter);
    }
    
    // 2. Filter by search term
    if (appState.searchQuery) {
        const query = appState.searchQuery;
        results = results.filter(note => {
            return note.type.toLowerCase().includes(query) || 
                   note.date.toLowerCase().includes(query) || 
                   note.text_content.toLowerCase().includes(query);
        });
    }
    
    // 3. Sorting
    if (appState.sortBy === 'date-desc') {
        // Feed is already newest first, but ensure correct parsed Date sorting
        results.sort((a, b) => new Date(b.updated || b.date) - new Date(a.updated || a.date));
    } else if (appState.sortBy === 'date-asc') {
        results.sort((a, b) => new Date(a.updated || a.date) - new Date(b.updated || b.date));
    }
    
    appState.filteredNotes = results;
    renderNotes(results);
}

// Render list of release note cards
function renderNotes(notes) {
    // Clean current list
    const spinner = document.getElementById('loading-spinner');
    notesContainer.innerHTML = '';
    if (spinner) notesContainer.appendChild(spinner);
    
    if (notes.length === 0) {
        notesContainer.innerHTML += `
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
                </svg>
                <h3>No matching release notes</h3>
                <p>Try resetting the category filter or searching for another keyword.</p>
            </div>
        `;
        return;
    }
    
    // Add notes cards with staggered animations
    notes.forEach((note, index) => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.style.animationDelay = `${index * 0.04}s`;
        
        // Format the ID for links or tags
        const formattedType = note.type || 'General';
        
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-meta">
                    <span class="type-badge" data-type="${formattedType}">${formattedType}</span>
                    <span class="card-date">${note.date}</span>
                </div>
            </div>
            <div class="card-body">
                ${note.description}
            </div>
            <div class="card-footer">
                ${note.link ? `
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="card-link">
                        <span>Original Docs</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points='15 3 21 3 21 9'></polyline>
                            <line x1='10' y1='14' x2='21' y2='3'></line>
                        </svg>
                    </a>
                ` : ''}
                <button class="btn btn-secondary btn-sm btn-copy-trigger" style="margin-left: auto;" aria-label="Copy to Clipboard">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 0.2rem;">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </button>
                <button class="btn btn-secondary btn-sm btn-tweet-trigger" aria-label="Compose tweet for this release note">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 0.2rem;">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Copy Trigger click event
        card.querySelector('.btn-copy-trigger').addEventListener('click', () => {
            const copyText = `[BigQuery ${formattedType}] ${note.date}\n\n${note.text_content}\n\nRead more: ${note.link || 'https://cloud.google.com/bigquery/docs/release-notes'}`;
            navigator.clipboard.writeText(copyText);
            showToast('Copied release note details!', 'success');
        });

        // Tweet Trigger click event
        card.querySelector('.btn-tweet-trigger').addEventListener('click', () => {
            openTweetModal(note);
        });
        
        notesContainer.appendChild(card);
    });
}

// Tweet Composer Modal Business Logic
function openTweetModal(note) {
    appState.selectedNote = note;
    
    // Set templates active state reset
    templateChips.forEach(c => c.classList.remove('active'));
    const defaultChip = Array.from(templateChips).find(c => c.dataset.template === 'casual');
    if (defaultChip) defaultChip.classList.add('active');
    appState.activeTemplate = 'casual';

    // Update Note Previews in Modal
    modalNotePreview.innerHTML = note.description;
    modalNoteDate.textContent = `Published on ${note.date} (${note.type})`;
    
    generateTweetDraft();
    
    tweetModal.classList.add('open');
}

function closeTweetModal() {
    tweetModal.classList.remove('open');
    appState.selectedNote = null;
}

// Automatic draft builder
function generateTweetDraft() {
    if (!appState.selectedNote) return;
    
    const note = appState.selectedNote;
    const date = note.date;
    const type = note.type;
    const rawText = note.text_content;
    const link = note.link || "https://cloud.google.com/bigquery/docs/release-notes";
    
    // Maximum safe characters for description inside a tweet:
    // 280 characters total - Link length (always counted as 23 characters on X) - spacing/tags.
    // Let's set description limit to 180 chars.
    let descriptionText = rawText;
    if (descriptionText.length > 180) {
        descriptionText = descriptionText.substring(0, 177) + "...";
    }
    
    let draft = "";
    
    if (appState.activeTemplate === 'casual') {
        draft = `💡 BigQuery ${type} Update (${date}):\n\n${descriptionText}\n\nRead details: ${link}\n#BigQuery #GoogleCloud`;
    } else if (appState.activeTemplate === 'professional') {
        draft = `📢 Google Cloud BigQuery released a new ${type.toLowerCase()} update on ${date}:\n\n"${descriptionText}"\n\nFull release notes: ${link}\n#DataEngineering #GoogleCloud`;
    } else if (appState.activeTemplate === 'feature') {
        draft = `🚀 New BigQuery ${type} (${date})!\n\n${descriptionText}\n\nCheck out the official documentation here: ${link}\n#BigQuery #DataAnalytics`;
    }
    
    tweetTextarea.value = draft;
    updateTweetLengthChecks();
}

function updateTweetLengthChecks() {
    const text = tweetTextarea.value;
    
    // X handles URLs by counting them as a flat 23 characters.
    // Let's implement a robust character counter that treats links as 23 characters.
    // Regexp for URL detection:
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    let calculatedLength = text.length;
    urls.forEach(url => {
        // Subtract actual length of the URL and add X standard link weight (23)
        calculatedLength = calculatedLength - url.length + 23;
    });
    
    charCounter.textContent = `${calculatedLength} / 280`;
    
    // Set style warning
    charCounter.className = '';
    submitTweetBtn.disabled = false;
    
    if (calculatedLength > 280) {
        charCounter.classList.add('danger');
        charStatusText.textContent = "Exceeds X limit (Draft must be under 280 chars)";
        charStatusText.style.color = 'var(--color-breaking)';
        submitTweetBtn.disabled = true;
    } else if (calculatedLength > 250) {
        charCounter.classList.add('warning');
        charStatusText.textContent = "Approaching limits";
        charStatusText.style.color = 'var(--color-change)';
    } else {
        charStatusText.textContent = "Draft fits X limit";
        charStatusText.style.color = 'var(--text-muted)';
    }
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else if (type === 'error') {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
    } else {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    // Close on click button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// CSV Export Logic
function exportFilteredToCSV() {
    const notesToExport = appState.filteredNotes || [];
    if (notesToExport.length === 0) {
        showToast('No notes matching current filters to export.', 'error');
        return;
    }
    
    // CSV headers
    const headers = ['Date', 'Type', 'Description', 'Link'];
    
    // Escape cell helper to handle double quotes, commas, and newlines
    const escapeCSV = (text) => {
        if (!text) return '';
        const stringified = String(text);
        const escaped = stringified.replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
            return `"${escaped}"`;
        }
        return escaped;
    };
    
    const csvRows = [
        headers.join(','),
        ...notesToExport.map(note => [
            escapeCSV(note.date),
            escapeCSV(note.type),
            escapeCSV(note.text_content),
            escapeCSV(note.link)
        ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create download blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Dynamic file name based on current filters and date
    const filterText = appState.activeFilter === 'all' ? 'all' : appState.activeFilter.toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_releases_${filterText}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${notesToExport.length} release notes to CSV!`, 'success');
}
