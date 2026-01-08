/** @param {NS} ns */
import {scanForAllServers, getValidServerList, ensureScriptExists, getRootAccess, killScript
  , launchScriptAttack, decideServerAction} from "./myFunctions.js";
export async function main(ns) 
{ 

  const selfName = "neo-overmind.js";
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";

  // Create an array to hold required scripts.
  const scripts = [weakenScript, growScript, hackScript];

  const sleepTime = 500; // Time to sleep between iterations (0.5 seconds)
  
  let serverStates = {};
  let scanCounter = 0;
  let validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
  
  while(true)
  {   
    // Re-scan for servers every 10 loops.
    if(scanCounter >= 10)
    {
      scanCounter = 0;
      validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
    }
    
    // Increment scan counter.
    scanCounter++;    
    
    for(let target of validatedServersList)
    {   
      // Check if we have an entry for this server in serverStates.      
      if(!(target in serverStates))
      {
        // Initialize server state tracking.
        serverStates[target] = {
          phase: "analyze",
          nextAction: Date.now(),
          setupComplete: false,
          hasError: false,          
        };
      }

      // Check if this server has an error.
      if(serverStates[target].hasError == true)
      {
        // Skip this server, it has an error.
        continue;
      }

      // Check if this is the first time we are seeing this server.
      if(serverStates[target].setupComplete == false)
      {
        ns.printf("[%s]-INFO: Performing first time setup for server %s...", selfName, target);

        // Check for root access first.
        if(ns.hasRootAccess(target) == false)
        {
          const rootAccess = getRootAccess(ns, target);
          if(rootAccess == false)
          {
            // This block activates if root access has not been granted.
            ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Continuing to next server.", selfName, target);
            serverStates[target].hasError = true;
            continue;
          }      
        }

        // Iterate through each required script and ensure it exists on the target server.
        // Then ensure it is not running.
        for(const script of scripts)
        {
          if(ensureScriptExists(ns, script, target) == false)
          {
            ns.printf("ERROR: Unable to verify %s exists on %s. This server needs to be investigated for issues.", script, target);
            serverStates[target].hasError = true;
            break;
          }

          // Ensure all scripts are stopped before proceeding.
          if(killScript(ns,script,target) == false)
          {
            ns.printf("ERROR: Unable to kill existing %s on %s. Skipping to next target server.", script, target);
            serverStates[target].hasError = true;
            break;
          }
        }  

        // Mark setup as complete for this server.
        serverStates[target].setupComplete = true;
        ns.printf("[%s]-SUCCESS: Setup complete for server %s. All required scripts verified and no scripts running.", selfName, target);
      }

      // Check if it's time to take action on this server.
      if(Date.now() >= serverStates[target].nextAction)
      {
        // Time to take action.
        const action = decideServerAction(ns, target);

        switch(action)
        {
          case "weaken":
                // Use launchScriptAttack to weaken to minSec
                launchScriptAttack(ns, weakenScript, target, target, minSec);

                // Update next action time.
                const actionCooldown = ns.getWeakenTime(target);
                serverStates[target].nextAction = Date.now() + actionCooldown;
                break;

          case "grow":
              // Use launchScriptAttack to grow to maxMoney
              launchScriptAttack(ns, growScript, target, target, maxMoney);

              // Update next action time.
              const growCooldown = ns.getGrowTime(target);
              serverStates[target].nextAction = Date.now() + growCooldown;
              break;

          case "hack":
              // Use launchScriptAttack to hack down to minMoney
              launchScriptAttack(ns, hackScript, target, target, minMoney);

              // Update next action time.
              const hackCooldown = ns.getHackTime(target);
              serverStates[target].nextAction = Date.now() + hackCooldown;
              break;

          default:
            ns.printf("[%s]-ERROR: Unable to determine action for %s.", selfName, target);
            break;
        }

      }   
    }
    // Sleep for a time once all servers have been processed.
    await ns.sleep(sleepTime);
  }
}