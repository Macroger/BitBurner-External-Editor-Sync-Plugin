
/** @param {NS} ns */


/**
 * Returns the best target for a botnet swarm based on max money, growth, and min security.
 * @param {NS} ns
 * @returns {string|null} The hostname of the best target, or null if none found.
 */
export function getBestBotnetTarget(ns) 
{
  // Get all servers (objects)
  const allServerObjs = scanForAllServers(ns);

  // Filter for valid hackable servers (returns array of objects)
  const validServers = getValidServerList(ns, allServerObjs, 1, 1);
  if (validServers.length === 0) return null;

  // Score servers by (maxMoney * growth) / minSecurity
  let best = null;
  let bestScore = -Infinity;

  for (const server of validServers) {    
    const maxMoney = ns.getServerMaxMoney(server);
    const growth = ns.getServerGrowth(server);
    const minSec = ns.getServerMinSecurityLevel(server);

    if (maxMoney <= 0 || minSec <= 0) {
      ns.tprintf("Skipping %s: maxMoney=%s, minSec=%s", server, maxMoney, minSec);
      continue;
    }

    const score = (maxMoney * growth) / minSec;
    ns.tprintf("Candidate %s: maxMoney=%s, growth=%s, minSec=%s, score=%s", server, maxMoney, growth, minSec, score);

    if (score > bestScore) 
    {
      bestScore = score;
      best = server;
      ns.tprintf("New best: %s (score=%s)", server, score);
    }
  }
  ns.tprintf("Optimal botnet target selected: %s (score=%s)", best, bestScore);
  return best;
}

  /**
   *  This function calculates and returns the growth rate multiplier required to grow
   *  the target server's money from its current amount to its maximum amount.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} target - The hostname of the server to target.
   * @return {number} - A number representing the growth rate multiplier required to grow the server's money.
   */
  export function calculateGrowthRateMultiplier(ns, target)
  {
    const serverMaxMoney = ns.getServerMaxMoney(target)
    const serverCurrentMoney = ns.getServerMoneyAvailable(target);
    let returnValue = 0;
    
    if(serverCurrentMoney == 0)
    {
      returnValue = serverMaxMoney / 100;
    }
    else
    {
      returnValue = serverMaxMoney / serverCurrentMoney;
    }

    return (returnValue);
  }

  /**
   * Ensures that a script file exists on the target server, copying it over if necessary.
   *
   * @param {NS} ns - The Bitburner Netscript API object.
   * @param {string} script - The name of the script file to check/copy.
   * @param {string} target - The hostname of the server to check/copy the script to.
   * @returns {boolean} True if the script exists or was successfully copied; false if the copy failed.
   *
   * @example
   * // Ensure "hack.js" is present on "n00dles"
   * const success = ensureScriptExists(ns, "hack.js", "n00dles");
   */
  export function ensureScriptExists(ns, script, target)
  {
    const fileExists = ns.fileExists(script, target);
    let fileTransferResult = true;

    // Determine if the script exists on the target server.
    // If not, attempt to copy it over.
    if(fileExists == false)
    {
      ns.printf("INFO: Detected that the %s file does not exist on %s. Attempting to copy it over now.", script, target);

      // File does not exist, transfer it over.
      fileTransferResult = ns.scp(script, target);

      // Just confirming that the file was successfully transferred.
      // If it failed to transfer something is wrong with this server.
      if(fileTransferResult == true)
      {
        ns.printf("SUCCESS: Succesfully copied %s to %s", script, target);
      }
      else
      {
        ns.printf("ERROR: Failed to copy %s to %s.", script, target);
      }
    }

    return fileTransferResult;
  }

  /**
   * Attempts to gain root access on the specified target server by using available hacking programs. 
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} target - The hostname of the server to gain root access on.
   * @return {boolean} - A boolean indicating whether root access was successfully obtained.
   */
  export function getRootAccess(ns, target)
  {
    const portsRequired = ns.getServerNumPortsRequired(target);
    let nukeRequired = false;
    const numCrackingProgramsAvailable = getNumCrackingPrograms(ns);

    if(portsRequired <= numCrackingProgramsAvailable)
    {
      switch(portsRequired)
      {
        case 5:
          ns.sqlinject(target);

        case 4:
          ns.httpworm(target);

        case 3:
          ns.relaysmtp(target);
        
        case 2:
          ns.ftpcrack(target);
        
        case 1:
          ns.brutessh(target);

        case 0:
          nukeRequired = true;
      }   
    }

    if(nukeRequired == true)
    {
      ns.nuke(target);
      ns.printf("INFO: Nuke performed. Root access should now be granted.");  
    }

    return ns.hasRootAccess(target);   
  }

  /**
   * Calculates the number of threads that could be opened on the target server for a given script.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} scriptName - The name of the script to be executed.
   * @param {*} target - The hostname of the server on which to calculate available threads.
   * @param {number} [reserveThreads=0] - The number of threads to reserve and not use.
   * @return {number} - The number of threads that can be opened on the target server for the specified script,
   * excluding any reserved threads.
   */
  export function getNumThreadsPossible(ns, scriptName, target, reserveThreads = 0)
  {
    const functionName = "getNumThreadsPossible";
    const serverAvailableRam = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);    
    const scriptRamCost = ns.getScriptRam(scriptName);
    let numThreads = 0;
    const maxThreadCount = 1000000;

    if(serverAvailableRam >= scriptRamCost)
    {
      // There is enough ram available to open threads, determine how many
      // by dividing the available ram by the cost of the script.
      // Using math function floor() to remove any fractional parts of the result.

      numThreads = Math.floor(serverAvailableRam / scriptRamCost);

      if(numThreads < 1)
      {
        // No threads can be opened. Shouldn't happen unless something fishy is going on.
        ns.printf("[%s]-ERROR: Unable to open any threads. Skipping this target for now - but %s requires investigation.", functionName, target);
        numThreads = 0;
      }
      else if(numThreads > maxThreadCount)
      {
        // I can't imagine more than 1000000 threads ever being opened.
        // So this is used as a catch incase of insane values being proposed by the getNumThreadsPossible function.
        ns.printf("[%s]-ERROR: Too many threads suggested.(t = %d).", functionName, numThreads);
        numThreads = 0;
      }  
    }

    //ns.printf("[%s]-INFO: determined that %d can be opened on %s.", functionName, numThreads, target);
    if(reserveThreads > 0)
    {
      ns.printf("[%s]-WARN: Detected reserve thread count of %d. Reducing thread count by this amount.", functionName, reserveThreads);
      numThreads = numThreads - reserveThreads;
    }
    return numThreads;
  }
  
  /**
   * Launches a script attack on a target server using the specified script.
   *
   * @export
   * @param {NS} ns - The Bitburner Netscript API object.
   * @param {string} scriptName - The name of the script to be executed.
   * @param {string} target - The hostname of the server to attack.
   * @param {string} source - The hostname of the server from which the attack is launched.
   * @param {*} goal - The goal value for the attack. This could represent money to hack, security to weaken, etc.
   * @param {number} [reserveThreads=0] - The number of threads to reserve and not use.
   * @param {boolean} [localMode=false] - Whether to calculate threads on the local (home) server.
   * @returns {Object} - An object containing details about the attack attempt:
   *   {
   *     success: boolean,      // Whether the attack was successfully launched
   *     threadCount: number,   // Number of threads used
   *     ramUsed: number,       // Total RAM used for the launch
   *     script: string,        // Name of the script launched
   *     target: string,        // Target server
   *     error: string|null,    // Error message if unsuccessful
   *     pid: number|null       // Process ID of the launched script (if successful)
   *   }
   */
  export function launchScriptAttack(ns, scriptName, target, source, goal, maxAllowedThreads = 10000, reserveThreads=0, localMode=false)
  {
    const sectionName = "launchScriptAttack";
    let numThreadsAvailable = 0;
    const desiredNumThreads = getNumThreadsToReachGoal(ns, scriptName, goal, target);
    let resultObj = {
      success: false,
      threadCount: 0,
      ramUsed: 0,
      script: scriptName,
      target: target,
      error: null,
      pid: null
    };

    if(localMode == true)
    {
      numThreadsAvailable = getNumThreadsPossible(ns, scriptName, source, reserveThreads);
    }
    else
    {
      numThreadsAvailable = getNumThreadsPossible(ns, scriptName, target, reserveThreads);
    }

    if (desiredNumThreads === 0) 
    {
      ns.printf("[%s]-INFO: No threads needed for %s on %s (goal already met or calculation returned zero). Skipping launch.", sectionName, scriptName, target);
      resultObj.error = "No threads needed (goal met or zero calculation)";
      return resultObj;
    }

    let threadsToLaunch = 0;
    if (desiredNumThreads > 0 && desiredNumThreads < numThreadsAvailable) 
    {
      threadsToLaunch = desiredNumThreads;
    }
    else if (numThreadsAvailable > 0)
    {
      threadsToLaunch = numThreadsAvailable;
    }
    else
    {
      ns.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
      resultObj.error = "Not enough RAM available";
      return resultObj;
    }

    if (threadsToLaunch > maxAllowedThreads)
    {
      ns.printf("[%s]-WARN: Capping threads to launch (%d) to max allowed (%d).", sectionName, threadsToLaunch, maxAllowedThreads);
      threadsToLaunch = maxAllowedThreads;
    }

    const pid = ns.exec(scriptName, source, threadsToLaunch, target);
    if (pid === 0)
    {
      ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, threadsToLaunch);
      resultObj.error = `Script launch failed for ${scriptName} with ${threadsToLaunch} threads.`;
      return resultObj;
    }
    else
    {
      const maxRam = ns.getServerMaxRam(source);
      const ramUsed = threadsToLaunch * ns.getScriptRam(scriptName, source);
      ns.printf("[%s]-SUCCESS: Opened %d threads of %s on %s, using %s / %s RAM ", sectionName, threadsToLaunch, scriptName, source, ns.formatRam(ramUsed), ns.formatRam(maxRam));
      resultObj.success = true;
      resultObj.threadCount = threadsToLaunch;
      resultObj.ramUsed = ramUsed;
      resultObj.pid = pid;
      return resultObj;
    }
  }

  /**
   * Calculates the number of threads required to reach a specified goal on a target server using a given script.
   * Examples of goals include money to hack, security to weaken, etc.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} scriptName - The name of the script to be executed.
   * @param {*} goal - The target goal value (e.g., money to hack, security to weaken).
   * @param {*} target - The hostname of the server to target.
   * @param {*} source - The hostname of the server from which the script will be run.
   * @returns {number} - The number of threads required to reach the goal.
   */
  export function getNumThreadsToReachGoal(ns, scriptName, goal, target, source="remote")
  {
    const sectionName = "getNumThreadsToReachGoal";
    let server = (source == "remote" ? ns.getServer(target) : ns.getServer(source));
    const serverCpuCount = server.cpuCores;

    const localPrefix = "local_";

    const weakenScriptName = localPrefix + "weaken.js";
    const hackScriptName = localPrefix + "hack.js";
    const growScriptName =  localPrefix + "grow.js";

    //ns.printf("[%s]-INFO: Goal: %d", sectionName, goal);

    let threadsRequired = 0;
    const THREAD_CAP = 10000;

    if(scriptName == weakenScriptName)
    {
      // Always reduce security down to minimum value.
      const valueOfOneWeaken = ns.weakenAnalyze(1, serverCpuCount);
      const serverDecreaseRequired = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
      threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
    }
    else if(scriptName == hackScriptName)
    {
      threadsRequired = ns.hackAnalyzeThreads(target, goal);
    }
    else if(scriptName == growScriptName)
    {
      // Clamp goal to at least 1 to avoid huge multipliers if current money is 0 or very low
      let safeGoal = Math.max(goal, 1);
      threadsRequired = ns.growthAnalyze(target, safeGoal, serverCpuCount);
      if (threadsRequired > THREAD_CAP) {
        ns.printf("[%s]-WARN: Calculated grow threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, threadsRequired, THREAD_CAP, target, THREAD_CAP);
        threadsRequired = THREAD_CAP;
      }
    }
    else
    {
      ns.printf("[%s]-ERROR: Unknown script name %s provided for thread calculation on %s.", sectionName, scriptName, target);
      threadsRequired = 0;
    }

    // General cap for all thread calculations
    let result = Math.ceil(threadsRequired);
    if (result > THREAD_CAP) {
      ns.printf("[%s]-WARN: Calculated threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, result, THREAD_CAP, target, THREAD_CAP);
      result = THREAD_CAP;
    }

    ns.printf("[%s]-INFO: Number of threads required to reach goal of %d on %s: %d", sectionName, goal, target, result);

    return result;
  }
  
  /*
  **  Function Name: displayStats        
  **  Parameter(s):  ns: I think this is a reference to the main game thread, required to run game functions.
  **                 String target: The hostname of the server to target.
  **                 
  **  Returns:       Void: Returns nothing.
  **  Description:   This function prints stats about a server to the terminal. 
  */
  export function displayStats(ns, target)
  {
    const runningScripts = ns.ps(target);
        
    ns.tprintf("\n%s found!", target);
    ns.tprintf("Required hacking skill: %s", ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1000, true) );
    
    ns.tprintf("\nServer security ratings:\n(Min., Base, Current)\n(%s, %s, %s)",
      ns.formatNumber(ns.getServerMinSecurityLevel(target)),
      ns.formatNumber(ns.getServerBaseSecurityLevel(target)),
      ns.formatNumber(ns.getServerSecurityLevel(target)));
    
    ns.tprintf("\nGrowth rate: %d", ns.getServerGrowth(target));
    ns.tprintf("\nGrow time: %d minutes %d seconds.", (ns.getGrowTime(target) / 1000 / 60), (ns.getGrowTime(target) / 1000) % 60);
    ns.tprintf("Weaken time: %d minutes %d seconds.", (ns.getWeakenTime(target) / 1000 /60), (ns.getWeakenTime(target) / 1000) % 60);
    ns.tprintf("Hack time: %d minutes %d seconds.", (ns.getHackTime(target) / 1000 /60), (ns.getHackTime(target) / 1000) % 60);                

    ns.tprintf("\nMoney available: $%s", ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1000, true));
    ns.tprintf("Maximum Money: $%s", ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true));      
    
    ns.tprintf("\nTotal amount of RAM: %s", ns.formatRam(ns.getServerMaxRam(target)));
    ns.tprintf("Amount of free RAM: %s", ns.formatRam(ns.getServerMaxRam(target) - ns.getServerUsedRam(target)));
    
    ns.tprintf("\nRoot access status: %s", ns.hasRootAccess(target) ? "Granted" : "Not Granted");
    ns.tprintf("Ports required to crack: %d", ns.getServerNumPortsRequired(target));
    
    if(runningScripts.length == 0)
    {
      ns.tprintf("Local scripts running: None detected.");
    }
    else
    {
      ns.tprintf("Scripts running: ");
      for(let script of runningScripts)
      {
        ns.tprintf("%s", script.filename);
      }
    }
  }

  /*
  **  Function Name: getNumCrackingPrograms        
  **  Parameter(s):  ns: I think this is a reference to the main game thread, required to run game functions.
  **  Returns:       Number: Returns a number representing how many programs are available currently.
  **  Description:   A simple function to determine how many of the cracking programs are available to the player.
  **                 It looks for the file names of each cracking program and increments the count for each found.
  */
  export function getNumCrackingPrograms(ns)
  {
    let numCrackingProgramsAvailable = 0; 

    // Check for the bruteSSH.exe program on the home computer.
    if(ns.fileExists("bruteSSH.exe", "home"))
    {
      numCrackingProgramsAvailable++;
    }
    
    // Check for the relaySMTP.exe program on the "home" computer.
    if(ns.fileExists("relaySMTP.exe", "home"))
    {
      numCrackingProgramsAvailable++;
    }

    // Check for the FTPCrack.exe program on the home computer.
    if(ns.fileExists("FTPCrack.exe", "home"))
    {
      numCrackingProgramsAvailable++;
    }

    // Check for the SQLInject.exe program on the home computer.
    if(ns.fileExists("SQLInject.exe", "home"))
    {
      numCrackingProgramsAvailable++;
    }

    // Check for the HTTPWorm.exe program on the home computer.
    if(ns.fileExists("HTTPWorm.exe", "home"))
    {
      numCrackingProgramsAvailable++;
    }

    return numCrackingProgramsAvailable;
  }

  /*
  **  Function Name: validateServer        
  **  Parameter(s):  String server: The hostname of the server to target.
  **                 ns: I think this is a reference to the main game thread, required to run game functions.
  **                 number MinMoney: A number representing the minimum max money a server should have.
  **                 number minGrowRate: A number representing the minimum grow rate a server should have.
  **  Returns:       boolean:  A boolean value indicating whether the server passes validation.
  **  Description:   This function returns a boolean value indicating whether the server passes validation. True = passes
  */
  export function validateServer(ns, server, minMoney=1, minGrowRate=1)
  {
    let result = false;

    let numCrackingProgramsAvailable = getNumCrackingPrograms(ns);     

    // I want to weed out servers that have no max money, or are otherwise
    // inappropriate for hacking.
    let isPlayerHackingSufficient = false;

    // Test if the server has a maximum money value greater than minMoney.
    const serverHasEnoughMoney = (ns.getServerMaxMoney(server) > minMoney) ? true : false;

    // Get the players hacking level for future use.
    const playerHackingLevel = ns.getHackingLevel(); 

    // Get the server's grow rate.
    const serverGrowthRate = ns.getServerGrowth(server);
    
    // Check if the server has less than or equal the number of cracking programs available.
    const canRunNuke = (ns.getServerNumPortsRequired(server) <= numCrackingProgramsAvailable? true: false); 

    // Determine the server's hacking level requirement.
    const serverHackingRequirement = ns.getServerRequiredHackingLevel(server);

    // Boolean value to represent whether growth is high enough.
    let isGrowthFastEnough = false;

    if(playerHackingLevel >= serverHackingRequirement)
    {
      isPlayerHackingSufficient = true;
    }

    if(serverGrowthRate >= minGrowRate)
    {
      isGrowthFastEnough = true;
    }  

    if(isPlayerHackingSufficient == true 
    && canRunNuke == true 
    && isGrowthFastEnough == true 
    && serverHasEnoughMoney == true)
    {
      result = true;
    }

    return result;
  }

  /**
   * This function uses a variety of conditions to test against each server and returns an
   * array of strings containing the host names of servers that passed validation.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} serverList - An array of server hostnames to validate.
   * @param {number} [minMoney=1] - The minimum max money a server should have.
   * @param {number} [minGrowRate=1] - The minimum grow rate a server should have.
   * @param {boolean} [requiresRAM=false] - Whether to only include servers that have RAM.
   * @param {boolean} [requiresNoRam=false] - Whether to only include servers that do not have RAM.
   * @return {string[]} - An array of strings containing the hostnames of validated servers.
   */
  export function getValidServerList(ns, serverList, minMoney=1, minGrowRate=1, requiresRAM=false, requiresNoRam=false)
  {
    // An array which will be filled in with validated servers.
    let validatedServerList = [];
    
    // Represents the number of cracking programs the player has access to.
    const numCrackingProgramsAvailable = getNumCrackingPrograms(ns);

    // Get the players hacking level for future use.
    const playerHackingLevel = ns.getHackingLevel(); 

    for(let target of serverList)
    {
      let targetName = target.name;
      const serverHasRam = ns.getServerMaxRam(targetName) > 0 ? true: false;

      // Test if the server has a maximum money value greater than minMoney.
      const serverHasEnoughMoney = (ns.getServerMaxMoney(targetName) > minMoney) ? true : false;

      // Get the server's grow rate.
      const serverGrowthRate = ns.getServerGrowth(targetName);

      // Determine if the player has enough cracking programs to crack the targetName server.
      const canRunNuke = (ns.getServerNumPortsRequired(targetName) <= numCrackingProgramsAvailable? true: false); 

      // Determine the server's hacking level requirement.
      const serverHackingRequirement = ns.getServerRequiredHackingLevel(targetName);

      // Boolean value used to represent whether the servers hack requirement is lower than the players' skill.
      let isPlayerHackingSufficient = (playerHackingLevel >= serverHackingRequirement ? true : false);

      // Boolean value to represent whether server growth is above the minimum growth rate.
      let isGrowthFastEnough = (serverGrowthRate >= minGrowRate? true : false);

      // The final check, this ensures that the targetName server passes all the required checks, and if so, adds it to the list.
      if(isPlayerHackingSufficient == true 
      && canRunNuke == true 
      && isGrowthFastEnough == true 
      && serverHasEnoughMoney == true)
      {
        if (requiresRAM == true && requiresNoRam == true)
        {
          validatedServerList.push(targetName);
        }
        else if(requiresRAM == true)
        {
          if(serverHasRam == true)
          {
            validatedServerList.push(targetName);
          }
        }
        else if(requiresNoRam == true)
        {
          if(serverHasRam == false)
          {
            validatedServerList.push(targetName);
          }
        }
        else
        {
          validatedServerList.push(targetName);
        }
      }
    }
    return validatedServerList;
  }

  /**
   * Scans the entire network, returning an array of server objects with parent info for path reconstruction.
   * Each object: { name: string, scanned: boolean, parent: string|null }
   * @param {NS} ns
   * @param {string} [startingPoint="home"]
   * @returns {Array<{name: string, scanned: boolean, parent: string|null}>}
   */
  export function scanForAllServers(ns, startingPoint = "home") {
    // Map: server name -> server object
    const serverMap = new Map();
    // Queue for breadth-first search
    const queue = [];

    // Initialize with starting point
    serverMap.set(startingPoint, { name: startingPoint, scanned: false, parent: null });
    queue.push(startingPoint);

    while (queue.length > 0) 
    {
      // Place the first item from the queue into current
      const current = queue.shift();

      // Get the server object for the current server
      const serverObj = serverMap.get(current);

      // Check if this server has already been scanned - if not scan it
      if (!serverObj.scanned) 
      {
        // Get a list of neighboring servers
        const neighbors = ns.scan(current);

        // Check each neighbor and see if it's already in the map
        for (const neighbor of neighbors) 
        {
          // Check if this neighbor is already known
          if (!serverMap.has(neighbor)) 
          {
            // Add new server with parent info
            serverMap.set(neighbor, { name: neighbor, scanned: false, parent: current });
            queue.push(neighbor);
          }
        }

        // Mark the current server as scanned
        serverObj.scanned = true;
      }
    }

    // Return as array
    return Array.from(serverMap.values());
  }
    
  /**
   * Scans the network starting from a specified server and returns a list of all discovered servers.
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} startingPoint - The hostname of the server to start scanning from.
   * @returns - string[] - An array of strings containing the hostnames of all discovered servers.
   */
  export function scanForServers(ns, startingPoint="home")
  {
    let serverList = [];
    const servers = ns.scan(startingPoint);

    for(let target of servers)
    {
      if(serverList.indexOf(target) === -1)
      {
        serverList.push(target);              
      }
    }

    for(let x of serverList)
    {
      const newServers = ns.scan(x);
      for(let newServerTarget of newServers)
      {
        if(serverList.indexOf(newServerTarget) === -1)
        {
          serverList.push(newServerTarget);        
        }        
      }        
    }

    return serverList;
  }

  /**
   * Decides the next action to take on a server based on its current state.
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} target - The hostname of the server to analyze.
   * @param {*} source - The hostname of the server from which the analysis is performed (default is the target server).
   * @returns - string - The next action to take: "weaken", "grow", or "hack".
   */
  export function decideServerAction(ns, target, source = target) 
  {  
      let minSec = ns.getServerMinSecurityLevel(target);
      let curSec = ns.getServerSecurityLevel(target);
      let maxMoney = ns.getServerMaxMoney(target);
      let curMoney = ns.getServerMoneyAvailable(target);

      // Threshold for when to begin weakening: max of 5% above minSec or minSec + 2
      const weakenThreshold = Math.max(minSec * 1.05, minSec + 2);

      // Only return 'weaken' if the security difference is at least the effect of one weaken thread
      if (curSec > weakenThreshold) 
      {
          const cpuCores = ns.getServer(source).cpuCores || 1;
          const weakenEffect = ns.weakenAnalyze(1, cpuCores);
          if ((curSec - minSec) >= weakenEffect) 
          {
              return "weaken";
          }
          // If not enough to justify a weaken, fall through to grow/hack logic
      }

      // Only hack when money is at least 95% of maxMoney
      if (curMoney >= maxMoney * 0.95) 
      {
          return "hack";
      }

      // Otherwise, grow
      return "grow";
  }

  /**
   * This function attempts to kill a specific script or all scripts on a target server.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {*} scriptName - The name of the script to kill, or "allScripts" to kill all scripts.
   * @param {string} [target="home"] - The hostname of the server on which to kill the script(s).
   * @return {*} - A boolean indicating whether the kill operation was successful.
   */
  export function killScript(ns, scriptName, target = "home")
  {
    const functionName = "killScript";

    //ns.printf("[%s]-INFO: Attempting to kill %s on %s.", functionName, scriptName, target);

    let result = true;

    // Check if we are to kill all scripts.
    if(scriptName == "allScripts")
    {
      ns.printf("[%s]-INFO: Issuing killall command on %s.", functionName, target);
      
      if(ns.killall(target))
      {
        ns.printf("[%s]-SUCCESS: killall command successful on %s.", functionName, target);
        return true;
      }
      else
      {
        ns.printf("[%s]-ERROR: killall command failed on %s.", functionName, target);
        return false;
      }      
    }
    else
    {
      // Print all running scripts before attempting to kill
      const beforeScripts = ns.ps(target);
      //ns.printf("[%s]-DEBUG: Scripts running on %s before kill: %s", functionName, target, beforeScripts.map(s => s.filename + ' ' + s.args.join(' ')).join('; '));

      // Check if the script is running at all
      const isRunning = beforeScripts.some(s => s.filename === scriptName);
      if (!isRunning) {
        ns.printf("[%s]-INFO: %s is not running on %s. Nothing to kill.", functionName, scriptName, target);
        return true;
      }

      // Use scriptKill to kill all instances of the script regardless of arguments
      //ns.printf("[%s]-INFO: Issuing scriptKill for %s on %s.", functionName, scriptName, target);
      const killResult = ns.scriptKill(scriptName, target);

      // Print all running scripts after attempting to kill
      const afterScripts = ns.ps(target);
      //ns.printf("[%s]-DEBUG: Scripts running on %s after kill: %s", functionName, target, afterScripts.map(s => s.filename + ' ' + s.args.join(' ')).join('; '));

      if (killResult) {
        ns.printf("[%s]-SUCCESS: %s successfully killed on %s.", functionName, scriptName, target);
        return true;
      } else {
        ns.printf("[%s]-ERROR: Failed to kill %s on %s, even though it was running.", functionName, scriptName, target);
        return false;
      }
    }
  }

  /**
 *  Prepends a timestamp to log messages for better tracking.
 * @param {string} message - The message to log
 */
