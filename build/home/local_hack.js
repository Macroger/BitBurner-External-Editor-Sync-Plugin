// servers/home/local_hack.js
async function main(ns) {
  const target = ns.args[0];
  await ns.hack(target);
}
export {
  main
};
