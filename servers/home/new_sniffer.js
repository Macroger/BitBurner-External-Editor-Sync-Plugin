

/** @param {NS} ns */
import {scanForAllServers, getBestBotnetTarget, getValidServerList, findPathToServer} from "./myFunctions.js";


// A more advanced server sniffer script with improved formatting and additional details.
// This script displays server information in a structured format with color coding for better readability.
// It can either scan all directly connected servers or target a specific server based on user input.


/**
 * Prints a visual ASCII path from home to the target server.
 * @param {NS} ns - The Bitburner Netscript API object.
 * @param {string[]} pathArr - Array of hostnames from home to target.
 */
function printPathVisual(ns, pathArr) {
    if (!Array.isArray(pathArr) || pathArr.length === 0) 
    {
        ns.tprintf("[Path] No path found.");
        return;
    }

    let prefix = "";
    
    for (let i = 0; i < pathArr.length; i++) 
    {
        if (i === 0) {
            ns.tprintf("%s", pathArr[i]);
        } 
        else 
        {
            prefix += "     ";
            ns.tprintf("%s└── %s", prefix, pathArr[i]);
        }
    }
}

/**
 * getTargetConnectionPath: Returns an array of colorized server names for the path from home to the target server.
 * First and last nodes are cyan, intermediate nodes are rainbow gradient.
 * @param {string[]} pathArr - Array of hostnames from home to target.
 * @returns {string[]} - Array of colorized server names.
 */
function getTargetConnectionPath(pathArr) 
{
    if (!Array.isArray(pathArr) || pathArr.length === 0) 
    {
        return ["[Path] No path found."];
    }

    const rainbowColors = [196, 202, 208, 220, 46, 51, 27, 93, 201];
    const cyan = "\u001b[36m";
    const reset = "\u001b[0m";
    let colored = [];

    for (let i = 0; i < pathArr.length; i++) 
    {
        if (i === 0 || i === pathArr.length - 1) 
        {
            colored.push(`${cyan}${pathArr[i]}${reset}`);
        } 
        else 
        {
            let colorIdx = Math.floor((i - 1) * (rainbowColors.length - 1) / (pathArr.length - 2));
            let colorCode = rainbowColors[colorIdx];
            colored.push(`\u001b[38;5;${colorCode}m${pathArr[i]}${reset}`);
        }
    }
    return colored;
}

/**
 * printServerSummary: Prints a concise, color-coded summary of a BitBurner server's key stats in a single line.
 * @param {*} ns - The BitBurner Netscript API object.
 * @param {*} server - The server object to summarize.
 * @param {*} idx - The index of the server in the list.
 * @param {*} total - The total number of servers in the list.
 */
function printServerSummary(ns, server, idx, total) {
    const cyan = "\u001b[36m";
    const green = "\u001b[32m";
    const red = "\u001b[31m";
    const magenta = "\u001b[35m";
    const reset = "\u001b[0m";

    // Prepare each field with color
    const name = `${magenta}${server.name}${reset}`;
    
    const security = `${cyan}${ns.formatNumber(ns.getServerSecurityLevel(server.name), 2, 1000, true)}${reset}`;
    const securityLabel = `${green}Security: ${reset}`;

    const ram = `${cyan}${ns.formatRam(ns.getServerMaxRam(server.name))}${reset}`;
    const ramLabel = `${green}RAM: ${reset}`;
    
    const money = `${cyan}${ns.formatNumber(ns.getServerMaxMoney(server.name), 2, 1000, true)}${reset}`;
    const moneyLabel = `${green}Max Money: ${reset}`;

    const rootLabel = `${green}Root Access: ${reset}`;
    const root = ns.hasRootAccess(server.name) ? `${green}GRANTED${reset}` : `${red}DENIED${reset}`;

    // Build the summary string step by step
    let summary = `[${idx}/${total}] `;
    summary += name;
    summary += " | " + securityLabel + security;
    summary += " | " + ramLabel + ram;
    summary += " | " + moneyLabel + money;
    summary += " | " + rootLabel + root;

    ns.tprintf(summary);
    ns.tprintf("──────────────────────────────────────────────────────────────────────────────────────────────────────");
}

