/**
 * @hidden
 */
export declare class DeferredPromise<T, E extends Error> {
    resolve: (value?: T) => void;
    reject: (err?: E) => void;
    promise: Promise<T>;
    constructor();
    init(): void;
}
