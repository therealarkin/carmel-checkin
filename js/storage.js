/**
 * Storage Module for Carmel Daily Check-In
 * Handles Google Sheets sync and localStorage backup
 */

const storage = {
    // Configuration
    config: {
        sheetsUrl: 'https://script.google.com/macros/s/AKfycbx0BHrK2r8X7K9NN5hW7q3wBVurCEyY9ZZWDw_gmaJH8j5162-8pohgNlbrJiDmMb30/exec',
        localStorageKey: 'carmel_checkin_entries',
        configKey: 'carmel_checkin_config'
    },

    /**
     * Initialize storage - load config from localStorage
     */
    init() {
        const savedConfig = localStorage.getItem(this.config.configKey);
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            this.config.sheetsUrl = parsed.sheetsUrl || '';
            
            // Populate settings UI if it exists
            const urlInput = document.getElementById('sheets-url');
            if (urlInput) {
                urlInput.value = this.config.sheetsUrl;
            }
        }
        this.updateLocalCount();
    },

    /**
     * Save configuration
     */
    saveConfig() {
        const urlInput = document.getElementById('sheets-url');
        if (urlInput) {
            this.config.sheetsUrl = urlInput.value.trim();
            localStorage.setItem(this.config.configKey, JSON.stringify({
                sheetsUrl: this.config.sheetsUrl
            }));
            this.showStatus('connection-status', 'Configuration saved!', 'success');
        }
    },

    /**
     * Test connection to Google Sheets
     */
    async testConnection() {
        const statusEl = document.getElementById('connection-status');
        
        if (!this.config.sheetsUrl) {
            this.showStatus('connection-status', 'Please enter an Apps Script URL first', 'error');
            return;
        }

        this.showStatus('connection-status', 'Testing connection...', '');

        try {
            // Send a test ping
            const response = await fetch(this.config.sheetsUrl, {
                method: 'POST',
                mode: 'no-cors', // Required for Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ test: true })
            });

            // With no-cors, we can't read the response, but if no error, likely works
            this.showStatus('connection-status', 'Connection appears to work! (Note: Full verification requires checking the sheet)', 'success');
        } catch (error) {
            this.showStatus('connection-status', `Connection failed: ${error.message}`, 'error');
        }
    },

    /**
     * Save entry to localStorage
     */
    saveLocal(entry) {
        const entries = this.getLocalEntries();
        entries.push(entry);
        localStorage.setItem(this.config.localStorageKey, JSON.stringify(entries));
        this.updateLocalCount();
        return true;
    },

    /**
     * Get all local entries
     */
    getLocalEntries() {
        const stored = localStorage.getItem(this.config.localStorageKey);
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * Update local entry count display
     */
    updateLocalCount() {
        const countEl = document.getElementById('local-count');
        if (countEl) {
            const entries = this.getLocalEntries();
            countEl.textContent = entries.length;
        }
    },

    /**
     * Save entry - tries Google Sheets first, falls back to local
     */
    async save(entry) {
        // Always save locally as backup
        this.saveLocal(entry);

        // Try to sync to Google Sheets if configured
        if (this.config.sheetsUrl) {
            try {
                await this.sendToSheets(entry);
                // Mark as synced
                this.markAsSynced(entry.id);
                return { success: true, synced: true };
            } catch (error) {
                console.warn('Failed to sync to sheets, saved locally:', error);
                return { success: true, synced: false, error: error.message };
            }
        }

        return { success: true, synced: false };
    },

    /**
     * Send entry to Google Sheets
     */
    async sendToSheets(entry) {
        if (!this.config.sheetsUrl) {
            throw new Error('Google Sheets URL not configured');
        }

        const response = await fetch(this.config.sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry)
        });

        // With no-cors we can't read response, assume success if no error
        return true;
    },

    /**
     * Mark entry as synced
     */
    markAsSynced(entryId) {
        const entries = this.getLocalEntries();
        const index = entries.findIndex(e => e.id === entryId);
        if (index !== -1) {
            entries[index].synced = true;
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(entries));
        }
    },

    /**
     * Sync all unsynced entries to Google Sheets
     */
    async syncAll() {
        if (!this.config.sheetsUrl) {
            this.showStatus('sync-status', 'Please configure Google Sheets URL first', 'error');
            return;
        }

        const entries = this.getLocalEntries();
        const unsynced = entries.filter(e => !e.synced);

        if (unsynced.length === 0) {
            this.showStatus('sync-status', 'All entries already synced!', 'success');
            return;
        }

        this.showStatus('sync-status', `Syncing ${unsynced.length} entries...`, '');

        let synced = 0;
        let failed = 0;

        for (const entry of unsynced) {
            try {
                await this.sendToSheets(entry);
                this.markAsSynced(entry.id);
                synced++;
            } catch (error) {
                failed++;
                console.error('Failed to sync entry:', entry.id, error);
            }
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (failed === 0) {
            this.showStatus('sync-status', `Successfully synced ${synced} entries!`, 'success');
        } else {
            this.showStatus('sync-status', `Synced ${synced} entries, ${failed} failed`, 'error');
        }
    },

    /**
     * Export entries as CSV
     */
    exportCSV() {
        const entries = this.getLocalEntries();
        
        if (entries.length === 0) {
            alert('No entries to export');
            return;
        }

        // CSV headers
        const headers = [
            'Date',
            'Time',
            'Overall Day (1-5)',
            'Academic Focus (1-5)',
            'Social Interactions',
            'Dysregulation Count',
            'Coping Strategy Used',
            'Notes',
            'Synced'
        ];

        // Convert entries to CSV rows
        const rows = entries.map(entry => [
            entry.date,
            entry.timestamp,
            entry.responses.overall_day,
            entry.responses.academic_focus,
            this.formatSocialResponse(entry.responses.social_interactions),
            entry.responses.dysregulation_count,
            this.formatCopingResponse(entry.responses.used_coping_strategy),
            `"${(entry.responses.free_response || '').replace(/"/g, '""')}"`,
            entry.synced ? 'Yes' : 'No'
        ]);

        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download
        this.downloadFile(csvContent, `carmel-checkin-${this.getDateString()}.csv`, 'text/csv');
    },

    /**
     * Export entries as JSON
     */
    exportJSON() {
        const entries = this.getLocalEntries();
        
        if (entries.length === 0) {
            alert('No entries to export');
            return;
        }

        const jsonContent = JSON.stringify(entries, null, 2);
        this.downloadFile(jsonContent, `carmel-checkin-${this.getDateString()}.json`, 'application/json');
    },

    /**
     * Clear all local data
     */
    clearLocal() {
        if (confirm('Are you sure you want to delete all local data? This cannot be undone.')) {
            localStorage.removeItem(this.config.localStorageKey);
            this.updateLocalCount();
            this.showStatus('sync-status', 'Local data cleared', 'success');
        }
    },

    /**
     * Helper: Format social response for display
     */
    formatSocialResponse(value) {
        const map = {
            'yes_several': 'Yes, several good moments',
            'yes_one': 'Yes, at least one',
            'not_really': 'Not really, but okay',
            'no_wished': 'No, and wished I had'
        };
        return map[value] || value || '';
    },

    /**
     * Helper: Format coping response for display
     */
    formatCopingResponse(value) {
        const map = {
            'yes_helped': 'Yes, and it helped',
            'yes_not_much': 'Yes, but not much',
            'no': 'No',
            'n/a': 'N/A (no dysregulation)'
        };
        return map[value] || value || '';
    },

    /**
     * Helper: Get current date string for filenames
     */
    getDateString() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Helper: Trigger file download
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Helper: Show status message
     */
    showStatus(elementId, message, type) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.className = 'status-message' + (type ? ` ${type}` : '');
        }
    }
};

// Initialize storage when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    storage.init();
});