/**
 * Name: printServerInfo
 * Prints detailed, color-coded information about a BitBurner server in a structured format.
 *
 * @param {NS} ns - The BitBurner Netscript API object.
 * @param {string} target - The hostname of the server to display information for.
 * @param {number|null} [index=null] - (Optional) The index of the server in a list, for display (e.g., "Server 2 of 5").
 * @param {number|null} [total=null] - (Optional) The total number of servers in the list, for display.
 *
 * Displays hacking skill, security (current/min), growth rate, grow/weaken/hack times, money, RAM, root access, and running scripts.
 */
function printServerInfo(ns, target, index = null, total = null) {
    
    // Some custom colors
    const cyan = "\u001b[36m";
    const green = "\u001b[32m";
    const red = "\u001b[31m";
    const reset = "\u001b[0m";
    const pastelPink = "\u001b[38;5;218m";
    const peach = "\u001b[38;5;215m";

    // Get running scripts on the target server
    const runningScripts = ns.ps(target);

    // Get the path from home to the target server
    const pathArr = findPathToServer(ns, target);

    // Determine lock icon based on root access
    const lock = ns.hasRootAccess(target) ? "🔓" : "🔒";

    // Helper functions for formatting
    const label = (txt) => `${pastelPink}${txt.padEnd(30)}${reset}`;
    const value = (txt, color=reset) => `${color}${txt}${reset}`;

    // Calculate times for grow, weaken, and hack in minutes and seconds
    const growMins = Math.floor(ns.getGrowTime(target) / 1000 / 60);
    const growSecs = Math.floor((ns.getGrowTime(target) / 1000) % 60);
    const weakMins = Math.floor(ns.getWeakenTime(target) / 1000 / 60);
    const weakSecs = Math.floor((ns.getWeakenTime(target) / 1000) % 60);
    const hackMins = Math.floor(ns.getHackTime(target) / 1000 / 60);
    const hackSecs = Math.floor((ns.getHackTime(target) / 1000) % 60);

    // let targetConnectionPath = getTargetConnectionPath(pathArr);
    // let formattedConnectionPath = targetConnectionPath.join(`${cyan} -> ${reset}`);

    // Print header
    if (index !== null && total !== null) 
    {
        ns.tprintf(`\nShowing server ${index} of ${total}: ${cyan}${target}${reset}`);
    } 
    else 
    {
        ns.tprintf(`${cyan}${target}${reset}`);
    }

    ns.tprintf("────────────────────────────────────────────");
    ns.tprintf("%s%s", label("Hacking skill:"), value(ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1000, true), green));
    ns.tprintf("%s%s / %s", label("Security (Curr. / Min):"), value(ns.formatNumber(ns.getServerSecurityLevel(target), 0), cyan), value(ns.formatNumber(ns.getServerMinSecurityLevel(target), 0), green));
    ns.tprintf("%s%s", label("Growth rate:"), value(ns.getServerGrowth(target), cyan)); 
    ns.tprintf("%s%s minutes %s seconds", label("Grow time:"), value(growMins, cyan), value(growSecs, cyan));
    ns.tprintf("%s%s minutes %s seconds", label("Weaken time:"), value(weakMins, cyan), value(weakSecs, cyan));
    ns.tprintf("%s%s minutes %s seconds", label("Hack time:"), value(hackMins, cyan), value(hackSecs, cyan));
    ns.tprintf("%s%s / %s", label("Money (Avail/Max):"), value(`$${ns.formatNumber(ns.getServerMoneyAvailable(target), 1, 1000, true)}`, cyan), value(`$${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true)}`, green));
    ns.tprintf("%s%s / %s", label("RAM (Used/Total):"), value(ns.formatRam(ns.getServerUsedRam(target)), (ns.getServerUsedRam(target) === ns.getServerMaxRam(target)) ? red : cyan), value(ns.formatRam(ns.getServerMaxRam(target)), green));
    ns.tprintf("%s%s %s%s", label("Root access status:"), lock, ns.hasRootAccess(target) ? value("Granted", green) : value("Not Granted", red), reset);
    // ns.tprintf("%s%s", label(`Path to target:`), value(formattedConnectionPath, cyan));
    const colorizedPathArr = getTargetConnectionPath(pathArr);
    const chunkSize = 4;
    const arrow = `${cyan}->${reset}`;
    const labelText = label("Path to target:");
    const labelPad = label(""); // just the padding

    for (let i = 0; i < colorizedPathArr.length; i += chunkSize) 
    {
        const isLastChunk = (i + chunkSize >= colorizedPathArr.length);
        let chunkArr = colorizedPathArr.slice(i, i + chunkSize);
        let chunk = chunkArr.join(` ${arrow} `);
        if (!isLastChunk) {
            // For all but the last chunk, append an arrow after the chunk
            chunk = `${chunk} ${arrow}`;
        }
        ns.tprintf("%s%s", i === 0 ? labelText : labelPad, chunk);
    }

    if (runningScripts.length === 0) 
    {
        ns.tprintf("%s%s", label("Running scripts:"), value("None detected.", green));
    } 
    else 
    {
        ns.tprintf("%s", label("Scripts running:"));
        for (let script of runningScripts) 
        {
            ns.tprintf("  %s%s%s %s%s%s", green, script.filename, reset, cyan, script.args && script.args.length > 0 ? `[${script.args.join(", ")}]` : "", reset);
        }
    }
    ns.tprintf("────────────────────────────────────────────");
}

