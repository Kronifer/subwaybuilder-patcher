#!/bin/bash
# --------------------------------------------------------------
# Subway Builder Patcher - Installer (Shell version)
# --------------------------------------------------------------

# Set title
echo -ne "\033]0;Subway Builder Patcher - Installer\007"

# Set text color (green). Reset at the end.
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo
echo "========================================================"
echo -e "${GREEN}  Installing necessary files...${NC}"
echo "  (This can take a couple minutes)"
echo "========================================================"
echo

echo " > Step 1/2: Installing standard packages..."
npm install

echo
echo " > Step 2/2: Installing GUI dependencies..."
npm install express socket.io open big-json --save

echo " > Step 2/2: Installing mapPatcher dependencies..."
cd patcher/packages/mapPatcher || {
    echo "ERROR: Could not change directory to patcher/packages/mapPatcher"
    exit 1
}
npm install
npm install adm-zip --save
cd ../../..

echo
echo "========================================================"
echo -e "${GREEN}  Installation complete!${NC}"
echo "  You can now run './Start_GUI.sh'"
echo "========================================================"
echo

