/** @param {NS} ns */
import { scanForAllServers } from "./myFunctions.js";
export async function main(ns) 
{

  function enumerateServerNameLength(servers)
  {
    let newNameLength = 0;
    let maxNameLengthDetected = 0;
    let serverWithMaxNameLength = "";

    for(let potentialTarget of servers)
    {
      newNameLength = potentialTarget.name.length;
      if(newNameLength > maxNameLengthDetected)
      {
        maxNameLengthDetected = newNameLength;
        serverWithMaxNameLength = potentialTarget;
      }      
    }
    // Provide a final report after scanning all servers
    ns.tprint(`Maximum server name length detected: ${maxNameLengthDetected} on server: ${serverWithMaxNameLength.name}`);
  }

  const servers = scanForAllServers(ns);

  ns.tprint(`Total servers scanned: ${servers.length}`);

  enumerateServerNameLength(servers);  

}