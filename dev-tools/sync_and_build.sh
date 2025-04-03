#!/bin/bash

# --- Configuration ---
LOCAL_DIR="$PWD"       # Directory to monitor locally
REMOTE_USER="root"                   # SSH username for the remote server
REMOTE_HOST="myserver"      # IP address or hostname of the remote server
REMOTE_BASE_DIR="/root/emergency-contacts-print-qr"  # Base directory on the server to sync files into
REMOTE_DOCKER_CONTEXT="${REMOTE_BASE_DIR}" # Path on the server where Docker should build (relative to REMOTE_BASE_DIR if nested, or absolute)
DOCKER_IMAGE_NAME="emergency-contacts-print-qr:latest" # Name and tag for the Docker image
# SYNC_INTERVAL=0 # Sync happens immediately on change detection, not on a fixed interval.
BUILD_INACTIVITY_TIMEOUT=300 # Seconds of inactivity before triggering a build (5 minutes = 300 seconds)
SYNC_EXCLUDE_FILE=".rsyncignore" # Relative to SOURCE_DIR
WATCH_EXCLUDE_FILE=".inotifywaitignore" # Relative to SOURCE_DIR

# --- Script Logic ---
# Ensure local directory exists
if [ ! -d "$LOCAL_DIR" ]; then
  echo "Error: Local directory '$LOCAL_DIR' not found."
  exit 1
fi

# Ensure remote base directory exists (optional, rsync can create it)
# ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p '${REMOTE_BASE_DIR}' && mkdir -p '${REMOTE_DOCKER_CONTEXT}'"
# echo "Ensured remote directories exist."

echo "Monitoring directory: $LOCAL_DIR"
echo "Syncing changes immediately to: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}"
echo "Building Docker image '$DOCKER_IMAGE_NAME' in remote context: $REMOTE_DOCKER_CONTEXT"
echo "Will trigger build after $BUILD_INACTIVITY_TIMEOUT seconds of inactivity following changes..."

# Variable to store the Process ID (PID) of the build timer process
BUILD_TIMER_PID=""

# Function to perform the sync operation
run_sync() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Change detected. Starting sync..."
    echo "--> Running rsync..."
    rsync -avz --delete --exclude-from="${SYNC_EXCLUDE_FILE}" --exclude="${SYNC_EXCLUDE_FILE}" "${LOCAL_DIR}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/"
    # -a: archive mode
    # -v: verbose
    # -z: compress
    # --delete: delete extraneous files
    # --exclude*: ignore specific files/patterns

    if [ $? -ne 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Error: rsync failed."

        return 1 # Indicate failure
    fi
    echo "--> rsync completed successfully."
}

# Function to perform the build operation
run_build() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Build inactivity timeout reached. Starting build process..."

    # Build Docker image via SSH
    echo "--> Triggering Docker build on ${REMOTE_HOST}..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd '${REMOTE_DOCKER_CONTEXT}' && docker build -t '${DOCKER_IMAGE_NAME}' ."

    if [ $? -ne 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Error: Docker build failed on remote server."
        BUILD_TIMER_PID="" # Clear PID on failure maybe? Or let it retry on next change? Clearing for now.
        return 1 # Indicate failure
    fi
    echo "--> Docker build completed successfully on ${REMOTE_HOST}."
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Build process finished."
    BUILD_TIMER_PID="" # Reset timer PID after successful completion
}


# Main monitoring loop
while true; do
    # Wait for any change (create, delete, modify, move) in the directory

    inotifywait -r -q -e modify,create,delete,move --fromfile ${WATCH_EXCLUDE_FILE} "$LOCAL_DIR"

    # --- Sync Immediately ---
    run_sync # Call sync immediately on any detected change

    # --- Debounced Build ---
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Change detected, resetting build timer."

    # If a build timer is already running, kill it to reset the inactivity period
    if [[ -n "$BUILD_TIMER_PID" ]]; then
        # Check if the process actually exists before trying to kill
        if ps -p "$BUILD_TIMER_PID" > /dev/null; then
           echo "--> Resetting build inactivity timer (killing previous timer PID: $BUILD_TIMER_PID)."
           kill "$BUILD_TIMER_PID"
           wait "$BUILD_TIMER_PID" 2>/dev/null # Wait briefly to ensure it's gone, suppress errors
        fi
        BUILD_TIMER_PID=""
    fi

    # Start a new build timer in the background
    # The timer sleeps, then calls the build function
    (
        sleep "$BUILD_INACTIVITY_TIMEOUT"
        # The check comparing $$ to a PID file isn't strictly needed with the kill logic,
        # but kept commented out for reference if complex race conditions emerge.
        # if [[ $$ == $(cat /tmp/build_timer.pid 2>/dev/null) ]]; then
           run_build
        # fi
    ) &

    # Store the PID of the background sleep process for the build timer
    BUILD_TIMER_PID=$!
    # Optional: Store PID in a file for more complex scenarios
    # echo $BUILD_TIMER_PID > /tmp/build_timer.pid
    echo "--> Build timer started (PID: $BUILD_TIMER_PID). Waiting for $BUILD_INACTIVITY_TIMEOUT seconds of inactivity to trigger build."

done
