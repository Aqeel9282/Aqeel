document.addEventListener('DOMContentLoaded', function() {
    // Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Canvas setup
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let originalImageData = null;
    let currentImage = null;
    let isWatermarkMode = false;
    let currentFilter = 'none';

    // Filters array (same as before)
    const filters = [
        { name: "Normal", filter: "none", icon: "fas fa-sliders-h" },
        // ... (include all your filters here)
    ];

    // Upload Image
    document.getElementById('upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('file-name').textContent = file.name;
        const reader = new FileReader();
        
        reader.onload = function(event) {
            currentImage = new Image();
            currentImage.onload = function() {
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                ctx.drawImage(this, 0, 0);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.style.display = 'block';
                document.querySelector('.placeholder-text').style.display = 'none';
                applyFilter(currentFilter);
            };
            currentImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Remove Watermark
    document.getElementById('remove-watermark').addEventListener('click', function() {
        if (!currentImage) return alert("Please upload an image first");
        isWatermarkMode = true;
        this.classList.add('active');
        canvas.style.cursor = 'crosshair';
        alert("Click and drag to select watermark area");
    });

    // Watermark Selection
    canvas.addEventListener('mousedown', function(e) {
        if (!isWatermarkMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        let width = 0, height = 0;
        
        function drawSelection(e) {
            width = (e.clientX - rect.left) - startX;
            height = (e.clientY - rect.top) - startY;
            
            // Redraw original
            ctx.putImageData(originalImageData, 0, 0);
            applyFilter(currentFilter);
            
            // Draw selection
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, width, height);
        }
        
        function finalizeSelection() {
            // Remove watermark
            ctx.fillStyle = 'white';
            ctx.fillRect(startX, startY, width, height);
            
            // Update original
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Clean up
            canvas.removeEventListener('mousemove', drawSelection);
            canvas.removeEventListener('mouseup', finalizeSelection);
            document.getElementById('remove-watermark').classList.remove('active');
            canvas.style.cursor = 'default';
            isWatermarkMode = false;
        }
        
        canvas.addEventListener('mousemove', drawSelection);
        canvas.addEventListener('mouseup', finalizeSelection);
    });

    // Remove Background (using remove.bg API)
    document.getElementById('remove-bg').addEventListener('click', async function() {
        if (!currentImage) return alert("Please upload an image first");
        
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        this.disabled = true;
        
        try {
            canvas.toBlob(async function(blob) {
                try {
                    const formData = new FormData();
                    formData.append('image_file', blob, 'image.png');
                    formData.append('size', 'auto');
                    
                    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                        method: 'POST',
                        headers: {
                            'X-Api-Key': 'aYbgfdgf5hkga34cWfigfBpE' // Replace with your API key
                        },
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Failed to remove background');
                    
                    const blobResponse = await response.blob();
                    const url = URL.createObjectURL(blobResponse);
                    
                    const img = new Image();
                    img.onload = function() {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        URL.revokeObjectURL(url);
                    };
                    img.src = url;
                } catch (error) {
                    console.error('Error:', error);
                    alert('Background removal failed: ' + error.message);
                } finally {
                    document.getElementById('remove-bg').innerHTML = originalText;
                    document.getElementById('remove-bg').disabled = false;
                }
            }, 'image/png');
        } catch (error) {
            console.error('Error:', error);
            alert('Background removal failed: ' + error.message);
            document.getElementById('remove-bg').innerHTML = originalText;
            document.getElementById('remove-bg').disabled = false;
        }
    });

    // AI Image Generator
    document.getElementById('generate-btn').addEventListener('click', async function() {
        const prompt = document.getElementById('ai-prompt').value.trim();
        if (!prompt) return alert("Please enter a description");
        
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        this.disabled = true;
        
        const container = document.getElementById('generated-images');
        container.innerHTML = '<p>Generating image... This may take a moment</p>';
        
        try {
            // Using Stable Diffusion API (replace with your API key)
            const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'sk-lg3oXelyQ8j7yDEOBQ9NG4QV0ZBXlgNFK7kJMOxtx5gr6ZUh' // Replace with your API key
                },
                body: JSON.stringify({
                    text_prompts: [{ text: prompt }],
                    cfg_scale: 7,
                    height: 1024,
                    width: 1024,
                    steps: 30,
                    samples: 1
                })
            });
            
            if (!response.ok) throw new Error('Failed to generate image');
            
            const data = await response.json();
            const base64Image = data.artifacts[0].base64;
            const imgUrl = `data:image/png;base64,${base64Image}`;
            
            container.innerHTML = '';
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'generated-img';
            img.onclick = function() {
                // Set as current image in editor
                currentImage = new Image();
                currentImage.onload = function() {
                    canvas.width = this.naturalWidth;
                    canvas.height = this.naturalHeight;
                    ctx.drawImage(this, 0, 0);
                    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    canvas.style.display = 'block';
                    document.querySelector('.placeholder-text').style.display = 'none';
                    document.querySelector('.tab-btn[data-tab="editor-tab"]').click();
                };
                currentImage.src = imgUrl;
            };
            container.appendChild(img);
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<p>Error generating image. Please try again.</p>';
            alert('Image generation failed: ' + error.message);
        } finally {
            this.innerHTML = originalText;
            this.disabled = false;
        }
    });

    // Reset Image
    document.getElementById('reset').addEventListener('click', function() {
        if (!currentImage) return alert("No image to reset");
        ctx.putImageData(originalImageData, 0, 0);
        currentFilter = 'none';
        canvas.style.filter = 'none';
    });

    // Download Image
    document.getElementById('download').addEventListener('click', function() {
        if (!currentImage) return alert("No image to download");
        
        const link = document.createElement('a');
        link.download = 'edited-photo.png';
        link.href = canvas.toDataURL();
        link.click();
    });

    // Load Filters
    function loadFilters() {
        const container = document.getElementById('filters-container');
        container.innerHTML = '';
        
        filters.forEach(filter => {
            const btn = document.createElement('div');
            btn.className = 'filter-btn';
            btn.innerHTML = `
                <i class="${filter.icon}"></i>
                <span>${filter.name}</span>
            `;
            btn.addEventListener('click', () => applyFilter(filter.filter));
            container.appendChild(btn);
        });
    }

    // Apply Filter
    function applyFilter(filter) {
        if (!currentImage) return alert("Please upload an image first");
        currentFilter = filter;
        ctx.putImageData(originalImageData, 0, 0);
        canvas.style.filter = filter;
    }

    // Search Filters
    document.getElementById('filter-search').addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const name = btn.querySelector('span').textContent.toLowerCase();
            btn.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    // Initialize
    loadFilters();
});