export async function main(ns) {

    // Booleans for modes
    let summaryMode = false;
    let detailedMode = false;
    let filterMode = false;
    let helpMode = false; 
    let botnetMode = false;

    const maxServersToShow = 10; // Maximum number of servers to show in filter mode
    const defaultServersToShow = 3; // Default number of servers to show if not specified

    let serverCountToShow = 0; // Default to 0 which means show all
    let filterModeType = ""; // E.g., money, RAM, growth, etc.

    const args = ns.args;


    // If no arguments: summary mode
    if (args.length === 0) 
    {
        summaryMode = true;      
    }
    else if (args.length >= 1) 
    {
        // Any args using - are used for filter flags.
        if (String(args[0]).startsWith('-'))        
        {
            // Check for the help flag
            if (args[0] === '-h') 
            {
                helpMode = true;
            }
            // Check for botnet flag
            else if (args[0] === '-b')
            {
                botnetMode = true;
                if (args.length >= 2) {
                    serverCountToShow = parseInt(args[1]);
                    if (isNaN(serverCountToShow) || serverCountToShow < 1 || serverCountToShow > maxServersToShow) {
                        ns.tprintf("ERROR: Invalid number of servers to show: '%s'. Must be between 1 and %d.", args[1], maxServersToShow);
                        return;
                    }
                } else {
                    serverCountToShow = defaultServersToShow;
                }
            }
            // Check for specific filter flags here (I.E., -m for money, -r for RAM, and -g for growth)
            else if(args[0] === '-m' || args[0] === '-r' || args[0] === '-g' || args[0] === '-s' || args[0] === '-o' || args[0] === '-O')
            {                
                filterMode = true;
                if(args.length >= 2)
                {
                    // Convert the second argument to a number from a string - to process it as a number instead.
                    serverCountToShow = parseInt(args[1]);
                    if(isNaN(serverCountToShow) || serverCountToShow < 1 || serverCountToShow > maxServersToShow)
                    {            
                        ns.tprintf("ERROR: Invalid number of servers to show: '%s'. Must be between 1 and %d.", args[1], maxServersToShow);
                        return;
                    }
                }
                else
                {
                    // Default to showing top defaultServersToShow (3) servers if no number provided
                    serverCountToShow = defaultServersToShow;
                }

                // Set the filter type based on the flag - remove the '-' character for easier processing later
                filterModeType = args[0].substring(1); // 'm', 'r', 'g', 's', 'o', or 'O'                
            } 
            else
            {
                ns.tprintf("ERROR: Unknown flag '%s'", args[0]);
                return;
            }             
        }
        else
        {
            // If the starting argument is not a flag, assume it is a server index or hostname for detailed mode
            detailedMode = true;
        }        
    }

    let servers = scanForAllServers(ns);


    // If summary mode
    if (summaryMode) 
    {
        ns.tprintf("\nScanning all servers...\n");

        let idx = 1;    // For numbering servers in the output

        if (servers.length === 0) {
            ns.tprintf("ERROR: No servers found!");
            return;
        }

        ns.tprintf("SUCCESS: Found %d servers. Showing summary:", servers.length);
        ns.tprintf("──────────────────────────────────────────────────────────────────────────────────────────────────────");        

        for (let server of servers) {
            printServerSummary(ns, server, idx, servers.length);
            idx++;
        }

        ns.tprintf("\nTo see a particular server's details run this script with that server's hostname as argument.");
        ns.tprintf("Example: run new_sniffer.js n00dles");

        return;
    }
    // If botnet mode
    else if (botnetMode)
    {
        // Get all servers and filter for valid botnet targets (same as getBestBotnetTarget)
        const allServerObjs = scanForAllServers(ns);
        const validServers = getValidServerList(ns, allServerObjs, 1, 1);
        if (validServers.length === 0) {
            ns.tprintf("No optimal botnet targets found.");
            return;
        }
        // Score and sort servers
        const scored = validServers.map(server => {
            const maxMoney = ns.getServerMaxMoney(server);
            const growth = ns.getServerGrowth(server);
            const minSec = ns.getServerMinSecurityLevel(server);
            const score = (maxMoney > 0 && minSec > 0) ? (maxMoney * growth) / minSec : -Infinity;
            return { name: server, score };
        }).filter(s => s.score > -Infinity);
        scored.sort((a, b) => b.score - a.score);
        const topN = scored.slice(0, serverCountToShow);
        ns.tprintf("Top %d botnet targets:", topN.length);
        ns.tprintf("──────────────────────────────────────────────────────────────────────────────────────────────────────");
        topN.forEach((entry, idx) => {
            ns.tprintf("#%d: %s (score: %s)", idx + 1, entry.name, ns.formatNumber(entry.score, 2, 1000, true));
            printServerInfo(ns, entry.name, idx + 1, topN.length);
        });
        ns.tprintf("──────────────────────────────────────────────────────────────────────────────────────────────────────");
        return;
    }
    else if (detailedMode)
    {        
        
        let arg = args[0];
        let target = null;

        // If argument is a number, treat as index
        if (!isNaN(arg)) 
        {
            let idx = parseInt(arg);
            if (idx >= 1 && idx <= servers.length) 
            {
                target = servers[idx - 1].name;
            }
            else 
            {
                ns.tprintf("ERROR: Index %s is out of range (1-%d)", arg, servers.length);
                return;
            }
        } 
        else 
        {
            ns.tprintf("Looking for server named '%s'...", arg);

            // Otherwise, treat as hostname
            let found = servers.find(s => s.name === arg);
            if (found) 
            {
                target = found.name;
            } 
            else 
            {
                ns.tprintf("ERROR: Server '%s' not found!", arg);
                return;
            }
        }

        // Finally, print detailed info for the target server   
        printServerInfo(ns, target);

        return;
    }
    else if (filterMode)
    {
        // Determine the sorting function based on filter type
        if (filterModeType === "m") 
        {
            ns.tprintf("\nFiltering servers by max money...\n\n");
            // Sort servers by max money, descending
            servers.sort((a, b) => ns.getServerMaxMoney(b.name) - ns.getServerMaxMoney(a.name));
        }
        else if (filterModeType === "r")
        {
            ns.tprintf("\nFiltering servers by max RAM...\n\n");
            // Sort servers by max RAM, descending
            servers.sort((a, b) => ns.getServerMaxRam(b.name) - ns.getServerMaxRam(a.name));
        }
        else if (filterModeType === "g")
        {
            ns.tprintf("\nFiltering servers by growth rate...\n\n");
            // Sort servers by growth rate, descending
            servers.sort((a, b) => ns.getServerGrowth(b.name) - ns.getServerGrowth(a.name));
        }
        // S for security level - ascending
        else if(filterModeType === "s")
        {
            ns.tprintf("\nFiltering servers by lowest security level...\n\n");
            servers.sort((a, b) => ns.getServerSecurityLevel(a.name) - ns.getServerSecurityLevel(b.name));
        }
        else if (filterModeType === "")
        {
            ns.tprintf("ERROR: No valid filter type specified.");
            return;
        }
        else if (filterModeType === "o") 
        {
            // Filter by optimal hacking targets
            ns.tprintf("\nFiltering servers by optimal hacking targets...\n\n");

            
            servers = servers.filter(s => ns.getServerMaxRam(s.name) === 0 && ns.getServerMaxMoney(s.name) > 0);
            servers.sort((a, b) => 
            {
                const aScore = (ns.getServerMaxMoney(a.name) * ns.getServerGrowth(a.name)) /
                    (ns.getGrowTime(a.name) + ns.getHackTime(a.name) + ns.getWeakenTime(a.name) + 1);

                const bScore = (ns.getServerMaxMoney(b.name) * ns.getServerGrowth(b.name)) /
                    (ns.getGrowTime(b.name) + ns.getHackTime(b.name) + ns.getWeakenTime(b.name) + 1);
                
                return bScore - aScore;
            });
        }
        else if (filterModeType === "O")
        {
            // Filter by optimal hacking targets considering only hack time
            ns.tprintf("\nFiltering servers by optimal hacking targets for the home computer, I.E., servers with no RAM...\n\n");
            
            // Home optimal: only servers with no RAM and max money > 0
            servers = servers.filter(s => ns.getServerMaxMoney(s.name) > 0 && ns.getServerMaxRam(s.name) > 0);
            servers.sort((a, b) => 
            {
                const aScore = (ns.getServerMaxMoney(a.name) * ns.getServerGrowth(a.name)) /
                    (ns.getGrowTime(a.name) + ns.getHackTime(a.name) + ns.getWeakenTime(a.name) + 1);

                const bScore = (ns.getServerMaxMoney(b.name) * ns.getServerGrowth(b.name)) /
                    (ns.getGrowTime(b.name) + ns.getHackTime(b.name) + ns.getWeakenTime(b.name) + 1);

                return bScore - aScore;
            });
        }
        // You can add more filters here (e.g., "r" for RAM, "g" for growth)

        // Limit the number of servers if needed
        if (serverCountToShow > 0) {
            servers = servers.slice(0, serverCountToShow);
        }

        // Print the filtered/sorted list
        // servers.forEach((server, idx) => printServerSummary(ns, server, idx + 1, servers.length));
        servers.forEach((server) =>  printServerInfo(ns, server.name));
    }
    else if (helpMode)
    {
        ns.tprintf("\n=== new_sniffer.js Help ===\n");
        ns.tprintf("This script scans and displays information about BitBurner servers in a formatted, color-coded way.\n");
        ns.tprintf("\nFeatures:");
        ns.tprintf("- Lists all discovered servers with key stats (money, RAM, security, growth, etc.)");
        ns.tprintf("- Shows detailed info for a specific server by hostname");
        ns.tprintf("- Supports filtering and sorting the server list by various criteria");
        ns.tprintf("- Filter options include max money, RAM, growth, security, and optimal hacking targets");
        ns.tprintf("- 'Optimal' filters help you find the best servers to hack for profit, including a special mode for remote hacking from home\n");
        ns.tprintf("Usage:");
        ns.tprintf("  run new_sniffer.js                # Show summary of all servers");
        ns.tprintf("  run new_sniffer.js <hostname>     # Show details for a specific server");
        ns.tprintf
        ns.tprintf("  run new_sniffer.js -m [N]         # Show top N servers sorted by max money");
        ns.tprintf("  run new_sniffer.js -r [N]         # Show top N servers sorted by max RAM");
        ns.tprintf("  run new_sniffer.js -g [N]         # Show top N servers sorted by growth");
        ns.tprintf("  run new_sniffer.js -s [N]         # Show top N servers sorted by lowest security");
        ns.tprintf("  run new_sniffer.js -o [N]         # Show top N optimal hack targets (high money, low times)");
        ns.tprintf("  run new_sniffer.js -O [N]         # Show top N optimal hack targets for home (no RAM servers)");
        ns.tprintf("  run new_sniffer.js -b [N]         # Show the best botnet target server");
        ns.tprintf("  run new_sniffer.js -h             # Show this help screen\n");
        ns.tprintf("Arguments:");
        ns.tprintf("  -m   Sort by max money\n  -r   Sort by max RAM\n  -g   Sort by growth\n  -s   Sort by lowest security\n  -o   Optimal hack targets (profit/time)\n  -O   Optimal hack targets for home (no RAM)\n  -h   Show help\n");
        ns.tprintf("If N is omitted, the top 3 servers are shown. N must be between 1 and 10.\n");
        ns.tprintf("Examples:");
        ns.tprintf("  run new_sniffer.js -m 3\n  run new_sniffer.js -o 5\n  run new_sniffer.js -O 7\n  run new_sniffer.js n00dles\n");
        ns.tprintf("===========================\n");
        return;
    }

}