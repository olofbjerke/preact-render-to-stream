const timeoutResult = {};

/**
 * Creates a promise that resolves after a given timeout.
 * @param timeout - The timeout in milliseconds, after which the promise is resolved with a known value.
 */
export function timeoutPromise(timeout: number) {
    return new Promise((res) => setTimeout(() => res(timeoutResult), timeout));
}

/**
 * Checks if a value is the timeout result.
 * @param value - The value to check if it is the timeout result.
 */
export function isTimeoutResult(value: any): value is typeof timeoutResult {
    return value === timeoutResult;
}
