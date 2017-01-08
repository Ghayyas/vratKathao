"use strict";
/**
 * @hidden
 */
var Stat = (function () {
    function Stat(appId, stat, value) {
        if (value === void 0) { value = 1; }
        this.appId = appId;
        this.stat = stat;
        this.value = value;
        this.appId = appId;
        this.stat = stat;
        this.value = value;
        this.created = new Date();
    }
    Stat.prototype.toJSON = function () {
        return {
            app_id: this.appId,
            stat: this.stat,
            value: this.value,
            created: this.created.toISOString(),
        };
    };
    return Stat;
}());
exports.Stat = Stat;
/**
 * A client for Insights that handles batching, user activity insight, and
 * sending insights at an interval.
 *
 * @hidden
 */
var Insights = (function () {
    function Insights(deps, options) {
        var _this = this;
        if (options === void 0) { options = {
            'intervalSubmit': 60 * 1000,
            'intervalActiveCheck': 1000,
            'submitCount': 100
        }; }
        this.options = options;
        this.app = deps.appStatus;
        this.storage = deps.storage;
        this.config = deps.config;
        this.client = deps.client;
        this.logger = deps.logger;
        this.batch = [];
        setInterval(function () {
            _this.submit();
        }, this.options.intervalSubmit);
        setInterval(function () {
            if (!_this.app.closed) {
                _this.checkActivity();
            }
        }, this.options.intervalActiveCheck);
    }
    /**
     * Track an insight.
     *
     * @param stat - The insight name.
     * @param value - The number by which to increment this insight.
     */
    Insights.prototype.track = function (stat, value) {
        if (value === void 0) { value = 1; }
        this.trackStat(new Stat(this.config.get('app_id'), stat, value));
    };
    Insights.prototype.checkActivity = function () {
        var session = this.storage.get('insights_session');
        if (!session) {
            this.markActive();
        }
        else {
            var d = new Date(session);
            var hour = 60 * 60 * 1000;
            if (d.getTime() + hour < new Date().getTime()) {
                this.markActive();
            }
        }
    };
    Insights.prototype.markActive = function () {
        this.storage.set('insights_session', new Date().toISOString());
        this.track('mobileapp.active');
    };
    Insights.prototype.trackStat = function (stat) {
        this.batch.push(stat);
        if (this.shouldSubmit()) {
            this.submit();
        }
    };
    Insights.prototype.shouldSubmit = function () {
        return this.batch.length >= this.options.submitCount;
    };
    Insights.prototype.submit = function () {
        var _this = this;
        if (this.batch.length === 0) {
            return;
        }
        var insights = [];
        for (var _i = 0, _a = this.batch; _i < _a.length; _i++) {
            var stat = _a[_i];
            insights.push(stat.toJSON());
        }
        this.client.post('/insights')
            .send({ 'insights': insights })
            .end(function (err, res) {
            if (err) {
                _this.logger.error('Ionic Insights: Could not send insights.', err);
            }
        });
        this.batch = [];
    };
    return Insights;
}());
exports.Insights = Insights;
