// servers/home/local_hack.js
async function main(ns) {
  const target = ns.args[0];
  while (true) {
    await ns.hack(target);
  }
}
export {
  main
};
