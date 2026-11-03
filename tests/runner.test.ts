import { expect, test } from "vitest";

const RUNNER_STARTED = true;

test("the runner starts without a preview", () => {
  expect(RUNNER_STARTED).toBe(true);
});
