#!/bin/bash

# Setup Sharp for the current platform
echo "Setting up Sharp for current platform..."

# Remove existing Sharp
pnpm remove sharp

# Install Sharp for current platform using npm
case "$(uname -s)" in
   Linux*)
     echo "Installing Sharp for Linux..."
     npm install --platform=linux --arch=x64 sharp
     ;;
   Darwin*)
     echo "Installing Sharp for macOS..."
     if [[ $(uname -m) == 'arm64' ]]; then
       echo "Detected Apple Silicon (ARM64)"
       npm install --platform=darwin --arch=arm64 sharp
     else
       echo "Detected Intel (x64)"
       npm install --platform=darwin --arch=x64 sharp
     fi
     ;;
   CYGWIN*|MINGW*|MSYS*)
     echo "Installing Sharp for Windows..."
     npm install --platform=win32 --arch=x64 sharp
     ;;
   *)
     echo "Unsupported OS: $(uname -s)"
     exit 1
     ;;
esac

echo "Sharp setup completed!"
