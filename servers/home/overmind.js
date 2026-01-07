/** @param {NS} ns */
import {scanForAllServers, getValidServerList, launchScriptAttack,
 ensureScriptExists, getRootAccess, calculateGrowthRateMultiplier} from "./myFunctions.js";
export async function main(ns) 
{ 
  const weakenScript = "weaken.js";
  const growScript = "grow.js";
  const hackScript = "hack.js";

  const sleepTime = 3000;  

  while(true)
  {   
    const validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
    for(let target of validatedServersList)
    {      
      let sectionName = "ScanSection";

      if(ns.hasRootAccess(target) == false)
      {
        const rootAccess = getRootAccess(ns, target);
        if(rootAccess == false)
        {
          // This block activates if root access has not been granted.
          ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Continuing to next server.", sectionName, target);
          continue;
        }      
      }

      ns.printf("[%s]-SUCCESS: Found server: %s", sectionName, target);

      const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);
      const serverBaseSecurity = ns.getServerBaseSecurityLevel(target);
      const serverMinSecurity = ns.getServerMinSecurityLevel(target);

      // Taking the base security rating and minus the min security rating yields
      // a range of values that we can work with.
      const serverSecurityRange = serverBaseSecurity - serverMinSecurity;
      
      const serverSecurityLowerThreshold = (serverSecurityRange * 0.20) + serverMinSecurity;
      const serverSecurityUpperThreshold = (serverSecurityRange * 0.80) + serverMinSecurity;

      const serverMaxMoney = ns.getServerMaxMoney(target);
      const serverMoneyUpperThreshold = serverMaxMoney * 0.95;
      const serverMoneyLowerThreshold = serverMaxMoney * 0.75;

      let securitySectionReportsGood = false;
      let moneySectionReportsGood = false;

      sectionName = "SecuritySection";

      if(serverCurrentSecurityLevel > serverSecurityUpperThreshold)
      {
        ns.printf("[%s]-INFO: %s security rating is above upper threshold.", sectionName, target);
        if((ns.isRunning(weakenScript, target, target)) == false)
        {
          // Script is NOT running. If there are any other scripts running
          // it will be either grow or hack scripts.
          if(ns.isRunning(hackScript, target, target) == true)
          {
            ns.kill(hackScript, target, target);
          }
          if(ns.isRunning(growScript, target, target) == true)
          {
            ns.kill(growScript, target, target);
          }

          ns.printf("[%s]-INFO: Determined %s is not running.", sectionName, weakenScript);

          if(ensureScriptExists(ns, weakenScript, target) == true)
          {
            const result = launchScriptAttack(ns, weakenScript, target, target, serverMinSecurity, 0, false);
            
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
            ns.printf("[%s]-ERROR: Unable to verify %s exists on %s. This server needs to be investigated for issues.", sectionName, weakenScript, target);
          }

        }
        else
        {
          // Script is already running, leave it alone for now.
          ns.printf("[%s]-WARN: %s is already running on %s. Skipping to next target.", sectionName, weakenScript, target);
        }        

        // Skip to the next target server in the array.
        //continue;
      }
      else if(serverCurrentSecurityLevel < serverSecurityLowerThreshold)
      {
        // Check for the script and issue a stop command if still running.
        ns.printf("[%s]-INFO: Server security level below lower threshold, determining if weaken script is running.", sectionName);

        //ns.printf("[%s]-WARN: isRunning returns: %s", sectionName, ns.isRunning(weakenScript, target, target));

        if(ns.isRunning(weakenScript, target, target) == true)
        {
          // Script is running but the server's security value is below the threshold.
          // This is a good time to turn off the script.
          ns.printf("[%s]-WARN: Found weaken script running, sending kill command.", sectionName);
          ns.kill(weakenScript, target, target);
          securitySectionReportsGood = true;
        }
        else
        {
          // Security level is below lower threshold, but other scripts may be running now.
          // Log and move on, no need to kill any scripts.
          ns.printf("[%s]-INFO: Weaken script NOT detected. Moving to next section of code.", sectionName);
          securitySectionReportsGood = true;
        }
      }
      else
      {
        // The security rating is in the goldylochs zone. 
        ns.printf("[%s]-INFO: %s is in the security goldylocks zone.", sectionName, target);
        securitySectionReportsGood = true;
      }

      if(securitySectionReportsGood == true)
      {
        // Money Section 

        sectionName = "MoneySection";

        const serverCurrentMoney = ns.getServerMoneyAvailable(target);

        if(serverCurrentMoney < serverMoneyLowerThreshold)
        {
          // The current money is below the lower threshold.
          // Initiate server money growing

          ns.printf("[%s]-WARN: %s current money is less than lower threshold. Initating grow sequence.", sectionName, target);

          if((ns.isRunning(growScript, target, target)) == true)
          {
            ns.printf("[%s]-WARN: %s script already runnng on %s. Continuing to next target server.", sectionName, growScript, target);
            // Script is running, just let it do its thing.
          }
          else
          {
            // Script is NOT running. If there are any other scripts running
            // it will be either weaken or hack scripts.
            if(ns.isRunning(hackScript, target, target) == true)
            {
              ns.kill(hackScript, target, target);
            }
            if(ns.isRunning(weakenScript, target, target) == true)
            {
              ns.kill(weakenScript, target, target);
            }

            // Ensure the script exists on the target server.
            if(ensureScriptExists(ns, growScript, target) == true)
            {              
              // Get the growth rate multiplier required.
              const growthRateMultipler = calculateGrowthRateMultiplier(ns, target);

              // Launch grow attack.
              const result = launchScriptAttack(ns, growScript, target, target, growthRateMultipler, 0, false);
              
              if(result == true)
              {
                // Attack launched successfully.
                ns.printf("[%s]-SCUCCESS: Launched %s attack on %s.", sectionName, growScript, target);                
              }
              else
              {
                // Attack failed to launch successfully.
                ns.printf("[%s]-ERROR: Failed to launch %s attack on %s.", sectionName, growScript, target);
              }
            }
            else
            {
              ns.printf("[%s]-ERROR: Unable to verify %s exists. This server needs to be investigated for issues.", sectionName, target);
            }
          }
        }
        else if(serverCurrentMoney > serverMoneyUpperThreshold)
        {
          // The current money is now at or above the upper threshold.
          // This is a good time to shut down the growing script and
          // allow the hack section to take over.
          if((ns.isRunning(growScript, target, target)) == true)
          {
            ns.printf("INFO: Detected script active but money above upper threshold on server: %s. Killing script %s.", target, growScript);
            ns.kill(growScript, target, target);
            moneySectionReportsGood = true;
          }
          else
          {
            ns.printf("INFO: Detected %s script not active and money above upper threshold on server: %s. Money section reports good.", growScript, target);
            moneySectionReportsGood = true;             
          }          
        }
        else
        {
          // This section represents when the server is in the goldylochs zone. 
          // No operations required here, I'm just leaving this section here for future use.
          moneySectionReportsGood = true;
        }
      }

      if(moneySectionReportsGood == true)
      {
        sectionName = "HackSection";

        // This section covers hacking the server when it is in the ideal range.
        ns.printf("[%s]-INFO: Entering hack section for server: %s.", sectionName, target);

        // Verify script file exists on target server.
        if(ensureScriptExists(ns, hackScript, target) == false)
        {
          // Was unable to transfer file to target. Unsure why this would fail, skipping this target server for now.
          ns.printf("[%s]-WARN: Unable to transfer %s file. Skipping this target for now - but %s requires investigation.", sectionName, hackScript, target);
        }
        else
        {
          if((ns.isRunning(hackScript, target, target)) == true)
          {
            // Hack in progress, do nothing.
            ns.printf("[%s]-INFO: Hack in progress on server %s. Continuing to next target.", sectionName, target);
          }
          else
          {
            if(ns.isRunning(growScript, target, target) == true)
            {
              ns.kill(growScript, target, target);
            }
            if(ns.isRunning(weakenScript, target, target) == true)
            {
              ns.kill(weakenScript, target, target);
            }
            
            // Launch grow attack.
            const result = launchScriptAttack(ns, hackScript, target, target, serverMoneyLowerThreshold, 0, false);
            
            if(result == true)
            {
              // Attack launched successfully.
              ns.printf("[%s]-SCUCCESS: Launched %s attack on %s.", sectionName, hackScript, target);                
            }
            else
            {
              // Attack failed to launch successfully.
              ns.printf("[%s]-ERROR: Failed to launch %s attack on %s.", sectionName, hackScript, target);
            }
          }
        }
      }      
    }

    // Sleep for a time.
    await ns.sleep(sleepTime);

  }
}