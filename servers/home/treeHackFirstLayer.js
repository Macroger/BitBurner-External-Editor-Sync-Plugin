/** @param {NS} ns */
export async function main(ns) 
{
  function getRootAccess(target)
  {
    const portsRequired = ns.getServerNumPortsRequired(target);
    let nukeRequired = false;

    // I currently have access to 2 cracking programs, so I can open up servers
    // that have 2 or less ports to open.
    if(portsRequired == 2)
    {
      // Utilize the second crack program.
      ns.printf("%s requires 2 ports. Attempting FTPcrack.exe and brutessh.exe", target);
      ns.ftpcrack(target);
      ns.brutessh(target);
      nukeRequired = true;
    }
    else if(portsRequired == 1)
    {
      // Can crack this server, execute the crack programs.
      ns.printf("%s requires 1 port. Attempting to execute brutessh.exe", target);
      ns.brutessh(target);
      nukeRequired = true;
    }
    else if (portsRequired >= 3)
    {
      // Too many ports to crack right now - log, and skip this target.
      ns.printf("%s requires too many ports opened, unable to crack server: %s", target);
    }

    if(nukeRequired == true)
    {
      ns.nuke(target);
      ns.printf("Nuke performed. Root access should now be granted.");  
    }

    return ns.hasRootAccess(target);   
  }

  function ensureScriptExists(script, target)
  {
    const fileExists = ns.fileExists(script, target);
    let fileTransferResult = true;

    // Determine if the local_weaken.js script exists on the target server.
    // If not, attempt to copy it over.
    if(fileExists == false)
    {
      ns.printf("Detected that the %s file does not exist on %s. Attempting to copy it over now.", script, target);

      // File does not exist, transfer it over.
      fileTransferResult = ns.scp(script, target);

      // Just confirming that the file was successfully transferred.
      // If it failed to transfer something is wrong with this server.
      if(fileTransferResult == true)
      {
        ns.printf("Succesfully copied %s to %s", script, target);
      }
      else
      {
        ns.printf("Failed to copy %s to %s.", script, target);
      }
    }

    return fileTransferResult;
  }

  function getNumThreadsPossible(scriptName, target)
  {
    const serverAvailableRam = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);    
    const scriptRamCost = ns.getScriptRam(scriptName, target);

    //ns.printf("Cost of script to run: %d\nServer available RAM: %d\nAvailable ram minus cost: %d", scriptRamCost, serverAvailableRam, (serverAvailableRam / scriptRamCost));
    const numThreads = serverAvailableRam / scriptRamCost;

    return Math.floor(numThreads);
  }
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";

  let servers = ns.scan();

  for(let target of servers)
  {
    ns.printf("Found server: %s", target);

    // Check if root access already exists.
    // If it does NOT, enter the following block of code.
    if(!ns.hasRootAccess(target))
    {
      const rootAccess = getRootAccess(target);
      if(rootAccess == true)
      {
        // this block activates if getRootAccess succeeded in obtaining root access.
        ns.printf("Root access has been confirmed. %s is now cracked.", target);
      }
      else
      {
        // This block activates if root access has not been granted.
        ns.printf("%s remains uncracked. Check error logs, root access remains denied. Continuing to next target.", target);
        continue;
      }     
    }
    else
    {
      ns.printf("Root access has been granted.");
    }

    // Root access should be granted now. Proceed with machinations!

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// RAM SECTION //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Check how much RAM is available on the server.

    /*
    ns.printf("Entering RAM section of treeHack for server: %s.", target);
    const serverUsedRam = ns.getServerUsedRam(target);
    const serverMaxRam = ns.getServerMaxRam(target);
    const serverAvailableRam = serverMaxRam - serverUsedRam;
    */

    //ns.printf("Server used RAM: %s\nServer max RAM: %s\nServer available RAM: %s", ns.formatRam(serverUsedRam), ns.formatRam(serverMaxRam), ns.formatRam(serverAvailableRam));
    
    //const scriptRamCost = ns.getScriptRam("local_hack.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// SECURITY LEVEL SECTION //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Check for security levels first, as a highly secured server will require weakening before all other actions.

    ns.printf("Entering security section of treeHack for server: %s.", target);

    const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);
    const serverMinimumSecurityLevel = ns.getServerMinSecurityLevel(target);
    const serverBaseSecurityLevel = ns.getServerBaseSecurityLevel(target);

    // This const represents the difference between the base (original) security level
    // and the minimum level. This value can be used to help determine an acceptable
    // security level to weaken to.
    const serverSecurityLowerAdjuster = (serverBaseSecurityLevel - serverMinimumSecurityLevel) / 4;
    const serverSecurityUpperAdjuster = (serverBaseSecurityLevel - serverMinimumSecurityLevel) / 2;

    // Take the previous adjuster value, and add it onto the minimum value. According to my math
    // this should cause the security value to never raise beyond 25% of its minimum value.
    const serverSecurityLowerThreshold = serverMinimumSecurityLevel + serverSecurityLowerAdjuster;
    const serverSecurityUpperThreshold = serverMinimumSecurityLevel + serverSecurityUpperAdjuster;

    //ns.printf("The upper threshold is: %d\nThe lower threshold is:%d\nServer current security level: %d", serverSecurityUpperThreshold, serverSecurityLowerThreshold, serverCurrentSecurityLevel);

    if(serverCurrentSecurityLevel > serverSecurityUpperThreshold)
    {
      // Security rating is above the upper cut off value which is ~50% of the difference 
      // between base value and min value. The server should be weakened.

      // Determine if target has the weaken script file. CHANGE HERE - USE INTERNAL FUNCTION INSTEAD OF CUSTOM ONE
      const scriptFileExists = ns.fileExists(weakenScript, target);

      // Verify script file exists on target server.
      if(scriptFileExists == false)
      {
        //transfer the file over
        fileTransferResult = ns.scp(weakenScript, target);

        // Just confirming that the file was successfully transferred.
        // If it failed to transfer something is wrong with this server.
        if(fileTransferResult == true)
        {
          ns.printf("Succesfully copied %s to %s", weakenScript, target);
        }
        else
        {
          ns.printf("Failed to copy %s to %s.", weakenScript, target);
        }
      }

      ns.printf("Testing if the %s is running on %s.", weakenScript, target);

      // Determine if the script is currently running.
      // If the script is NOT running, go ahead and launch it.
      const scriptIsRunning = ns.scriptRunning(weakenScript, target);

      if(scriptIsRunning == false)
      {
        ns.printf("Detected that the %s is NOT running on %s\nAttempting to launch %s.", weakenScript, target, weakenScript);
        
        // Launch weaken attack. Determine how many threads can be issued.
        const numThreads = getNumThreadsPossible(weakenScript, target);

        if(numThreads < 1)
        {
          // No threads can be opened. Shouldn't happen unless something fishy is going on.
          ns.printf("Unable to open any threads. Skipping this target for now - but %s requires investigation.", target);
          continue;
        }

        const result = ns.exec(weakenScript, target, numThreads, target);

        if(result == 0)
        {
          ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", weakenScript, numThreads);
        }
        else
        {
          ns.printf("Successfully opened up %d threads of %s on %s", numThreads, weakenScript, target);
        }
      }

      // This server should now be busy running the weaken script.
      // Skip to the next target server in the array.
      continue;
    }
    else if(serverCurrentSecurityLevel < serverSecurityLowerThreshold)
    {
      // Server secuirity rating is at or below 25%. Check for the script and
      // issue a stop command if still running.
      ns.printf("Server security level below lower threshold, entering section to kill weaken script.");

      if(ns.scriptRunning(weakenScript, target) == true)
      {
        //script is running, issue terminate command.
        ns.printf("Found weaken script running, sending kill all command.");
        ns.killall(target);
      }
      else
      {
        ns.printf("Weaken script NOT detected. Moving to next section of code.");
      }
    }
    else
    {
      // The security rating is in the goldylochs zone. 
      // If the script is running its probably bringing down the security rating. If script is running, do nothing.

      // If the script is not running, it is likely being hacked or grown, so again do nothing. 
      // I have discovered a fringe case that may need to be addressed here. 
      // n00dles has a security min of 1, and a base value of 1.
      ns.printf("This server has entered the security goldylocks zone.");

      
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// MONEY SECTION //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Create a constant that represents the value at which money should be grown
    // instead of hacked.
    ns.printf("Entering money section of treeHack for server: %s.", target);

    const serverCurrentMoney = ns.getServerMoneyAvailable(target);
    const serverMaxMoney = ns.getServerMaxMoney(target);

    const serverMoneyUpperThreshold = serverMaxMoney * 0.85;
    const serverMoneyLowerThreshold = serverMaxMoney * 0.60;

    if(serverCurrentMoney < serverMoneyLowerThreshold)
    {
      // The current money is below the lower threshold (60% of max).
      // Initiate server money growing
      
      // Launch grow attack. Determine how many threads can be issued.
      const numThreads = getNumThreadsPossible(growScript, target);

      if(numThreads < 1)
      {
        // No threads can be opened. Shouldn't happen unless something fishy is going on.
        ns.printf("Unable to open any grow threads. Skipping this target for now - but %s requires investigation.", target);
        continue;
      }

      const result = ns.exec(growScript, target, numThreads, target);

      if(result == 0)
      {
        ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", growScript, numThreads);
      }
      else
      {
        ns.printf("Successfully opened up %d threads of %s on %s", numThreads, growScript, target);
      }
    }
    else if(serverCurrentMoney > serverMoneyUpperThreshold)
    {
      // The current money is now at or above 85% of max money.
      // This is a good time to shut down the growing script and
      // allow the hack section to take over.
      const scriptIsActive = ns.scriptRunning(growScript, target);
      if(scriptIsActive == true)
      {
        ns.printf("Detected script active but money above upper threshold on server: %s. Killing script %s.", target, growScript);
        ns.killall(target);
      }
    }
    else
    {
      // This section represents when the server is in the goldylochs zone. 
      // No operations required here, I'm just leaving this section here for future use.
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// HACK SECTION //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

  // This section covers hacking the server when it is in the ideal range.
    ns.printf("Entering hack section of treeHack for server: %s.", target);
    
    // Determine if target has the hack script file.
    const scriptExists = ensureScriptExists(hackScript, target);

    // Verify script file exists on target server.
    if(scriptExists == false)
    {
      // Was unable to transfer file to target. Unsure why this would fail, skipping this target server for now.
      ns.printf("Unable to transfer script file. Skipping this target for now - but %s requires investigation.", target);
      continue;
    }

    // Determine if the script is currently running.
    // If the script is NOT running, go ahead and launch it.
    const scriptIsRunning = ns.scriptRunning(hackScript, target);

    if(scriptIsRunning == false)
    {
      ns.printf("Detected that the %s is NOT running on %s\nAttempting to launch %s.", hackScript, target, hackScript);
      
      // Launch weaken attack. Determine how many threads can be issued.
      const numThreads = getNumThreadsPossible(hackScript, target);

      if(numThreads < 1)
      {
        // No threads can be opened. Shouldn't happen unless something fishy is going on.
        ns.printf("Unable to open any threads. Skipping this target for now - but %s requires investigation.", target);
        continue;
      }

      const result = ns.exec(hackScript, target, numThreads, target);

      if(result == 0)
      {
        ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", hackScript, numThreads);
      }
      else
      {
        ns.printf("Successfully opened up %d threads of %s on %s", numThreads, hackScript, target);
      }
    }
    else
    {
      // Script is currently running, just leave it be for now
      continue;
    }

  }

}