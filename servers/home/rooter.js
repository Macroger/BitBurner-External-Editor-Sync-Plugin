import {scanForServers, getValidServerList, getRootAccess} from "./myFunctions.js";
/** @param {NS} ns */
export async function main(ns) 
{
  if(ns.args.length == 1)
  {
    const target = ns.args[0]
    if(ns.serverExists(target) == true)
    {
      ns.tprintf("SUCCESS: Found server: %s", target);
      rootServer(target);
    }
    else
    {
      ns.tprintf("ERROR: Unable to find server.");
      ns.exit();
    }
      
    ns.tprintf("\n");
  }
  else if(ns.args.length > 1)
  {
    ns.tprintf("ERROR: More than 1 argument provided. Please provide only a server hostname to target a single server.");
  }
  else
  {
    // This section has been designed to gain root-access to multiple servers at once.
    let validatedServers = getValidServerList(ns, scanForServers(ns), 1, 1);   

    let count = 1;

    for(let target of validatedServers)
    {
      ns.tprintf("SUCCESS: Found server #%d: %s", count, target);

      rootServer(target);

      ns.tprintf("\n");
      count++;
    }

    ns.tprintf("INFO: Servers found: %d", validatedServers.length);
  }

  function rootServer(target)
  {
    let rootResult = false;

    if(ns.hasRootAccess(target) == false)
    {
      ns.tprintf("INFO: %s has not been rooted.", target);
      rootResult = getRootAccess(ns, target);
      if(rootResult == true)
      {
        ns.tprintf("SUCCESS: Root access has been granted to: %s", target);
      }
      else
      {
        ns.tprintf("ERROR: Failed to grant root access to: %s", target);
      }

    }
    else
    {
      ns.tprintf("WARN: Root access was previously granted.");
      rootResult = true;
    }    

    return rootResult;
  }
}