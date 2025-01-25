!function() {
    "use strict";

    class MusoAPI {
        constructor() {
            this.baseUrl = "https://api.developer.muso.ai/v4";
            this.apiKey = 'YuH6GPw20q9aEn6quciEQ9iPFalcacHP85vWDqH7';
            this.headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": this.apiKey
            };
        }

        async search(keyword, type) {
            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    keyword,
                    type: [type],
                    limit: 1
                })
            });
            return response.json();
        }

        async getProfileCredits(profileId, offset = 0, limit = 10) {
            const response = await fetch(`${this.baseUrl}/profile/${profileId}/credits?offset=${offset}&limit=${limit}`, {
                method: 'GET',
                headers: this.headers
            });
            return response.json();
        }
    }

    class MusoWidgetLoader {
        static init() {
            if (window.MusoWidgetInitialized) return;
            window.MusoWidgetInitialized = true;

            this.setupStyles();
            this.setupEmbeds();
            this.observe();
        }

        static setupStyles() {
            if (document.querySelector('style[data-muso-widget="true"]')) return;
            
            const styles = document.createElement("style");
            styles.setAttribute("data-muso-widget", "true");
            styles.textContent = `
                .muso-track-list {
                    background: #000;
                    color: #fff;
                    font-family: sans-serif;
                    padding: 20px;
                }
                .muso-title {
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .muso-track {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #333;
                }
                .muso-track-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .muso-track-image {
                    width: 50px;
                    height: 50px;
                    object-fit: cover;
                }
                .muso-track-details h3 {
                    margin: 0;
                    font-size: 16px;
                }
                .muso-track-details p {
                    margin: 5px 0 0;
                    color: #888;
                }
                .muso-streams {
                    color: #888;
                }
                .show-more {
                    display: block;
                    width: 200px;
                    margin: 20px auto 0;
                    padding: 10px;
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: center;
                }
                .show-more:hover {
                    background: #444;
                }
                .show-more:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .muso-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: muso-spin 1s ease-in-out infinite;
                    margin: 20px auto;
                }
                @keyframes muso-spin {
                    to { transform: rotate(360deg); }
                }
                .muso-error {
                    color: #ff4444;
                    text-align: center;
                    padding: 20px;
                }
            `;
            document.head.appendChild(styles);
        }

        static observe() {
            const observer = new MutationObserver((mutations) => {
                const widgets = document.querySelectorAll('.muso-credits-embed');
                this.setupEmbeds(widgets);
            });
            
            observer.observe(document, {
                childList: true,
                subtree: true
            });
        }

        static setupEmbeds(widgets = document.querySelectorAll('.muso-credits-embed')) {
            widgets.forEach(widget => {
                if (widget.getAttribute('data-initialized') === 'true') return;
                this.buildWidget(widget);
            });
        }

        static async buildWidget(container) {
            container.setAttribute('data-initialized', 'true');
            
            let currentOffset = 0;
            const itemsPerPage = 10;
            const artistName = container.getAttribute('data-artist') || 'Poo Bear';
            const muso = new MusoAPI();

            container.innerHTML = `
                <div class="muso-track-list">
                    <h2 class="muso-title">Songs written by ${artistName}</h2>
                    <div class="muso-tracks"></div>
                    <div class="muso-spinner"></div>
                </div>
            `;

            const tracksContainer = container.querySelector('.muso-tracks');
            const spinner = container.querySelector('.muso-spinner');

            const addTrack = (track) => {
                const trackElement = document.createElement('div');
                trackElement.className = 'muso-track';
                trackElement.innerHTML = `
                    <div class="muso-track-info">
                        <img class="muso-track-image" src="${track.image_url || track.album?.image_url || 'https://via.placeholder.com/50'}" alt="${track.title}">
                        <div class="muso-track-details">
                            <h3>${track.title}</h3>
                            <p>${track.artists?.[0]?.name || 'Various Artists'}</p>
                        </div>
                    </div>
                    <div class="muso-streams">${new Intl.NumberFormat().format(track.streams || 0)}</div>
                `;
                tracksContainer.appendChild(trackElement);
            };

            const showError = (message) => {
                spinner.style.display = 'none';
                const error = document.createElement('div');
                error.className = 'muso-error';
                error.textContent = message;
                container.querySelector('.muso-track-list').appendChild(error);
            };

            const addShowMoreButton = (totalItems) => {
                spinner.style.display = 'none';
                if (currentOffset < totalItems) {
                    const button = document.createElement('button');
                    button.className = 'show-more';
                    button.textContent = 'Show 10 More';
                    button.onclick = () => loadTracks(currentOffset);
                    container.querySelector('.muso-track-list').appendChild(button);
                }
            };

            const loadTracks = async (offset) => {
                try {
                    const profileResults = await muso.search(artistName, "profile");
                    
                    if (profileResults?.result === 'ok') {
                        const profileId = profileResults.data.profiles.items[0].id;
                        const creditsResult = await muso.getProfileCredits(profileId, offset, itemsPerPage);
                        
                        if (creditsResult?.result === 'ok' && creditsResult.data.items) {
                            creditsResult.data.items.forEach(item => {
                                addTrack(item.track);
                            });

                            currentOffset += creditsResult.data.items.length;
                            
                            const existingButton = container.querySelector('.show-more');
                            if (existingButton) existingButton.remove();
                            
                            addShowMoreButton(creditsResult.data.totalCount);
                        } else {
                            showError('No tracks found');
                        }
                    } else {
                        showError('Artist not found');
                    }
                } catch (error) {
                    console.error('Error loading tracks:', error);
                    showError('Error loading tracks');
                }
            };

            // Initial load
            loadTracks(0);
        }
    }

    // Initialize the widget
    MusoWidgetLoader.init();
}(); 