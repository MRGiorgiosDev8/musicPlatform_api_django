// RubySound.fm - Favorite Button JavaScript
// This file contains the favorite button functionality that can be used across the site

// Get CSRF token from meta tag
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : '';
}

// Create favorite button function
function createFavoriteButton(trackName, artistName, isFavorite = false) {
    const button = document.createElement('button');
    button.className = isFavorite ? 'btn btn-danger btn-sm' : 'btn btn-outline-danger btn-sm';
    button.innerHTML = `<i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>`;
    button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
    
    button.addEventListener('click', async function() {
        try {
            const method = isFavorite ? 'DELETE' : 'POST';
            const response = await fetch('/api/playlists/me/tracks/', {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    name: trackName,
                    artist: artistName
                })
            });
            
            if (response.ok) {
                // Toggle button state
                isFavorite = !isFavorite;
                button.className = isFavorite ? 'btn btn-danger btn-sm' : 'btn btn-outline-danger btn-sm';
                button.innerHTML = `<i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>`;
                button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
                
                // Dispatch custom event for other components to listen to
                const event = new CustomEvent('favoriteToggled', {
                    detail: {
                        trackName: trackName,
                        artistName: artistName,
                        isFavorite: isFavorite
                    }
                });
                document.dispatchEvent(event);
            } else {
                console.error('Failed to toggle favorite status');
                const errorData = await response.json().catch(() => ({}));
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    });
    
    return button;
}

// Check if a track is in favorites
async function isTrackFavorite(trackName, artistName) {
    try {
        const response = await fetch('/api/playlists/me/');
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        if (!data.tracks) {
            return false;
        }
        
        return data.tracks.some(track => 
            track.name === trackName && track.artist === artistName
        );
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
}

// Create favorite button with automatic favorite status check
async function createFavoriteButtonWithCheck(trackName, artistName) {
    const isFavorite = await isTrackFavorite(trackName, artistName);
    return createFavoriteButton(trackName, artistName, isFavorite);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createFavoriteButton,
        createFavoriteButtonWithCheck,
        isTrackFavorite,
        getCSRFToken
    };
}
