---
mode: agent
tools: ['codebase', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'fetch', 'findTestFiles', 'searchResults', 'githubRepo', 'extensions', 'runTests', 'editFiles', 'runNotebooks', 'search', 'new', 'runCommands', 'runTasks']
---
Define the task to achieve, including specific requirements, constraints, and success criteria.
**Goal**
To complete the onboarding process for a restaurant owner by uploading their historical sales data and any other required information. This is only for the basic tier, so no recipe linking, supplier management, or inventory data. 

**Requirements**
- The onboarding process must include a welcome email with account details.
- The customer must complete a profile setup form for their restaurant.
- Add this user to the Admin permissions so he has all permissions for everything (please refer to the `app/services/admin.py` for more info on permissions and how they work. And look in `app/services/permission_service.py` because we might have to run that static function to upload that restaurant with the information)
    - This permission service might have to be refactored a bit as it was just for dev perpurposes but obviously needs to be more robust for production use, making sure it doesn't edit other restaurant_id's in the process. And we need to be sure it adds this user to the Admin role for all permissions.
- The customer must be guided through the initial product setup.
- The customer must upload historical sales by menu item data (this is how it all works period), and we have to link those menu items sales to the corresponding menu items in the database (please see `notes/schema_with_data.sql` for how the database is designed and how it works)
- Based on the address it pulls historical weather data uploads that to database, and trains the models using the h2o in end of day service.
- Please look at the `app/services/forecasting_engine_basic.py` for more details on the forecasting process, and what data we need from them to get this going. 
- Make it optional to add roles and permissions as well as user management for other employees. They can do it later in the app if they want to. 

**Constraints**
- The onboarding process must be completed within 7 days of account creation.
- The process must be accessible via both desktop and mobile devices. So that means the react code in the /frontend and /mobile folders.
- The historical sales data might be in multiple different formats, and we have to figure out how we are going to handle that.
- 

**Success Criteria**
- The customer successfully logs in and accesses the onboarding materials.
- The customer completes the profile setup form with all required fields.
- The customer successfully configures the product settings as per the guidelines.
- The customer uploads their historical sales data in the required format.
- The customer correctly has the menu items and the sales data correctly linked.
- The customer has access to the initial product setup guidance.
- The customer is under the 'admin' role with all permissions granted.
**Structure**
- Backend: make a app/services/onboarding_service.py and a app/routes/onboarding_routes.py and a app/schemas/onboarding_dto.py

-Frontend and mobile: in frontend/src/pages/onboarding create 2 folders named components and hooks and also create a frontend/src/api/onboarding.ts and a frontend/src/interfaces/onboarding.ts do that for also the mobile folder, just in mobile form. 

- Make it a step by step process with clear instructions for the user. 

**Future Integration setup** 

- Plan on being able to integrate with their POS provider in the future, as well as this software itself being a POS system itself, which would be nice. 