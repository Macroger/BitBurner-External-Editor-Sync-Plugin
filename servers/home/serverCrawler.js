/** @param {NS} ns */
import {getValidServerList, scanForServers, displayStats} from "./myFunctions.js";
export async function main(ns) {

  let startingPoint = "home";
  let useValidate = false;
  let useRamRequirement = false;
  let useAntiRamRequirement = false;
  let validatedServerList = [];

  if(ns.args.length != 0)
  {
    for(let arg of ns.args)
    {
      if(arg == "-v")
      {
        useValidate = true;
      }
      else if(arg == "-r")
      {
        useRamRequirement = true;
      }
      else if(arg == "-R")
      {
        useAntiRamRequirement = true;
      }       
      else
      {
        startingPoint = arg;
      }
    }  
  }
  
  if(useValidate == true)
  {
    const servers = scanForServers(ns, startingPoint);
    ns.tprintf("Detected %d un-validated servers", servers.length);
    validatedServerList = getValidServerList(ns, servers);
    ns.tprintf("SUCCESS: Found %d validated servers, sniffing those servers...", validatedServerList.length);
  }
  else if(useAntiRamRequirement == true)
  {
    validatedServerList = getValidServerList(ns, scanForServers(ns, startingPoint),1 ,1, false, true)
  }
  else if (useRamRequirement == true)
  {
    validatedServerList = getValidServerList(ns, scanForServers(ns, startingPoint), 1, 1, true, false);
  }

  for(let target of validatedServerList)
  {
    ns.tprintf("------------------------------------------------------------------------------------------------");
    displayStats(ns, target);        
    ns.tprintf("------------------------------------------------------------------------------------------------");
  }

  ns.tprintf("INFO: Number of servers listed: %d", validatedServerList.length);
}