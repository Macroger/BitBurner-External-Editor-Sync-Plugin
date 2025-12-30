/** @param {NS} ns */
export async function main(ns) {

  // If no arguments are detected, exit the script.
  if(ns.args.length === 0)
  {
    // no argument means sniff all servers.
    if(ns.args[0] == "all")
    {
      let servers = ns.scan();
      
      for(let target of servers)
      {
        const runningScripts = ns.ps(target);
        
        ns.tprintf("\n%s found!", target);
        //ns.tprintf("Required hacking skill: %s", ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1000, true) );        
        ns.tprintf("\nServer security ratings (Minimum, Base, Current): (%s, %s, %s)", ns.formatNumber(ns.getServerMinSecurityLevel(target)), ns.formatNumber(ns.getServerBaseSecurityLevel(target)), ns.formatNumber(ns.getServerSecurityLevel(target)));
        ns.tprintf("\nMoney available: $%s", ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1000, true));
        ns.tprintf("Maximum Money: $%s", ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true));      
        ns.tprintf("\nTotal amount of RAM: %s", ns.formatRam(ns.getServerMaxRam(target)));
        ns.tprintf("Amount of free RAM: %s", ns.formatRam(ns.getServerMaxRam(target) - ns.getServerUsedRam(target)));
        ns.tprintf("\nRoot access status: %s", ns.hasRootAccess(target) ? "Granted" : "Not Granted");
        if(runningScripts.length == 0)
        {
          ns.tprintf("Running scripts: None detected.");
        }
        else
        {
          ns.tprintf("Scripts running: ");
          for(let script of runningScripts)
          {
            ns.tprintf("%s", script.filename);
            ns.tprintf(script.args);
          }
        }
        ns.tprintf("------------------------------------------------------------------------------------------------");
      }
    }
  }
  else
  { 
    // Use provided argument to search for server to sniff.

  }
  
  function drawFrame()
  {
    // This function draws the text at the top that describe the categories.
    ns.tprintf("HOSTNAME")
  }
}