// servers/home/myFunctions.js
function scanForServers(ns, startingPoint = "home") {
  let serverList = [];
  const servers = ns.scan(startingPoint);
  for (let target of servers) {
    if (serverList.indexOf(target) === -1) {
      serverList.push(target);
    }
  }
  for (let x of serverList) {
    const newServers = ns.scan(x);
    for (let newServerTarget of newServers) {
      if (serverList.indexOf(newServerTarget) === -1) {
        serverList.push(newServerTarget);
      }
    }
  }
  return serverList;
}

// servers/home/killAllScripts.js
async function main(ns) {
  ns.tprintf("INFO: Scanning servers and looking for ones with scripts running...");
  const servers = scanForServers(ns, "home");
  for (let target of servers) {
    if (target == "home") {
      continue;
    }
    let runningScripts = ns.ps(target);
    if (runningScripts.length != 0) {
      ns.tprintf("SUCCESS: Scripts found running on %s: ", target);
      for (let script of runningScripts) {
        ns.tprintf("%s", script.filename);
      }
      ns.tprintf("WARN: Issuing killall command.");
      ns.killall(target);
      runningScripts = ns.ps(target);
      if (runningScripts.length == 0) {
        ns.tprintf("SUCCESS: Script termination verified.\n\n");
        const scriptFiles = ns.ls(target, ".js");
        for (let file of scriptFiles) {
          if (file !== "killAllScripts.js") {
            ns.rm(file, target);
            ns.tprintf("INFO: Removed %s from %s", file, target);
          }
        }
      } else {
        ns.tprintf("ERROR: Scripts still running, something went wrong with %s.", target);
      }
    }
  }
}
export {
  main
};
