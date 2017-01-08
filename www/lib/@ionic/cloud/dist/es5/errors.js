"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * @hidden
 */
var Exception = (function (_super) {
    __extends(Exception, _super);
    function Exception(message) {
        _super.call(this, message);
        this.message = message;
        this.name = 'Exception';
        this.stack = (new Error()).stack;
    }
    Exception.prototype.toString = function () {
        return this.name + ": " + this.message;
    };
    return Exception;
}(Error));
exports.Exception = Exception;
/**
 * An error with generic error details.
 *
 * Error details can be extracted depending on the type of `D`. For instance,
 * if the type of `D` is `string[]`, you can do this:
 *
 * ```typescript
 * function handleError(err: IDetailedError<string[]>) {
 *   for (let i in err.details) {
 *     console.error('got error code: ' + i);
 *   }
 * }
 * ```
 *
 * @featured
 */
var DetailedError = (function (_super) {
    __extends(DetailedError, _super);
    function DetailedError(
        /**
         * The error message.
         */
        message, 
        /**
         * The error details.
         */
        details) {
        _super.call(this, message);
        this.message = message;
        this.details = details;
        this.name = 'DetailedError';
    }
    return DetailedError;
}(Exception));
exports.DetailedError = DetailedError;
