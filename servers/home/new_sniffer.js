/** @param {NS} ns */

// A more advanced server sniffer script with improved formatting and additional details.
// This script displays server information in a structured format with color coding for better readability.
// It can either scan all directly connected servers or target a specific server based on user input.


/**
 * Prints detailed, color-coded information about a BitBurner server in a structured format.
 *
 * @param {NS} ns - The BitBurner Netscript API object.
 * @param {string} target - The hostname of the server to display information for.
 * @param {number|null} [index=null] - (Optional) The index of the server in a list, for display (e.g., "Server 2 of 5").
 * @param {number|null} [total=null] - (Optional) The total number of servers in the list, for display.
 *
 * Displays hacking skill, security (current/min), growth rate, grow/weaken/hack times, money, RAM, root access, and running scripts.
 */
function printServerInfo(ns, target, index = null, total = null) 
{
    const cyan = "\u001b[36m";
    const green = "\u001b[32m";
    const red = "\u001b[31m";
    const reset = "\u001b[0m";

    const runningScripts = ns.ps(target);
    const label = (txt) => `${cyan}${txt.padEnd(30)}${reset}`;
    const value = (txt, color=reset) => `${color}${txt}${reset}`;

    if (index !== null && total !== null) {
        ns.tprintf(`\nShowing server ${index} of ${total}: ${cyan}${target}${reset}`);
    } else {
        ns.tprintf(`\n${cyan}${target}${reset}`);
    }

    ns.tprintf("────────────────────────────────────────────");
    ns.tprintf("%s%s", label("Hacking skill:"), value(ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1000, true), green));
    ns.tprintf(
        "%s%s / %s",
        label("Security (Curr. / Min):"),
        value(ns.formatNumber(ns.getServerSecurityLevel(target), 0), green),
        value(ns.formatNumber(ns.getServerMinSecurityLevel(target), 0), cyan)
    );

    ns.tprintf("%s%s", label("Growth rate:"), value(ns.getServerGrowth(target), green));

    const growMins = Math.floor(ns.getGrowTime(target) / 1000 / 60);
    const growSecs = Math.floor((ns.getGrowTime(target) / 1000) % 60);

    ns.tprintf("%s%s minutes %s seconds", label("Grow time:"), value(growMins, cyan), value(growSecs, cyan));

    const weakMins = Math.floor(ns.getWeakenTime(target) / 1000 / 60);
    const weakSecs = Math.floor((ns.getWeakenTime(target) / 1000) % 60);

    ns.tprintf("%s%s minutes %s seconds", label("Weaken time:"), value(weakMins, cyan), value(weakSecs, cyan));

    const hackMins = Math.floor(ns.getHackTime(target) / 1000 / 60);
    const hackSecs = Math.floor((ns.getHackTime(target) / 1000) % 60);

    ns.tprintf("%s%s minutes %s seconds", label("Hack time:"), value(hackMins, cyan), value(hackSecs, cyan));

    ns.tprintf(
        "%s%s / %s",
        label("Money (Avail/Max):"),
        value(`$${ns.formatNumber(ns.getServerMoneyAvailable(target), 1, 1000, true)}`, green),
        value(`$${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true)}`, green)
    );
    ns.tprintf(
        "%s%s / %s",
        label("RAM (Used/Total):"),
        value(ns.formatRam(ns.getServerUsedRam(target)), (ns.getServerUsedRam(target) === ns.getServerMaxRam(target)) ? red : cyan),
        value(ns.formatRam(ns.getServerMaxRam(target)), green)
    );
    const lock = ns.hasRootAccess(target) ? "🔓" : "🔒";
    ns.tprintf(
        "%s%s %s%s",
        label("Root access status:"),
        lock,
        ns.hasRootAccess(target) ? value("Granted", green) : value("Not Granted", red),
        reset
    );
    if (runningScripts.length === 0) {
        ns.tprintf("%s%s", label("Running scripts:"), value("None detected.", green));
    } else {
        ns.tprintf("%s", label("Scripts running:"));
        for (let script of runningScripts) {
            ns.tprintf("  %s%s%s %s%s%s",
                green, script.filename, reset,
                cyan, script.args && script.args.length > 0 ? `[${script.args.join(", ")}]` : "", reset
            );
        }
    }
    ns.tprintf("────────────────────────────────────────────");
}

export async function main(ns) {

  // Custom color coding.
  const cyan = "\u001b[36m";
  const green = "\u001b[32m";
  const red = "\u001b[31m";
  const reset = "\u001b[0m";

  // If no arguments are detected scan all directly connected servers.
  if(ns.args.length === 0)
  {
    ns.tprintf("INFO: No target server specified, scanning all directly connected servers...");
    // Check for "all" argument to scan all directly connected servers.
    let servers = ns.scan();

      if(servers.length == 0)
      {
        ns.tprintf("ERROR: No directly connected servers found!");
        return;
      }
      else
      {
        ns.tprintf("SUCCESS: Found %d directly connected servers, sniffing those servers...", servers.length);
      }

      let serverNumber = 1;
      
      // Iterate through all directly connected servers and display their stats.
      for (let target of servers) {
        printServerInfo(ns, target, serverNumber, servers.length);
        serverNumber++;
    }
  }
  // If an argument is detected, use that as the target server to sniff.
  else
  { 
    ns.tprintf("\n");
    ns.tprintf("INFO: Target server specified, sniffing %s...", ns.args[0]);

    // Use provided argument to search for server to sniff.
    let target = ns.args[0];

     if (ns.serverExists(target)) {
        printServerInfo(ns, target);
    } else {
        ns.tprintf("ERROR: Server %s not found!", target);
    }
  }
}