/**
 * Logs a message with a timestamp. By default, logs to the internal log (ns.printf).
 * If terminalMode is true, logs to the terminal (ns.tprintf).
 * @param {NS} ns
 * @param {string} message
 * @param {boolean} [terminalMode=false] - If true, use ns.tprintf; otherwise, use ns.printf
 */
export function logWithTimestamp(ns, message, terminalMode = false) 
{
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
  if (terminalMode) {
    ns.tprint(`[${timeStr}] ${message}`);
  } else {
    ns.print(`[${timeStr}] ${message}`);
  }
}

/**
 * Formats a sleep time in milliseconds into a human-readable string.
 * Uses the format "X minute(s) Y second(s)".
 *
 * @param {number} ms - Sleep time in milliseconds
 * @return {string} - Formatted string representing the sleep time
 */
export function formatSleepTime(ms) 
{
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let result = "";
    if (minutes > 0) result += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    if (minutes > 0 && seconds > 0) result += " ";
    if (seconds > 0) result += `${seconds} second${seconds !== 1 ? "s" : ""}`;
    if (result === "") result = "less than 1 second";
    return result;
}

/**
 * This function sorts a queue of servers based on their calculated score.
 * The score is determined by the formula: (maxMoney * growth) / minSec
 *
 * @export
 * @param {*} queue - An array of server hostnames or objects with a 'name' property.
 */
export function sortQueueByScore(ns, queue) {
    // Score: (maxMoney * growth) / minSec
    queue.sort((a, b) => {
        const aName = a.name || a;
        const bName = b.name || b;
        const aMaxMoney = ns.getServerMaxMoney(aName);
        const aGrowth = ns.getServerGrowth(aName);
        const aMinSec = ns.getServerMinSecurityLevel(aName);
        const aScore = (aMaxMoney > 0 && aMinSec > 0) ? (aMaxMoney * aGrowth) / aMinSec : -Infinity;
        const bMaxMoney = ns.getServerMaxMoney(bName);
        const bGrowth = ns.getServerGrowth(bName);
        const bMinSec = ns.getServerMinSecurityLevel(bName);
        const bScore = (bMaxMoney > 0 && bMinSec > 0) ? (bMaxMoney * bGrowth) / bMinSec : -Infinity;
        return bScore - aScore;
    });
}

  