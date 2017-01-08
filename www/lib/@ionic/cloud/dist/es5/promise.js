"use strict";
/**
 * @hidden
 */
var DeferredPromise = (function () {
    function DeferredPromise() {
        this.init();
    }
    DeferredPromise.prototype.init = function () {
        var _this = this;
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    };
    return DeferredPromise;
}());
exports.DeferredPromise = DeferredPromise;
