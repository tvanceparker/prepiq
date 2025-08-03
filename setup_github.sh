#!/bin/bash

# PrepIQ GitHub Setup Script
# This script will help you upload your PrepIQ project to GitHub

echo "🚀 PrepIQ GitHub Setup"
echo "======================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    
    echo "Adding all files to git..."
    git add .
    
    echo "Creating initial commit..."
    git commit -m "Initial commit: PrepIQ Restaurant Management System

- Complete FastAPI backend with JWT authentication
- React frontend with Material-UI and Chakra UI
- MySQL database with comprehensive restaurant schema
- Sales forecasting engine with ML models
- Inventory management with real-time tracking
- Team management with role-based permissions
- WebSocket support for real-time communication
- Multi-tier subscription system (Basic, Pro, Enterprise)
- End-of-day automation and scheduling
- Comprehensive API documentation"
    
    echo ""
    echo "✅ Git repository initialized with initial commit"
    echo ""
    echo "Next steps:"
    echo "1. Create a new PRIVATE repository on GitHub called 'prepiq'"
    echo "2. Copy the remote URL from GitHub"
    echo "3. Run: git remote add origin <your-github-repo-url>"
    echo "4. Run: git branch -M main"
    echo "5. Run: git push -u origin main"
    echo ""
    echo "Example:"
    echo "git remote add origin https://github.com/yourusername/prepiq.git"
    echo "git branch -M main" 
    echo "git push -u origin main"
    
else
    echo "Git repository already exists!"
    echo "Current status:"
    git status --short
    
    echo ""
    echo "To push to GitHub:"
    echo "1. Ensure you have a remote: git remote -v"
    echo "2. Add your changes: git add ."
    echo "3. Commit: git commit -m 'Your commit message'"
    echo "4. Push: git push origin main"
fi

echo ""
echo "📋 Remember to:"
echo "- Keep the repository PRIVATE to protect your code"
echo "- Never commit .env files (already in .gitignore)"
echo "- Update the README with your actual GitHub username"
echo "- Consider adding a LICENSE file if needed"
