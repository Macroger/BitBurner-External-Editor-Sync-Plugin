/** @param {NS} ns */
  /**
   * Launches a script attack on a target server using the specified script.
   *
   * @export
   * @param {*} ns - The Bitburner Netscript API object.
   * @param {string} scriptName - The name of the script to be executed.
   * @param {*} target - The hostname of the server to attack.
   * @param {*} source - The hostname of the server from which the attack is launched.
   * @param {*} goal - The goal value for the attack. This could represent money to hack, security to weaken, etc.
   * @param {number} [reserveThreads=0] - The number of threads to reserve and not use.
   * @param {boolean} [localMode=false] - Whether to calculate threads on the local server.
   * @return {boolean} - A boolean indicating whether the attack was successfully launched.
   */
function launchScriptAttack(ns, scriptName, target, source, goal, reserveThreads=0, localMode=false)
{
    const sectionName = "launchScriptAttack";

    // This function launches the attack for what ever script is 
    // fed into it.
    let functionResult = false;

    let numThreadsAvailable = 0;

    const desiredNumThreads = getNumThreadsToReachGoal(ns, scriptName, goal, target);

    // If localMode is true this function will calculate how many threads are possible
    // on the local server, using the source variable provided to getNumThreadsPossible.
    if(localMode == true)
    {
        // Determine how many threads there is room for on the local server.
        numThreadsAvailable = getNumThreadsPossible(ns, scriptName, source, reserveThreads);
    }
    else
    {
        // Determine how many threads there is room for on the remote server.
        numThreadsAvailable = getNumThreadsPossible(ns, scriptName, target, reserveThreads);
    } 

    ns.printf("[%s]-INFO: Goal value: %d, script: %s ", sectionName, goal, scriptName);   

    ns.printf("[%s]-INFO: Determined %d threads required to get to goal on %s.", sectionName, desiredNumThreads, target);

    if(desiredNumThreads < numThreadsAvailable)
    {
        const result = ns.exec(scriptName, source, desiredNumThreads, target);
        
        if(result == 0)
        {
            ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, desiredNumThreads);
        }
        else
        {
            ns.printf("[%s]-INFO: Successfully opened up %d threads of %s on %s", sectionName, desiredNumThreads, scriptName, source);
            functionResult = true;
        }
    }
    else
    {
        if(numThreadsAvailable > 0)
        {
            const result = ns.exec(scriptName, source, numThreadsAvailable, target);

            if(result == 0)
            {
                ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, numThreadsAvailable);
            }
            else
            {
                ns.printf("[%s]-INFO: Successfully opened up %d threads of %s on %s", sectionName, numThreadsAvailable, scriptName, source);
                functionResult = true;
            }
        }
        else
        {
            ns.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
        }
    }

    return functionResult;    
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
function getNumThreadsPossible(ns, scriptName, target, reserveThreads = 0)
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
        // Using math function ceil() to remove any fractional parts of the result.

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

    ns.printf("[%s]-INFO: determined that %d can be opened.", functionName, numThreads);
    if(reserveThreads > 0)
    {
        ns.printf("[%s]-WARN: Detected reserve thread count of %d. Reducing thread count by this amount.", functionName, reserveThreads);
        numThreads = numThreads - reserveThreads;
    }
    return numThreads;
}

function getNumThreadsToReachGoal(ns, scriptName, goal, target, source="remote")
{
    const sectionName = "getNumThreadsToReachGoal";
    let server = (source == "remote" ? ns.getServer(target) : ns.getServer(source));
    const serverCpuCount = server.cpuCores;

    const localPrefix = "local_";

    const weakenScriptName = localPrefix + "weaken.js";
    const hackScriptName = localPrefix + "hack.js";
    const growScriptName =  localPrefix + "grow.js";

    ns.printf("[%s]-INFO: Goal: %d", sectionName, goal);

    let threadsRequired = 0;

    if(scriptName == weakenScriptName)
    {
      // Always reduce security down to minimum value.
      const valueOfOneWeaken = ns.weakenAnalyze(1, serverCpuCount);
      const serverDecreaseRequired = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
      ns.printf("[%s]-INFO: value of server decrease required: %d", sectionName, serverDecreaseRequired);

      threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
    }
    else if(scriptName == hackScriptName)
    {
      threadsRequired = ns.hackAnalyzeThreads(target, goal);
    }
    else if(scriptName == growScriptName)
    {
      threadsRequired = ns.growthAnalyze(target, goal, serverCpuCount);
    }

    const result = Math.ceil(threadsRequired);

    ns.printf("[%s]-INFO: Number of threads required to reach goal: %d", sectionName, result);

    return result;
}

export async function main(ns) 
{
    const target = ns.args[0];

    let mode = "analyze"; // Start in analyze mode

    // Analyze server state
    let minSec = ns.getServerMinSecurityLevel(target);
    let curSec = ns.getServerSecurityLevel(target);
    let maxMoney = ns.getServerMaxMoney(target);
    let curMoney = ns.getServerMoneyAvailable(target);

    const minMoney = 0; // Minimum money on server

    const weakenThreshold = minSec * 1.05; // Threshold for when to begin weakening (5% above min)
    const growThreshold = maxMoney * 0.75; // Threshold for when to begin growing money (75% of maxMoney)
    const hackThreshold = maxMoney * 0.92; // Threshold for when to begin hacking money (92% of maxMoney)

    while (true) 
    {
        // Analyze server state
        minSec = ns.getServerMinSecurityLevel(target);
        curSec = ns.getServerSecurityLevel(target);
        maxMoney = ns.getServerMaxMoney(target);
        curMoney = ns.getServerMoneyAvailable(target);

        switch (mode) 
        {
            case "analyze":
                
                // Check server state and decide next mode

                if (curSec > weakenThreshold) 
                {
                    // The servers security is too high, we need to weaken it
                    mode = "weaken";                        
                }
                else if (curMoney < growThreshold) 
                {
                    // The server needs to grow more money
                    mode = "grow";                    
                }
                else if(curMoney >= hackThreshold)
                {
                    // The server is primed for hacking
                    mode = "hack";
                }

                continue;

            case "weaken":
                // Use launchScriptAttack to weaken to minSec
                launchScriptAttack(ns, "weaken.js", target, target, minSec, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getWeakenTime(target));
                continue;

            case "grow":
                // Use launchScriptAttack to grow to maxMoney
                launchScriptAttack(ns, "grow.js", target, target, maxMoney, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getGrowTime(target));
                continue;

            case "hack":
                // Use launchScriptAttack to hack down to minMoney
                launchScriptAttack(ns, "hack.js", target, target, minMoney, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getHackTime(target));
                continue;
                break;
        }
    }
} 