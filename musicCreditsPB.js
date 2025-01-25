!function() {
    "use strict";

    class MusoAPI {
        constructor() {
            this.baseUrl = "https://api.developer.muso.ai/v4";
            this.apiKey = 'YuH6GPw20q9aEn6quciEQ9iPFalcacHP85vWDqH7';
        }

        loadScript(url) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const callbackName = 'musoCallback_' + Math.random().toString(36).substr(2, 9);
                
                window[callbackName] = (data) => {
                    delete window[callbackName];
                    document.head.removeChild(script);
                    resolve(data);
                };

                script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        async search(keyword, type) {
            const params = encodeURIComponent(JSON.stringify({
                keyword,
                type: [type],
                limit: 1
            }));
            
            return this.loadScript(`${this.baseUrl}/search?data=${params}&key=${this.apiKey}`);
        }

        async getProfileCredits(profileId, offset = 0, limit = 10) {
            return this.loadScript(
                `${this.baseUrl}/profile/${profileId}/credits?offset=${offset}&limit=${limit}&key=${this.apiKey}`
            );
        }
    }

    const createMusoTrackList = () => {
        const styles = `
            <style>
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
            </style>
        `;

        // Create container
        const container = document.createElement('div');
        container.className = 'muso-track-list';
        container.innerHTML = styles + '<h2 class="muso-title">Songs written by PooBear</h2>';

        let currentOffset = 0;
        const itemsPerPage = 10;
        let totalItems = 0;

        // Function to format stream count
        const formatStreams = (streams) => {
            return new Intl.NumberFormat().format(streams);
        };

        // Function to add a track to the list
        const addTrack = (track) => {
            console.log('Adding track:', track);
            const trackElement = document.createElement('div');
            trackElement.className = 'muso-track';
            trackElement.innerHTML = `
                <div class="muso-track-info">
                    <img class="muso-track-image" src="${track.image}" alt="${track.title}">
                    <div class="muso-track-details">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                </div>
            `;
            container.appendChild(trackElement);
        };

        const addShowMoreButton = () => {
            const existingButton = container.querySelector('.show-more');
            if (existingButton) {
                existingButton.remove();
            }

            if (currentOffset < totalItems) {
                const button = document.createElement('button');
                button.className = 'show-more';
                button.textContent = 'Show 10 More';
                button.onclick = () => fetchTracks(currentOffset);
                container.appendChild(button);
            }
        };

        const fetchTracks = async (offset = 0) => {
            const muso = new MusoAPI();
            
            try {
                const profileResults = await muso.search("Poo Bear", "profile");
                
                if (profileResults?.result === 'ok') {
                    const profileId = profileResults.data.profiles.items[0].id;
                    const creditsResult = await muso.getProfileCredits(profileId, offset, itemsPerPage);
                    
                    if (creditsResult?.result === 'ok' && creditsResult.data.items) {
                        totalItems = creditsResult.data.totalCount;
                        
                        creditsResult.data.items.forEach(item => {
                            addTrack({
                                title: item.track.title,
                                artist: item.artists[0]?.name || 'Various Artists',
                                image: item.album.albumArt || 'https://via.placeholder.com/50',
                                streams: item.track.popularity * 1000000
                            });
                        });

                        currentOffset += creditsResult.data.items.length;
                        addShowMoreButton();
                    }
                }
            } catch (error) {
                console.error('Error fetching tracks:', error);
                container.innerHTML += '<div style="color: red;">Error loading tracks</div>';
            }
        };

        // Initialize
        fetchTracks();
        return container;
    };

    // Add to page when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing Muso track list...');
        const embedContainer = document.getElementById('muso-embed');
        if (embedContainer) {
            embedContainer.appendChild(createMusoTrackList());
        } else {
            console.error('Could not find muso-embed container');
        }
    });
}(); 
