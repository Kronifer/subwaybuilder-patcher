#!/bin/bash
# --------------------------------------------------------------
# Simple shell launcher for Subway Builder Patcher GUI
# --------------------------------------------------------------

# Change to the directory where this script resides
cd "$(dirname "$0")"

# Check if node command is available
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed or not in PATH."
    echo "Please install Node.js and ensure 'node' is in system PATH."
    exit 1
fi

# Start server in a new terminal window
# On Linux (GNOME), use gnome-terminal; on macOS, use open -a Terminal
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    gnome-terminal -- bash -c "node gui_server.js; exec bash"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'\" && node gui_server.js"'
else
    echo "Unsupported OS type. Please start 'node gui_server.js' manually."
fi

# Wait a little so the server has time to start
sleep 1

# Open browser to GUI (localhost:3000)
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
elif command -v open >/dev/null 2>&1; then
    open http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser."
fi

# Optional: pause in the main window if you want to see logs
# read -p "Press Enter to continue..."
