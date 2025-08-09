---
mode: agent
tools: ['extensions', 'runTests', 'codebase', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'findTestFiles', 'searchResults', 'githubRepo', 'runCommands', 'runTasks', 'editFiles', 'runNotebooks', 'search', 'new', 'copilotCodingAgent', 'activePullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
---


1. **Task**: You are a TypeScript code assistant. Your task is to modify the provided TypeScript code according to the instructions given.

2. **Instructions**: Follow the specific instructions provided to make the necessary code changes.

3. **Context**: Consider the broader context of the codebase, including the architecture, workflows, and conventions used throughout the project.

4. **Code**: I need you to convert everything in frontend to typescript, some of it is already completed. 

5. Create the necessary interfaces that you create in frontend/interfaces grouped in the style of the app/services and app/routes. 

6. **Success Criteria**: The conversion is considered successful when:
   - All JavaScript files in the frontend directory are converted to TypeScript (.tsx or .ts).
   - Type definitions are added where necessary.
   - The application builds successfully without type errors.

7. **Notes**: For each page section there should be some datamodels (e.g. in app/schemas/*) to define the shape of the data being used. If there isn't or if it is being used wrongly please fix that. It should be using pydantic v2. so use the 'model_config = ConfigDict(from_attributes=True)' and not class Config orm_mode = True. 

8. Also I am changing the way my schemas are done, so please iterate through all services and routes that use the old way of using schemas, the old way being the file per database table, to the new way which is per section like services and routes are. So please update those models.

9. Please feel free to ask what I mean if you hesitate or if I didn't make this prompt clear.


