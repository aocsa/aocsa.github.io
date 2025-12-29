#!/bin/bash

# Deploy script for GitHub Pages
# Builds the project and pushes dist/ contents to gh-pages branch

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment to gh-pages...${NC}"

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check for uncommitted changes in source
if [[ -n $(git status --porcelain --ignore-submodules) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes in your working directory${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Store current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "Current branch: ${GREEN}$CURRENT_BRANCH${NC}"

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build

# Verify dist exists
if [[ ! -d "dist" ]]; then
    echo -e "${RED}Error: dist/ directory not found after build${NC}"
    exit 1
fi

# Ensure CNAME exists in dist
if [[ -f "CNAME" && ! -f "dist/CNAME" ]]; then
    cp CNAME dist/
    echo -e "${GREEN}Copied CNAME to dist/${NC}"
fi

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo -e "Using temp directory: $TEMP_DIR"

# Copy dist contents to temp
cp -r dist/* "$TEMP_DIR/"

# Check if gh-pages branch exists locally or remotely
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo -e "${GREEN}Local gh-pages branch exists${NC}"
    git checkout gh-pages
elif git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
    echo -e "${GREEN}Remote gh-pages branch exists, checking out...${NC}"
    git checkout -b gh-pages origin/gh-pages
else
    echo -e "${YELLOW}Creating new gh-pages branch (orphan)...${NC}"
    git checkout --orphan gh-pages
    git rm -rf . 2>/dev/null || true
fi

# Remove all files except .git
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

# Copy dist contents to root
cp -r "$TEMP_DIR"/* .

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Add all files
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to deploy${NC}"
else
    # Get the latest commit message from source branch for reference
    COMMIT_MSG="Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}Created commit: $COMMIT_MSG${NC}"

    # Push to remote
    echo -e "${YELLOW}Pushing to origin/gh-pages...${NC}"
    git push origin gh-pages
    echo -e "${GREEN}Successfully pushed to gh-pages${NC}"
fi

# Switch back to original branch
echo -e "${YELLOW}Switching back to $CURRENT_BRANCH...${NC}"
git checkout "$CURRENT_BRANCH"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Visit: https://aocsa.dev or https://aocsa.github.io"
