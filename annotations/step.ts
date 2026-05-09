import { test } from '@playwright/test';

/**
 * Usage:
 *
 * import { step } from './step_decorator';
 *
 * class MyTestClass {
 *   @step('optional step name')
 *   async myTestFunction() {
 *     // Test code goes here
 *   }
 * }
 */
export function step<This, Args extends unknown[], Return>(message?: string) {
  return function actualDecorator(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext
  ) {
    function replacementMethod(this: This, ...args: Args) {
      const name =
        message ?? `${this.constructor.name}.${context.name as string}`;

      return test.step(name, async () => target.call(this, ...args));
    }

    return replacementMethod;
  };
}
