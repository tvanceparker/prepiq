---
mode: agent
tools: ['extensions', 'runTests', 'codebase', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'fetch', 'findTestFiles', 'searchResults', 'githubRepo', 'runCommands', 'runTasks', 'editFiles', 'runNotebooks', 'search', 'new']
---
Define the task to achieve, including specific requirements, constraints, and success criteria.

I need to set up this workspace for coding with this. 

Prerequisites
1. I want you to look in all my folders for what modules i actually use, in python and in node so you can adjust my package.json and requirements.txt accordingly.
2. Install all python and node packages into proper virtual environments. though I'm not sure node uses a virtual environment, just the pythong maybe, 
 **Requirements**
 1. For everything to work correctly
 2. For the database, which i already forgot the username and password to, the mariahdb to work and be seeded via #notes/schema_with_data.sql prepiq_dev prepiq_dev_password maybe? you made it I dont remember.
 3.I need to set up a virtual python environment that is easy to use, and to show me how it works and how to use it. I usually just will do pip install scikit-learn but I guess that's not how you do it in real life
 4. I need to be able to run uvicorn main:app --reload with a host and port if I want. Right in my shell and it works everytime. I also want a Task that says maybe Start Backend
 5. Speaking of shell I need it to be able to run zsh
 6. I need it to run in the frontend folder npm start and run with no problems, I also want a Task that says maybe Start Frontend and possibly another task to run both at the same time maybe, idk.
 7. I need you to install all the required packages and stuff with dependecies. 
 8. Everything is done once I can log in, or you using the MCP playwright server as testuser2 password password. 
 9. Iterate though this, and make sure you tell me about using the virtual environment because that is very new to me and still a little weird.
 10. You can use the MCP playwright server, I guess its on github at https://github.com/executeautomation/mcp-playwright
 11. After looking over my codebase please install usefully, but not bloaty extentions for me thanks.
 
 My project uses fastapi, most things can be either found in requirements-dev.txt and requirements.txt 

 **NOTE**
 This is a work in progress and may not be fully functional yet. should boot and everything should work as expected. its just not done
 My zsh terminal in arch linux sometimes crashes on me, and I'm not sure why yet, but you can help me investigate this issue if it happens again.
 sudo pacman -S works fine with no passwd, and yay -S works fine with no password. 