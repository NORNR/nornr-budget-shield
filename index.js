import { runBudgetShield } from "./lib.js";

runBudgetShield().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
