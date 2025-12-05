#!/bin/bash

# Kill any existing instances
pkill -9 -f "tsx watch" 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
sleep 1

# Start the server
cd "$(dirname "$0")"
PORT=3001 npm run dev
