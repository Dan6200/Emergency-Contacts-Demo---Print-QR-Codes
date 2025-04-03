#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# Treat unset variables as an error when substituting.
# Pipe failures should exit the script.
set -euo pipefail

# --- Configuration ---

# Determine the script's directory and the project root
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
# Assume the script is in a subdirectory (like 'dev-tools') of the project root
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

# Default values
DEFAULT_SOURCE_DIR="$PROJECT_ROOT"
DEFAULT_EXCLUDE_FILE=".rsyncignore" # Relative to SOURCE_DIR
REMOTE_TARGET="root@myserver:" # Required, format: user@host:path

# --- Helper Functions ---

usage() {
  echo "Usage: $0 -t <remote_target> [-s <source_dir>] [-e <exclude_file>]"
  echo "  -t <remote_target> : Remote destination (e.g., user@host:~/path/to/dest/)"
  echo "  -s <source_dir>    : Local directory to watch and sync (default: $DEFAULT_SOURCE_DIR)"
  echo "  -e <exclude_file>  : Path to rsync exclude file (default: <source_dir>/$DEFAULT_EXCLUDE_FILE)"
  echo "  -h                 : Show this help message"
  exit 1
}

# --- Argument Parsing ---

SOURCE_DIR="$DEFAULT_SOURCE_DIR"
EXCLUDE_FILE_NAME="$DEFAULT_EXCLUDE_FILE" # Store the name/relative path first

while getopts "ht:s:e:" opt; do
  case $opt in
    h) usage ;;
    t) REMOTE_TARGET="$OPTARG" ;;
    s) SOURCE_DIR="$OPTARG" ;;
    e) EXCLUDE_FILE_NAME="$OPTARG" ;;
    *) usage ;;
  esac
done
shift $((OPTIND-1))

# --- Validation ---

if [[ -z "$REMOTE_TARGET" ]]; then
  echo "Error: Remote target (-t) is required." >&2
  usage
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: Source directory '$SOURCE_DIR' not found." >&2
  exit 1
fi

# Resolve the exclude file path relative to the source directory if it's not absolute
if [[ "$EXCLUDE_FILE_NAME" != /* ]]; then
  EXCLUDE_FILE="$SOURCE_DIR/$EXCLUDE_FILE_NAME"
else
  EXCLUDE_FILE="$EXCLUDE_FILE_NAME"
fi

# Check for required commands
if ! command -v inotifywait &> /dev/null; then
    echo "Error: 'inotifywait' command not found. Please install 'inotify-tools'." >&2
    exit 1
fi
if ! command -v rsync &> /dev/null; then
    echo "Error: 'rsync' command not found." >&2
    exit 1
fi

# Ensure source and target paths end with a slash for rsync
[[ "$SOURCE_DIR" != */ ]] && SOURCE_DIR+="/"
[[ "$REMOTE_TARGET" != */ ]] && REMOTE_TARGET+="/"

# --- Main Loop ---

echo "Watching for changes in '$SOURCE_DIR'..."
echo "Syncing to '$REMOTE_TARGET'"
if [[ -f "$EXCLUDE_FILE" ]]; then
    echo "Using exclude file '$EXCLUDE_FILE'"
else
    echo "No exclude file found at '$EXCLUDE_FILE', syncing all files."
fi
echo "Press Ctrl+C to stop."

while true; do
  echo "Waiting for file changes..."
  # Watch for modify, create, delete events recursively
  inotifywait -r -e modify,create,delete --exclude '(\.git/|\.swp$|\.swx$)' "$SOURCE_DIR"

  echo "Changes detected. Syncing..."

  # Build rsync command options
  RSYNC_OPTS=(
    --delete      # Delete files on the destination that don't exist locally
    -avzP         # Archive, verbose, compress, progress, partial
  )

  # Add exclude options if the file exists
  if [[ -f "$EXCLUDE_FILE" ]]; then
    RSYNC_OPTS+=(--exclude-from="$EXCLUDE_FILE")
    # Also exclude the ignore file itself if it's inside the source dir
    if [[ "$EXCLUDE_FILE" == "$SOURCE_DIR"* ]]; then
       RSYNC_OPTS+=(--exclude="$(basename "$EXCLUDE_FILE")")
    fi
  fi

  # Execute rsync
  if rsync "${RSYNC_OPTS[@]}" "$SOURCE_DIR" "$REMOTE_TARGET"; then
    echo "Sync successful at $(date)"
  else
    echo "Warning: rsync finished with errors at $(date)" >&2
    # Optional: exit on error? Or just continue watching?
    # exit 1
  fi
  echo "----------------------------------------"

done
