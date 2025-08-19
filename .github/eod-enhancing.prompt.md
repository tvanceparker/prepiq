---
mode: agent
tools: 
---

**Goal**
To enhance and harden the forecast engine basic

**The way it works**
The end of day for the basic tier works like this:
1. The EOD runner starts according to their schedule.
2. The EOD Service is triggered and detects what tier they are one (we are doing basic ATM)
3. The the EOD service triggers the ForecastingEngineBasic
4. It see's if sales data is available for the day the ForecastingEngineBasic is pro
cessing.
    - If there is no sales data an alert should be created, saying missing sales data (it already does this)
5. If there is sales data, it evaluates and record the forecast accuracy 
    - It does this for the whole forecast time frame so like 14 days if avail
6. It evaluates and records the daily forecast accuracy
7. It gets the active menu items
8. It checks out the accuracy and determines if it should retrain the model or not
9. It then retrains the model if necessary
10. It then saves the model to a file location on the server (hopefully)
11. It then generates the forecast, and writes to the database

