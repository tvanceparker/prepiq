---
mode: agent
tools: ['extensions', 'runTests', 'codebase', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'findTestFiles', 'searchResults', 'githubRepo', 'runCommands', 'runTasks', 'editFiles', 'runNotebooks', 'search', 'new', 'copilotCodingAgent', 'activePullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
---
Define the task to achieve, including specific requirements, constraints, and success criteria.
- I want you to be a code refactoring expert.
- I want my codebase to be refactored just like how app/services and app/routes are structured with the dtos in their own admin_dto. 
- The app/schemas aren't quite structured correctly
- Look in app/schemas/admin_dto.py and that is how everything should be structured, as those data models are used in the service and route layer. I think we can get rid of the adminInterfaces.d.ts because i was converting
- Change, and get rid of anything that uses the datamodels that are used per table. Those are not correct anymore (e.g. batch_recipe_dto or employee_dto.) They should use the same dto names as the service and routes do. Like admin service,routes,schemas, and in the frontend how admin interface and the group of admin pages uses those datamodels also.
- If there are services, routes or hooks/components that don't use datamodels fix and update that, keep naming and file conventions like admin routes/services/dto/interface 
- Make sure to update all imports and references to the old DTO names throughout the codebase.
- If you encounter any issues or have questions during the refactoring process, please ask for clarification.
- After all this is done please, run a mysql server, and install the notes/schema_with_data.sql file for me. 
- Then run both frontend and backend to connect with that mysql server and we will see if it works.