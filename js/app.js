/**
 * Main App Module for Carmel Daily Check-In
 * Handles screen flow, state, and user interactions
 */

const app = {
    // App state
    state: {
        currentScreen: 'screen-welcome',
        startTime: null,
        responses: {
            overall_day: null,
            academic_focus: null,
            social_interactions: null,
            dysregulation_count: null,
            used_coping_strategy: null,
            free_response: ''
        }
    },

    // Screen flow configuration
    flow: {
        'screen-welcome': { next: 'screen-q1' },
        'screen-q1': { next: 'screen-q2', prev: 'screen-welcome' },
        'screen-q2': { next: 'screen-q3', prev: 'screen-q1' },
        'screen-q3': { next: 'screen-q4', prev: 'screen-q2' },
        'screen-q4': { next: 'screen-q4b', prev: 'screen-q3' }, // Dynamic - may skip q4b
        'screen-q4b': { next: 'screen-q5', prev: 'screen-q4' },
        'screen-q5': { next: 'screen-done', prev: 'screen-q4b' }, // Dynamic - may go to q4
        'screen-done': { next: null, prev: null }
    },

    /**
     * Initialize the app
     */
    init() {
        // Check for saved progress
        this.loadProgress();
        
        // Set up keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.state.currentScreen === 'screen-q5') {
                this.submitFreeResponse();
            }
        });
    },

    /**
     * Start the check-in
     */
    start() {
        this.state.startTime = Date.now();
        this.showScreen('screen-q1');
    },

    /**
     * Show a specific screen
     */
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.state.currentScreen = screenId;
            
            // Restore any previously selected values
            this.restoreSelections(screenId);
            
            // Save progress
            this.saveProgress();
        }
    },

    /**
     * Go to previous screen
     */
    goBack() {
        const current = this.state.currentScreen;
        let prevScreen = this.flow[current]?.prev;

        // Special handling for q5 - may need to skip q4b if dysregulation was 0
        if (current === 'screen-q5' && this.state.responses.dysregulation_count === 0) {
            prevScreen = 'screen-q4';
        }

        if (prevScreen) {
            this.showScreen(prevScreen);
        }
    },

    /**
     * Go to next screen
     */
    goNext() {
        const current = this.state.currentScreen;
        let nextScreen = this.flow[current]?.next;

        // Special handling for q4 - skip q4b if dysregulation was 0
        if (current === 'screen-q4' && this.state.responses.dysregulation_count === 0) {
            nextScreen = 'screen-q5';
            this.state.responses.used_coping_strategy = 'n/a';
        }

        if (nextScreen) {
            this.showScreen(nextScreen);
        }
    },

    /**
     * Handle rating selection (emoji/number scales)
     */
    selectRating(field, value) {
        this.state.responses[field] = value;
        
        // Visual feedback
        const screen = document.getElementById(this.state.currentScreen);
        screen.querySelectorAll('.rating-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.value) === value) {
                btn.classList.add('selected');
            }
        });

        // Auto-advance after brief delay
        setTimeout(() => this.goNext(), 300);
    },

    /**
     * Handle choice selection
     */
    selectChoice(field, value) {
        this.state.responses[field] = value;
        
        // Visual feedback
        const screen = document.getElementById(this.state.currentScreen);
        screen.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');

        // Auto-advance after brief delay
        setTimeout(() => this.goNext(), 300);
    },

    /**
     * Handle number picker selection
     */
    selectNumber(field, value) {
        this.state.responses[field] = value;
        
        // Visual feedback
        const screen = document.getElementById(this.state.currentScreen);
        screen.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');

        // Auto-advance after brief delay
        setTimeout(() => this.goNext(), 300);
    },

    /**
     * Handle free response submission
     */
    submitFreeResponse() {
        const textarea = document.getElementById('free-response');
        this.state.responses.free_response = textarea.value.trim();
        
        // Submit the check-in
        this.submit();
    },

    /**
     * Update character count display
     */
    updateCharCount() {
        const textarea = document.getElementById('free-response');
        const countEl = document.getElementById('char-current');
        if (textarea && countEl) {
            countEl.textContent = textarea.value.length;
        }
    },

    /**
     * Submit the check-in
     */
    async submit() {
        const endTime = Date.now();
        const completionTime = Math.round((endTime - this.state.startTime) / 1000);

        // Create entry object
        const entry = {
            id: this.generateId(),
            date: this.getDateString(),
            timestamp: new Date().toISOString(),
            responses: { ...this.state.responses },
            metadata: {
                completion_time_seconds: completionTime,
                device: this.getDeviceType()
            },
            synced: false
        };

        // Save entry
        const result = await storage.save(entry);

        // Show completion screen
        this.showDoneSummary(entry, result);
        this.showScreen('screen-done');

        // Clear saved progress
        this.clearProgress();
    },

    /**
     * Show summary on done screen
     */
    showDoneSummary(entry, saveResult) {
        const summaryEl = document.getElementById('done-summary');
        if (!summaryEl) return;

        const r = entry.responses;
        
        // Format overall day
        const dayLabels = ['', 'Really tough 😫', 'Difficult 😕', 'Okay 😐', 'Good 🙂', 'Great 😄'];
        
        // Format social
        const socialLabels = {
            'yes_several': '✨ Several good moments',
            'yes_one': '👍 At least one',
            'not_really': '🤷 Not really, but okay',
            'no_wished': '😔 Wished I had'
        };

        let html = `
            <p><strong>Overall:</strong> ${dayLabels[r.overall_day] || r.overall_day}</p>
            <p><strong>Focus:</strong> ${r.academic_focus}/5</p>
            <p><strong>Social:</strong> ${socialLabels[r.social_interactions] || r.social_interactions}</p>
            <p><strong>Tough moments:</strong> ${r.dysregulation_count}</p>
        `;

        if (r.dysregulation_count > 0 && r.used_coping_strategy !== 'n/a') {
            const copingLabels = {
                'yes_helped': '💪 Used a strategy that helped',
                'yes_not_much': '🤔 Tried but didn\'t help much',
                'no': '❌ Didn\'t use a strategy'
            };
            html += `<p><strong>Coping:</strong> ${copingLabels[r.used_coping_strategy] || r.used_coping_strategy}</p>`;
        }

        if (r.free_response) {
            html += `<p><strong>Note:</strong> "${r.free_response}"</p>`;
        }

        html += `<p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.85rem;">
            Completed in ${entry.metadata.completion_time_seconds}s
            ${saveResult.synced ? '• Synced ✓' : '• Saved locally'}
        </p>`;

        summaryEl.innerHTML = html;
    },

    /**
     * Reset for a new check-in
     */
    reset() {
        this.state.responses = {
            overall_day: null,
            academic_focus: null,
            social_interactions: null,
            dysregulation_count: null,
            used_coping_strategy: null,
            free_response: ''
        };
        this.state.startTime = null;

        // Clear all selections
        document.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Clear textarea
        const textarea = document.getElementById('free-response');
        if (textarea) textarea.value = '';
        this.updateCharCount();

        // Go to welcome
        this.showScreen('screen-welcome');
    },

    /**
     * Restore visual selections when returning to a screen
     */
    restoreSelections(screenId) {
        const screen = document.getElementById(screenId);
        if (!screen) return;

        const fieldMap = {
            'screen-q1': 'overall_day',
            'screen-q2': 'academic_focus',
            'screen-q3': 'social_interactions',
            'screen-q4': 'dysregulation_count',
            'screen-q4b': 'used_coping_strategy'
        };

        const field = fieldMap[screenId];
        if (!field) return;

        const value = this.state.responses[field];
        if (value === null || value === undefined) return;

        // For rating buttons (by data-value)
        screen.querySelectorAll('.rating-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
        });

        // For number buttons
        screen.querySelectorAll('.number-btn').forEach(btn => {
            const btnValue = btn.textContent.includes('+') ? 5 : parseInt(btn.textContent);
            btn.classList.toggle('selected', btnValue === value);
        });

        // For choice buttons (need to match by onclick value)
        if (screenId === 'screen-q3' || screenId === 'screen-q4b') {
            screen.querySelectorAll('.choice-btn').forEach(btn => {
                const onclick = btn.getAttribute('onclick');
                btn.classList.toggle('selected', onclick && onclick.includes(`'${value}'`));
            });
        }

        // For free response
        if (screenId === 'screen-q5') {
            const textarea = document.getElementById('free-response');
            if (textarea && this.state.responses.free_response) {
                textarea.value = this.state.responses.free_response;
                this.updateCharCount();
            }
        }
    },

    /**
     * Save progress to localStorage (in case of accidental close)
     */
    saveProgress() {
        const progress = {
            currentScreen: this.state.currentScreen,
            startTime: this.state.startTime,
            responses: this.state.responses
        };
        localStorage.setItem('carmel_checkin_progress', JSON.stringify(progress));
    },

    /**
     * Load saved progress
     */
    loadProgress() {
        const saved = localStorage.getItem('carmel_checkin_progress');
        if (saved) {
            try {
                const progress = JSON.parse(saved);
                // Only restore if started within last hour
                if (progress.startTime && (Date.now() - progress.startTime) < 3600000) {
                    this.state = { ...this.state, ...progress };
                    if (progress.currentScreen && progress.currentScreen !== 'screen-welcome') {
                        // Offer to resume
                        if (confirm('You have an unfinished check-in. Would you like to continue?')) {
                            this.showScreen(progress.currentScreen);
                        } else {
                            this.clearProgress();
                        }
                    }
                } else {
                    this.clearProgress();
                }
            } catch (e) {
                this.clearProgress();
            }
        }
    },

    /**
     * Clear saved progress
     */
    clearProgress() {
        localStorage.removeItem('carmel_checkin_progress');
    },

    /**
     * Helper: Generate unique ID
     */
    generateId() {
        return 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Helper: Get date string (YYYY-MM-DD)
     */
    getDateString() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Helper: Detect device type
     */
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
        if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
        return 'desktop';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
