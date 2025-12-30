// servers/home/local_grow.js
async function main(ns) {
  const target = ns.args[0];
  while (true) {
    await ns.grow(target);
  }
}
export {
  main
};
