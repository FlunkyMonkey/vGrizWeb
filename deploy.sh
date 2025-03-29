#!/bin/bash

# Exit on error
set -e

# Log function for better readability
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to pull latest changes from the repository
pull_latest() {
    log "Pulling latest changes from GitHub repository"
    cd /var/www
    git pull origin main
    log "Repository updated successfully"
}

# Function to update a specific site
update_site() {
    local site_name=$1
    
    log "Starting update for $site_name"
    
    # Navigate to site directory
    cd "/var/www/$site_name"
    
    # Check if package.json exists (need to install dependencies)
    if [ -f "package.json" ]; then
        log "Installing dependencies for $site_name"
        npm install
        
        # Build the application if it has a build script
        if grep -q "\"build\"" package.json; then
            log "Building application for $site_name"
            npm run build
        fi
    fi
    
    # Set correct permissions
    log "Setting permissions for $site_name"
    chown -R www-data:www-data "/var/www/$site_name"
    
    log "Update for $site_name completed successfully"
}

# Function to update nginx configuration
update_nginx() {
    log "Checking for nginx configuration changes"
    
    # Check if any nginx configs have changed by comparing modification times
    if [ -n "$(find /etc/nginx/sites-available -newer /var/www/.git/FETCH_HEAD -name '*.conf' 2>/dev/null)" ]; then
        log "Nginx configuration has been updated, reloading nginx"
        nginx -t && systemctl reload nginx
        log "Nginx reloaded successfully"
    else
        log "No changes to nginx configuration"
    fi
}

# Display script header
echo "====================================================="
echo "  Multi-Site Deployment Script - $(date '+%Y-%m-%d')"
echo "====================================================="

# Get deployment option
echo "What would you like to do?"
echo "1. Update everything (pull latest code and update all sites)"
echo "2. Update Family Cabin site only"
echo "3. Update Regulogix site only"
echo "4. Update Vgriz site only"
echo "5. Update nginx configuration only"
echo "6. Cancel"
read -p "Enter option (1-6): " option

case $option in
    1)
        log "Starting complete update"
        pull_latest
        update_site "familycabin"
        update_site "regulogix"
        update_site "vgriz"
        update_nginx
        log "All updates completed successfully"
        ;;
    2)
        pull_latest
        update_site "familycabin"
        ;;
    3)
        pull_latest
        update_site "regulogix"
        ;;
    4)
        pull_latest
        update_site "vgriz"
        ;;
    5)
        pull_latest
        update_nginx
        ;;
    6)
        log "Update cancelled"
        exit 0
        ;;
    *)
        log "Invalid option. Exiting."
        exit 1
        ;;
esac

echo "====================================================="
echo "  Update Complete!"
echo "====================================================="

log "Script finished"
