document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const previewContainer = document.getElementById('previewContainer');
    const previewThumb = document.getElementById('previewThumb');
    const previewName = document.getElementById('previewName');
    const clearImageBtn = document.getElementById('clearImageBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const sampleChips = document.querySelectorAll('.sample-chip');

    // States
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultsContent = document.getElementById('resultsContent');

    // Result elements
    const statusBanner = document.getElementById('statusBanner');
    const statusIconBox = document.getElementById('statusIconBox');
    const statusTitle = document.getElementById('statusTitle');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const downloadBtn = document.getElementById('downloadBtn');

    const statTotal = document.getElementById('statTotal');
    const statBreak = document.getElementById('statBreak');
    const statLack = document.getElementById('statLack');
    const statScratch = document.getElementById('statScratch');
    const statLatency = document.getElementById('statLatency');

    const singleViewer = document.getElementById('singleViewer');
    const splitViewer = document.getElementById('splitViewer');
    const mainResultImg = document.getElementById('mainResultImg');
    const splitOriginalImg = document.getElementById('splitOriginalImg');
    const splitAnnotatedImg = document.getElementById('splitAnnotatedImg');

    const defectTableBody = document.getElementById('defectTableBody');
    const defectLogCount = document.getElementById('defectLogCount');
    const viewTabs = document.querySelectorAll('.view-tab');

    // Theme toggle elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Current State
    let currentFile = null;
    let selectedSample = null;
    let analysisData = null;
    let currentView = 'annotated';

    // Theme Manager
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gearvision_theme', theme);
    }

    const savedTheme = localStorage.getItem('gearvision_theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(nextTheme);
        });
    }

    // 2. File Selection Handlers
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        if (!currentFile && !selectedSample) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileChosen(file);
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileChosen(file);
        }
    });

    // Clipboard Paste Support
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') === 0) {
                const file = item.getAsFile();
                handleFileChosen(file);
                break;
            }
        }
    });

    function handleFileChosen(file) {
        currentFile = file;
        selectedSample = null;
        sampleChips.forEach(c => c.classList.remove('active'));

        const reader = new FileReader();
        reader.onload = (e) => {
            previewThumb.src = e.target.result;
            previewName.textContent = file.name;
            previewContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    clearImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetInputSelection();
    });

    function resetInputSelection() {
        currentFile = null;
        selectedSample = null;
        fileInput.value = '';
        previewContainer.classList.add('hidden');
        previewThumb.src = '';
        previewName.textContent = '';
        analyzeBtn.disabled = true;
        sampleChips.forEach(c => c.classList.remove('active'));
    }

    // 3. Sample Presets
    sampleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const sampleName = chip.dataset.sample;
            sampleChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            currentFile = null;
            selectedSample = sampleName;
            fileInput.value = '';

            previewThumb.src = `/samples/${encodeURIComponent(sampleName)}`;
            previewName.textContent = sampleName;
            previewContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        });
    });

    // 4. Analyze Action
    analyzeBtn.addEventListener('click', runAnalysis);

    async function runAnalysis() {
        if (!currentFile && !selectedSample) return;

        // UI: Loading State
        emptyState.classList.add('hidden');
        resultsContent.classList.add('hidden');
        loadingState.classList.remove('hidden');
        analyzeBtn.disabled = true;

        const confThresh = 0.15;

        try {
            let response;
            if (currentFile) {
                const formData = new FormData();
                formData.append('image', currentFile);
                formData.append('confidence', confThresh);

                response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sample_name: selectedSample,
                        confidence: parseFloat(confThresh)
                    })
                });
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server inspection error');
            }

            const data = await response.json();
            analysisData = data;
            renderResults(data);

        } catch (err) {
            alert('Inspection failed: ' + err.message);
            emptyState.classList.remove('hidden');
        } finally {
            loadingState.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    }

    // 5. Render Results
    function renderResults(data) {
        // Status Banner
        if (data.is_defective) {
            statusBanner.className = 'status-banner banner-damaged';
            statusIconBox.textContent = '⚠️';
            statusTitle.textContent = 'DAMAGED GEAR DETECTED';
            statusSubtitle.textContent = `Total defects found: ${data.total_defects} critical anomalies`;
        } else {
            statusBanner.className = 'status-banner banner-perfect';
            statusIconBox.textContent = '✅';
            statusTitle.textContent = 'PERFECT GEAR CONFIRMED';
            statusSubtitle.textContent = 'Zero defects identified on tooth surfaces and rim';
        }

        // Metrics
        statTotal.textContent = data.total_defects;
        statBreak.textContent = data.class_counts['break'] || 0;
        statLack.textContent = data.class_counts['lack'] || 0;
        statScratch.textContent = data.class_counts['scratch'] || 0;
        statLatency.textContent = `${data.inference_ms} ms`;

        // Images
        mainResultImg.src = data.annotated_image;
        splitOriginalImg.src = data.original_image;
        splitAnnotatedImg.src = data.annotated_image;

        // Populate Table
        defectTableBody.innerHTML = '';
        defectLogCount.textContent = `${data.defects.length} defect${data.defects.length === 1 ? '' : 's'}`;

        if (data.defects.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="4" style="text-align: center; color: var(--color-success); padding: 24px; font-weight: 600;">
                    ✅ No defects detected. Gear meets flawless manufacturing standards.
                </td>
            `;
            defectTableBody.appendChild(tr);
        } else {
            data.defects.forEach((d) => {
                const tr = document.createElement('tr');
                const badgeClass = `badge-${d.class_name.toLowerCase()}`;
                tr.innerHTML = `
                    <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace;">#${d.id}</td>
                    <td>
                        <span class="defect-badge ${badgeClass}">${d.class_name}</span>
                    </td>
                    <td>
                        <div class="conf-bar-wrapper">
                            <div class="conf-bar">
                                <div class="conf-fill" style="width: ${d.confidence}%"></div>
                            </div>
                            <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;">${d.confidence}%</span>
                        </div>
                    </td>
                    <td class="box-coords">[${d.box.join(', ')}]</td>
                `;
                defectTableBody.appendChild(tr);
            });
        }

        // Apply active view
        updateActiveView();
        resultsContent.classList.remove('hidden');
    }

    // 6. View Tabs (Analyzed / Split / Original)
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            updateActiveView();
        });
    });

    function updateActiveView() {
        if (!analysisData) return;

        if (currentView === 'split') {
            singleViewer.classList.add('hidden');
            splitViewer.classList.remove('hidden');
        } else {
            splitViewer.classList.add('hidden');
            singleViewer.classList.remove('hidden');
            if (currentView === 'original') {
                mainResultImg.src = analysisData.original_image;
            } else {
                mainResultImg.src = analysisData.annotated_image;
            }
        }
    }

    // 7. Download Annotated Image
    downloadBtn.addEventListener('click', () => {
        if (!analysisData || !analysisData.annotated_image) return;
        const link = document.createElement('a');
        link.href = analysisData.annotated_image;
        link.download = `gear_analysis_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
