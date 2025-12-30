/** @param {NS} ns */
import {scanForServers} from "./myFunctions.js";
export async function main(ns) {

  // Connect to all servers and kill any scripts running on them.

  ns.tprintf("INFO: Scanning servers and looking for ones with scripts running..."); 

  const servers = scanForServers(ns, "home");  
  for(let target of servers)
  {
    if(target == "home")
    {
      continue;
    }
    let runningScripts = ns.ps(target);
    
    if(runningScripts.length != 0)
    {
      ns.tprintf("SUCCESS: Scripts found running on %s: ", target);
      for(let script of runningScripts)
      {
        ns.tprintf("%s", script.filename);
      }
      ns.tprintf("WARN: Issuing killall command.");
      ns.killall(target);
      runningScripts = ns.ps(target);
      if(runningScripts == 0)
      {
        ns.tprintf("SUCCESS: Script termination verified.\n\n");
      }
      else
      {
        ns.tprintf("ERROR: Scripts still running, something went wrong with %s.", target);
      }
    }    
  }
}