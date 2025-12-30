
import {launchScriptAttack, getRootAccess, calculateGrowthRateMultiplier} from "./myFunctions.js";

export async function main(ns) 
{
  let sectionName = "ScanSection";

  const weakenScript = "weaken.js";
  const growScript = "grow.js";
  const hackScript = "hack.js";

  let target = "";
  const homeComputer = ns.getServer().hostname;  

  // Check if the correct number of arguments were provided to this script. CAN EXIT HERE.
  if(ns.args.length != 0)
  {
    target = ns.args[0];
  }
  else
  {
    ns.printf("ERROR: Incorrect argument provided. Please provide only a server hostname.");
    ns.exit();
  }

  const sleepTime = ns.getHackTime(target) / 2;
    
  const serverBaseSecurity = ns.getServerBaseSecurityLevel(target);
  const serverMinSecurity = ns.getServerMinSecurityLevel(target);

  // Taking the base security rating and minus the min security rating yields
  // a range of values that we can work with.
  const serverSecurityRange = serverBaseSecurity - serverMinSecurity;

  const serverSecurityLowerThreshold = (serverSecurityRange * 0.20) + serverMinSecurity;
  const serverSecurityUpperThreshold = (serverSecurityRange * 0.80) + serverMinSecurity; 

  const serverMaxMoney = ns.getServerMaxMoney(target);
  const serverMoneyUpperThreshold = serverMaxMoney * 0.95;
  const serverMoneyLowerThreshold = serverMaxMoney * 0.50;  

  const reserveThreads = 8;      

  // Verify the target exists.
  const neighborFound = ns.serverExists(target);

  // Check if the target is valid. CAN EXIT HERE.
  if(neighborFound == false)
  {
    ns.printf("ERROR: Unable to find target server %s. Exiting.", target);
    ns.exit();
  }

  while(true)
  {
    let weakenSectionReportsGood = false;
    let growSectionReportsGood = false;
    
    if(ns.hasRootAccess(target) == false)
    {
      const rootAccess = getRootAccess(ns, target);
      if(rootAccess == false)
      {
        // This block activates if root access has not been granted.
        ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Exiting.", sectionName, target);
        ns.exit();
      }      
    }

    sectionName = "SecuritySection";

    // This value is the current security value for the server.
    const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);   

    // Check if the current security level is greater than the upper threshold.
    if(serverCurrentSecurityLevel > serverSecurityUpperThreshold)
    {
      // If the secuirty is this high, its possible this script has already begun.
      // Check if the weaken script is already running.
      if((ns.isRunning(weakenScript, homeComputer, target)) == false)
      {
        // Script is NOT running. If there are any other scripts running
        // it will be either grow or hack scripts.
        ns.kill(hackScript, homeComputer, target);
        ns.kill(growScript, homeComputer, target);

        const result = launchScriptAttack(ns, weakenScript, target, homeComputer, serverMinSecurity, reserveThreads, true);

        if(result == true)
        {
          // Attack launched successfully.
          ns.printf("SCUCCESS: Launched %s attack on %s.", weakenScript, target);          
        }
        else
        {
          // Attack failed to launch successfully.
          ns.printf("ERROR: Failed to launch %s attack on %s.", weakenScript, target);
        }
      }
      else
      {
        // Script is already running, leave it alone for now.
        ns.printf("[%s]-INFO: %s is already running on %s. Going to sleep for %d %s.", sectionName, weakenScript, homeComputer, Math.floor(sleepTime / 1000), (sleepTime > 1000 ? "seconds": "second"));
      }
    }
    else if(serverCurrentSecurityLevel < serverSecurityLowerThreshold)
    {
      // The targets security rating is now in the lower end and if the weaken script
      // is still running it should be stopped.

      // Check for the script and issue a stop command if still running.
      ns.printf("[%s]-INFO: %s security level below lower threshold, determining if weaken script is running.", sectionName, target);

      if(ns.isRunning(weakenScript, homeComputer, target) == true)
      {
        //script is running, issue terminate command.
        ns.printf("[%s]-WARN: Found weaken script running, sending kill command.", sectionName);
        ns.kill(weakenScript, homeComputer, target);
        if(ns.isRunning(weakenScript, homeComputer, target) == false)
        {
          ns.printf("[%s]-INFO: Weaken script no longer detected. Moving to next section of code.", sectionName);
          weakenSectionReportsGood = true;
        }
        else
        {
          ns.printf("[%s]-ERROR: Unable to kill weaken script, check logs for errors.");
        }
      }
      else
      {
        // Security level is below lower threshold..
        // Log and move on, no need to kill any scripts.
        ns.printf("[%s]-INFO: Weaken script NOT detected. Moving to next section of code.", sectionName);
        weakenSectionReportsGood = true;
      }
    }
    else
    {
      ns.printf("INFO: Security level acceptable. Moving to money stage.");
      weakenSectionReportsGood = true;
    }

    if(weakenSectionReportsGood == true)
    {
      // Money Section //

      // Create a constant that represents the value at which money should be grown
      // instead of hacked.
      const serverCurrentMoney = ns.getServerMoneyAvailable(target);

      if(serverCurrentMoney < serverMoneyLowerThreshold)
      {
        // Initiate server money growing
        if((ns.isRunning(growScript, homeComputer, target)) == true)
        {
          // Script is already running, leave it alone for now.
          ns.printf("[%s]-WARN: %s is already running on %s. Going to sleep for %d seconds.", sectionName, growScript, homeComputer, Math.floor((sleepTime / 1000)));          
        }
        else
        {
          ns.kill(weakenScript, homeComputer, target);
          ns.kill(hackScript, homeComputer, target);

          const newGrowthRateMultipler = calculateGrowthRateMultiplier(ns, target);
          
          const result = launchScriptAttack(ns, growScript, target, homeComputer, newGrowthRateMultipler, reserveThreads, true);

          if(result == true)
          {
            // Attack launched successfully.
            ns.printf("SCUCCESS: Launched %s attack on %s.", growScript, target);
            
          }
          else
          {
            // Attack failed to launch successfully.
            ns.printf("ERROR: Failed to launch %s attack on %s.", growScript, target);
          }
        }
      }
      else if(serverCurrentMoney > serverMoneyUpperThreshold)
      {
        // This is a good time to shut down the growing script and
        // allow the hack section to take over.
        const scriptIsActive = ns.isRunning(growScript, homeComputer, target);
        if(scriptIsActive == true)
        {
          ns.printf("INFO: Detected script active but money above upper threshold on server: %s. Killing script %s.", homeComputer, growScript);
          ns.kill(growScript, homeComputer, target);
          if(ns.isRunning(growScript, homeComputer, target) == false)
          {
            ns.printf("[%s]-INFO: %s script no longer detected. Moving to next section of code.", sectionName, growScript);
            growSectionReportsGood = true;
          }
          else
          {
            ns.printf("[%s]-ERROR: Unable to kill weaken script, check logs for errors.");
          }
        }
        else
        {
          ns.printf("[%s]-INFO: %s script NOT detected. Moving to next section of code.", sectionName, growScript);
          growSectionReportsGood = true;
        }
      }
      else
      {
        ns.printf("INFO: Entering money section #4.");
        growSectionReportsGood = true;
      }
    }

    if(growSectionReportsGood == true)
    {
      ns.printf("INFO: Entering hack section #1.");
      // Hack Section // 

      // Determine if the script is currently running.
      // If the script is NOT running, go ahead and launch it.
      const scriptIsRunning = ns.isRunning(hackScript, homeComputer, target);

      if(scriptIsRunning == false)
      {
        ns.printf("INFO: Entering hack section #2.");

        ns.printf("ERROR: Detected that the %s is NOT running on %s. Attempting to launch %s.", hackScript, homeComputer, hackScript);

        ns.kill(weakenScript, homeComputer, target);
        ns.kill(growScript, homeComputer, target);

        // Launch weaken attack.
        const result = launchScriptAttack(ns, hackScript, target, homeComputer, serverMoneyLowerThreshold, reserveThreads, true);
        
        if(result == true)
        {
          // Attack launched successfully.
          ns.printf("SCUCCESS: Launched %s attack on %s.", hackScript, target);
          
        }
        else
        {
          // Attack failed to launch successfully.
          ns.printf("ERROR: Failed to launch %s attack on %s.", hackScript, target);
        }
      }
      else
      {
        ns.printf("INFO: Entering hack section #3.");
        ns.printf("WARN: %s is running. Sleeping for %d seconds.", hackScript, sleepTime/1000);
      }
    }

    //ns.printf("Sleeping for %d seconds", sleepTime / 1000);

    // Sleep for ~20 seconds.
    await ns.sleep(sleepTime);
  }
}