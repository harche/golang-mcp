// Go documentation viewer JavaScript
// This replaces the Zig-specific WASM implementation

export function startDocsViewer() {
    console.log('Go Documentation Viewer started');

    // Initialize the documentation viewer
    const searchInput = document.getElementById('search');
    const contentDiv = document.getElementById('content');

    if (searchInput && contentDiv) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            if (query.length > 0) {
                // Simple search implementation
                performSearch(query, contentDiv);
            } else {
                // Reset to welcome page
                showWelcomePage(contentDiv);
            }
        });
    }
}

function performSearch(query, contentDiv) {
    // Mock search results for demonstration
    const results = [
        { type: 'package', name: 'fmt', description: 'Formatted I/O' },
        { type: 'function', name: 'fmt.Println', description: 'Print with newline' },
        { type: 'package', name: 'strings', description: 'String manipulation' },
        { type: 'function', name: 'strings.Contains', description: 'Check if string contains substring' }
    ].filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );

    let html = `<h2>Search Results</h2>`;
    html += `<p>Query: "${query}"</p>`;

    if (results.length > 0) {
        html += `<p>Found ${results.length} results:</p><ul>`;
        results.forEach(result => {
            html += `<li><strong>${result.type}:</strong> ${result.name} - ${result.description}</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p>No results found.</p>`;
    }

    contentDiv.innerHTML = html;
}

function showWelcomePage(contentDiv) {
    contentDiv.innerHTML = `
        <h2>Welcome to Go Documentation</h2>
        <p>This is a documentation viewer for the Go programming language standard library.</p>

        <h3>Popular Packages</h3>
        <div class="package-list">
            <div class="package-card">
                <h3>fmt</h3>
                <p>Formatted I/O with functions analogous to C's printf and scanf</p>
            </div>
            <div class="package-card">
                <h3>strings</h3>
                <p>Simple functions to manipulate UTF-8 encoded strings</p>
            </div>
            <div class="package-card">
                <h3>net/http</h3>
                <p>HTTP client and server implementations</p>
            </div>
            <div class="package-card">
                <h3>encoding/json</h3>
                <p>JSON encoding and decoding</p>
            </div>
            <div class="package-card">
                <h3>time</h3>
                <p>Time and date functionality</p>
            </div>
            <div class="package-card">
                <h3>os</h3>
                <p>Operating system interface</p>
            </div>
        </div>
    `;
}