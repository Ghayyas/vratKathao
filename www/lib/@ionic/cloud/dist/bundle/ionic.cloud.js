(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var errors_1 = require('./errors');
var promise_1 = require('./promise');
/**
 * @hidden
 */
var AuthTokenContext = (function () {
    function AuthTokenContext(deps, label) {
        this.label = label;
        this.storage = deps.storage;
    }
    AuthTokenContext.prototype.get = function () {
        return this.storage.get(this.label);
    };
    AuthTokenContext.prototype.store = function (token) {
        this.storage.set(this.label, token);
    };
    AuthTokenContext.prototype.delete = function () {
        this.storage.delete(this.label);
    };
    return AuthTokenContext;
}());
exports.AuthTokenContext = AuthTokenContext;
/**
 * @hidden
 */
var CombinedAuthTokenContext = (function () {
    function CombinedAuthTokenContext(deps, label) {
        this.label = label;
        this.storage = deps.storage;
        this.tempStorage = deps.tempStorage;
    }
    CombinedAuthTokenContext.prototype.get = function () {
        var permToken = this.storage.get(this.label);
        var tempToken = this.tempStorage.get(this.label);
        var token = tempToken || permToken;
        return token;
    };
    CombinedAuthTokenContext.prototype.store = function (token, options) {
        if (options === void 0) { options = { 'permanent': true }; }
        if (options.permanent) {
            this.storage.set(this.label, token);
        }
        else {
            this.tempStorage.set(this.label, token);
        }
    };
    CombinedAuthTokenContext.prototype.delete = function () {
        this.storage.delete(this.label);
        this.tempStorage.delete(this.label);
    };
    return CombinedAuthTokenContext;
}());
exports.CombinedAuthTokenContext = CombinedAuthTokenContext;
/**
 * `Auth` handles authentication of a single user, such as signing up, logging
 * in & out, social provider authentication, etc.
 *
 * @featured
 */
var Auth = (function () {
    function Auth(deps, 
        /**
         * @hidden
         */
        options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.config = deps.config;
        this.emitter = deps.emitter;
        this.authModules = deps.authModules;
        this.tokenContext = deps.tokenContext;
        this.userService = deps.userService;
        this.storage = deps.storage;
    }
    Object.defineProperty(Auth.prototype, "passwordResetUrl", {
        /**
         * Link the user to this URL for password resets. Only for email/password
         * authentication.
         *
         * Use this if you want to use our password reset forms instead of creating
         * your own in your app.
         */
        get: function () {
            return this.config.getURL('web') + "/password/reset/" + this.config.get('app_id');
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Check whether the user is logged in or not.
     *
     * If an auth token exists in local storage, the user is logged in.
     */
    Auth.prototype.isAuthenticated = function () {
        var token = this.tokenContext.get();
        if (token) {
            return true;
        }
        return false;
    };
    /**
     * Sign up a user with the given data. Only for email/password
     * authentication.
     *
     * `signup` does not affect local data or the current user until `login` is
     * called. This means you'll likely want to log in your users manually after
     * signup.
     *
     * If a signup fails, the promise rejects with a [`IDetailedError`
     * object](/api/client/idetailederror) that contains an array of error codes
     * from the cloud.
     *
     * @param details - The details that describe a user.
     */
    Auth.prototype.signup = function (details) {
        return this.authModules.basic.signup(details);
    };
    /**
     * Attempt to log the user in with the given credentials. For custom & social
     * logins, kick-off the authentication process.
     *
     * After login, the full user is loaded from the cloud and saved in local
     * storage along with their auth token.
     *
     * @note TODO: Better error handling docs.
     *
     * @param moduleId
     *  The authentication provider module ID to use with this login.
     * @param credentials
     *  For email/password authentication, give an email and password. For social
     *  authentication, exclude this parameter. For custom authentication, send
     *  whatever you need.
     * @param options
     *  Options for this login, such as whether to remember the login and
     *  InAppBrowser window options for authentication providers that make use of
     *  it.
     */
    Auth.prototype.login = function (moduleId, credentials, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (typeof options.remember === 'undefined') {
            options.remember = true;
        }
        if (typeof options.inAppBrowserOptions === 'undefined') {
            options.inAppBrowserOptions = {};
        }
        if (typeof options.inAppBrowserOptions.location === 'undefined') {
            options.inAppBrowserOptions.location = false;
        }
        if (typeof options.inAppBrowserOptions.clearcache === 'undefined') {
            options.inAppBrowserOptions.clearcache = true;
        }
        if (typeof options.inAppBrowserOptions.clearsessioncache === 'undefined') {
            options.inAppBrowserOptions.clearsessioncache = true;
        }
        var context = this.authModules[moduleId];
        if (!context) {
            throw new Error('Authentication class is invalid or missing:' + context);
        }
        return context.authenticate(credentials, options).then(function (r) {
            _this.storeToken(options, r.token);
            return _this.userService.load().then(function () {
                var user = _this.userService.current();
                user.store();
                return r;
            });
        });
    };
    /**
     * Log the user out of the app.
     *
     * This clears the auth token out of local storage and restores the user to
     * an unauthenticated state.
     */
    Auth.prototype.logout = function () {
        this.tokenContext.delete();
        var user = this.userService.current();
        user.unstore();
        user.clear();
    };
    /**
     * Kick-off the password reset process. Only for email/password
     * authentication.
     *
     * An email will be sent to the user with a short password reset code, which
     * they can copy back into your app and use the [`confirmPasswordReset()`
     * method](#confirmPasswordReset).
     *
     * @param email - The email address to which to send a code.
     */
    Auth.prototype.requestPasswordReset = function (email) {
        this.storage.set('auth_password_reset_email', email);
        return this.authModules.basic.requestPasswordReset(email);
    };
    /**
     * Confirm a password reset.
     *
     * When the user gives you their password reset code into your app and their
     * requested changed password, call this method.
     *
     * @param code - The password reset code from the user.
     * @param newPassword - The requested changed password from the user.
     */
    Auth.prototype.confirmPasswordReset = function (code, newPassword) {
        var email = this.storage.get('auth_password_reset_email');
        return this.authModules.basic.confirmPasswordReset(email, code, newPassword);
    };
    /**
     * Get the raw auth token of the active user from local storage.
     */
    Auth.prototype.getToken = function () {
        return this.tokenContext.get();
    };
    /**
     * @hidden
     */
    Auth.prototype.storeToken = function (options, token) {
        if (options === void 0) { options = { 'remember': true }; }
        var originalToken = this.authToken;
        this.authToken = token;
        this.tokenContext.store(this.authToken, { 'permanent': options.remember });
        this.emitter.emit('auth:token-changed', { 'old': originalToken, 'new': this.authToken });
    };
    /**
     * @hidden
     */
    Auth.getDetailedErrorFromResponse = function (res) {
        var errors = [];
        var details = [];
        try {
            details = res.body.error.details;
        }
        catch (e) { }
        for (var i = 0; i < details.length; i++) {
            var detail = details[i];
            if (detail.error_type) {
                errors.push(detail.error_type + '_' + detail.parameter);
            }
        }
        return new errors_1.DetailedError('Error creating user', errors);
    };
    return Auth;
}());
exports.Auth = Auth;
/**
 * @hidden
 */
var AuthType = (function () {
    function AuthType(deps) {
        this.config = deps.config;
        this.client = deps.client;
    }
    AuthType.prototype.parseInAppBrowserOptions = function (opts) {
        if (!opts) {
            return '';
        }
        var p = [];
        for (var k in opts) {
            var v = void 0;
            if (typeof opts[k] === 'boolean') {
                v = opts[k] ? 'yes' : 'no';
            }
            else {
                v = opts[k];
            }
            p.push(k + "=" + v);
        }
        return p.join(',');
    };
    AuthType.prototype.inAppBrowserFlow = function (moduleId, data, options) {
        var _this = this;
        if (data === void 0) { data = {}; }
        var deferred = new promise_1.DeferredPromise();
        if (!window || !window.cordova || !window.cordova.InAppBrowser) {
            deferred.reject(new Error('InAppBrowser plugin missing'));
        }
        else {
            this.client.post("/auth/login/" + moduleId)
                .send({
                'app_id': this.config.get('app_id'),
                'callback': window.location.href,
                'data': data
            })
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    var w_1 = window.cordova.InAppBrowser.open(res.body.data.url, '_blank', _this.parseInAppBrowserOptions(options.inAppBrowserOptions));
                    var onExit_1 = function () {
                        deferred.reject(new Error('InAppBrowser exit'));
                    };
                    var onLoadError_1 = function () {
                        deferred.reject(new Error('InAppBrowser loaderror'));
                    };
                    var onLoadStart = function (data) {
                        if (data.url.slice(0, 20) === 'http://auth.ionic.io') {
                            var queryString = data.url.split('#')[0].split('?')[1];
                            var paramParts = queryString.split('&');
                            var params = {};
                            for (var i = 0; i < paramParts.length; i++) {
                                var part = paramParts[i].split('=');
                                params[part[0]] = part[1];
                            }
                            w_1.removeEventListener('exit', onExit_1);
                            w_1.removeEventListener('loaderror', onLoadError_1);
                            w_1.close();
                            deferred.resolve({
                                'token': params['token'],
                                'signup': Boolean(parseInt(params['signup'], 10))
                            });
                        }
                    };
                    w_1.addEventListener('exit', onExit_1);
                    w_1.addEventListener('loaderror', onLoadError_1);
                    w_1.addEventListener('loadstart', onLoadStart);
                }
            });
        }
        return deferred.promise;
    };
    return AuthType;
}());
exports.AuthType = AuthType;
/**
 * @hidden
 */
var BasicAuth = (function (_super) {
    __extends(BasicAuth, _super);
    function BasicAuth() {
        _super.apply(this, arguments);
    }
    BasicAuth.prototype.authenticate = function (data, options) {
        var deferred = new promise_1.DeferredPromise();
        if (!data.email || !data.password) {
            deferred.reject(new Error('email and password are required for basic authentication'));
        }
        else {
            this.client.post('/auth/login')
                .send({
                'app_id': this.config.get('app_id'),
                'email': data.email,
                'password': data.password
            })
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve({
                        'token': res.body.data.token
                    });
                }
            });
        }
        return deferred.promise;
    };
    BasicAuth.prototype.requestPasswordReset = function (email) {
        var deferred = new promise_1.DeferredPromise();
        if (!email) {
            deferred.reject(new Error('Email is required for password reset request.'));
        }
        else {
            this.client.post('/users/password/reset')
                .send({
                'app_id': this.config.get('app_id'),
                'email': email,
                'flow': 'app'
            })
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve();
                }
            });
        }
        return deferred.promise;
    };
    BasicAuth.prototype.confirmPasswordReset = function (email, code, newPassword) {
        var deferred = new promise_1.DeferredPromise();
        if (!code || !email || !newPassword) {
            deferred.reject(new Error('Code, new password, and email are required.'));
        }
        else {
            this.client.post('/users/password')
                .send({
                'reset_token': code,
                'new_password': newPassword,
                'email': email
            })
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve();
                }
            });
        }
        return deferred.promise;
    };
    BasicAuth.prototype.signup = function (data) {
        var deferred = new promise_1.DeferredPromise();
        var userData = {
            'app_id': this.config.get('app_id'),
            'email': data.email,
            'password': data.password
        };
        // optional details
        if (data.username) {
            userData.username = data.username;
        }
        if (data.image) {
            userData.image = data.image;
        }
        if (data.name) {
            userData.name = data.name;
        }
        if (data.custom) {
            userData.custom = data.custom;
        }
        this.client.post('/users')
            .send(userData)
            .end(function (err, res) {
            if (err) {
                deferred.reject(Auth.getDetailedErrorFromResponse(err.response));
            }
            else {
                deferred.resolve();
            }
        });
        return deferred.promise;
    };
    return BasicAuth;
}(AuthType));
exports.BasicAuth = BasicAuth;
/**
 * @hidden
 */
var CustomAuth = (function (_super) {
    __extends(CustomAuth, _super);
    function CustomAuth() {
        _super.apply(this, arguments);
    }
    CustomAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('custom', data, options);
    };
    return CustomAuth;
}(AuthType));
exports.CustomAuth = CustomAuth;
/**
 * @hidden
 */
var TwitterAuth = (function (_super) {
    __extends(TwitterAuth, _super);
    function TwitterAuth() {
        _super.apply(this, arguments);
    }
    TwitterAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('twitter', data, options);
    };
    return TwitterAuth;
}(AuthType));
exports.TwitterAuth = TwitterAuth;
/**
 * @hidden
 */
var FacebookAuth = (function (_super) {
    __extends(FacebookAuth, _super);
    function FacebookAuth() {
        _super.apply(this, arguments);
    }
    FacebookAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('facebook', data, options);
    };
    return FacebookAuth;
}(AuthType));
exports.FacebookAuth = FacebookAuth;
/**
 * @hidden
 */
var GithubAuth = (function (_super) {
    __extends(GithubAuth, _super);
    function GithubAuth() {
        _super.apply(this, arguments);
    }
    GithubAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('github', data, options);
    };
    return GithubAuth;
}(AuthType));
exports.GithubAuth = GithubAuth;
/**
 * @hidden
 */
var GoogleAuth = (function (_super) {
    __extends(GoogleAuth, _super);
    function GoogleAuth() {
        _super.apply(this, arguments);
    }
    GoogleAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('google', data, options);
    };
    return GoogleAuth;
}(AuthType));
exports.GoogleAuth = GoogleAuth;
/**
 * @hidden
 */
var InstagramAuth = (function (_super) {
    __extends(InstagramAuth, _super);
    function InstagramAuth() {
        _super.apply(this, arguments);
    }
    InstagramAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('instagram', data, options);
    };
    return InstagramAuth;
}(AuthType));
exports.InstagramAuth = InstagramAuth;
/**
 * @hidden
 */
var LinkedInAuth = (function (_super) {
    __extends(LinkedInAuth, _super);
    function LinkedInAuth() {
        _super.apply(this, arguments);
    }
    LinkedInAuth.prototype.authenticate = function (data, options) {
        if (data === void 0) { data = {}; }
        return this.inAppBrowserFlow('linkedin', data, options);
    };
    return LinkedInAuth;
}(AuthType));
exports.LinkedInAuth = LinkedInAuth;

},{"./errors":9,"./promise":14}],2:[function(require,module,exports){
"use strict";
var request = require('superagent');
/**
 * `Client` is for making HTTP requests to the API.
 *
 * Under the hood, it uses
 * [superagent](http://visionmedia.github.io/superagent/). When a method is
 * called, you can call any number of superagent functions on it and then call
 * `end()` to complete and send the request.
 *
 * @featured
 */
var Client = (function () {
    function Client(
        /**
         * @hidden
         */
        tokenContext, 
        /**
         * @hidden
         */
        baseUrl, req // TODO: use superagent types
        ) {
        this.tokenContext = tokenContext;
        this.baseUrl = baseUrl;
        if (typeof req === 'undefined') {
            req = request;
        }
        this.req = req;
    }
    /**
     * GET request for retrieving a resource from the API.
     *
     * @param endpoint - The path of the API endpoint.
     */
    Client.prototype.get = function (endpoint) {
        return this.supplement(this.req.get, endpoint);
    };
    /**
     * POST request for sending a new resource to the API.
     *
     * @param endpoint - The path of the API endpoint.
     */
    Client.prototype.post = function (endpoint) {
        return this.supplement(this.req.post, endpoint);
    };
    /**
     * PUT request for replacing a resource in the API.
     *
     * @param endpoint - The path of the API endpoint.
     */
    Client.prototype.put = function (endpoint) {
        return this.supplement(this.req.put, endpoint);
    };
    /**
     * PATCH request for performing partial updates to a resource in the API.
     *
     * @param endpoint - The path of the API endpoint.
     */
    Client.prototype.patch = function (endpoint) {
        return this.supplement(this.req.patch, endpoint);
    };
    /**
     * DELETE request for deleting a resource from the API.
     *
     * @param endpoint - The path of the API endpoint.
     */
    Client.prototype.delete = function (endpoint) {
        return this.supplement(this.req.delete, endpoint);
    };
    /**
     * @hidden
     */
    Client.prototype.request = function (method, endpoint) {
        return this.supplement(this.req.bind(this.req, method), endpoint);
    };
    /**
     * @private
     */
    Client.prototype.supplement = function (fn, endpoint) {
        if (endpoint.substring(0, 1) !== '/') {
            throw Error('endpoint must start with leading slash');
        }
        var req = fn(this.baseUrl + endpoint);
        var token = this.tokenContext.get();
        if (token) {
            req.set('Authorization', "Bearer " + token);
        }
        return req;
    };
    return Client;
}());
exports.Client = Client;

},{"superagent":22}],3:[function(require,module,exports){
"use strict";
/**
 * @hidden
 */
var Config = (function () {
    function Config() {
        /**
         * @private
         */
        this.urls = {
            'api': 'https://api.ionic.io',
            'web': 'https://web.ionic.io'
        };
    }
    /**
     * Register a new config.
     */
    Config.prototype.register = function (settings) {
        this.settings = settings;
    };
    /**
     * Get a value from the core settings. You should use `settings` attribute
     * directly for core settings and other settings.
     *
     * @deprecated
     *
     * @param name - The settings key to get.
     */
    Config.prototype.get = function (name) {
        if (!this.settings || !this.settings.core) {
            return undefined;
        }
        return this.settings.core[name];
    };
    /**
     * @hidden
     */
    Config.prototype.getURL = function (name) {
        var urls = (this.settings && this.settings.core && this.settings.core.urls) || {};
        if (urls[name]) {
            return urls[name];
        }
        return this.urls[name];
    };
    return Config;
}());
exports.Config = Config;

},{}],4:[function(require,module,exports){
"use strict";
/**
 * @hidden
 */
var Cordova = (function () {
    function Cordova(deps, options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.app = deps.appStatus;
        this.device = deps.device;
        this.emitter = deps.emitter;
        this.logger = deps.logger;
        this.registerEventHandlers();
    }
    Cordova.prototype.bootstrap = function () {
        var _this = this;
        var events = ['pause', 'resume'];
        document.addEventListener('deviceready', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            _this.emitter.emit('cordova:deviceready', { 'args': args });
            var _loop_1 = function(e) {
                document.addEventListener(e, function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    _this.emitter.emit('cordova:' + e, { 'args': args });
                }, false);
            };
            for (var _a = 0, events_1 = events; _a < events_1.length; _a++) {
                var e = events_1[_a];
                _loop_1(e);
            }
        }, false);
    };
    /**
     * @private
     */
    Cordova.prototype.registerEventHandlers = function () {
        var _this = this;
        this.emitter.on('cordova:pause', function () {
            _this.app.closed = true;
        });
        this.emitter.on('cordova:resume', function () {
            _this.app.closed = false;
        });
    };
    return Cordova;
}());
exports.Cordova = Cordova;

},{}],5:[function(require,module,exports){
"use strict";
/**
 * @hidden
 */
var Core = (function () {
    function Core(deps) {
        /**
         * @private
         */
        this._version = '0.9.0';
        this.config = deps.config;
        this.logger = deps.logger;
        this.emitter = deps.emitter;
        this.insights = deps.insights;
    }
    Core.prototype.init = function () {
        this.registerEventHandlers();
        this.onResume();
    };
    Object.defineProperty(Core.prototype, "version", {
        get: function () {
            return this._version;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @private
     */
    Core.prototype.onResume = function () {
        this.insights.track('mobileapp.opened');
    };
    /**
     * @private
     */
    Core.prototype.registerEventHandlers = function () {
        var _this = this;
        this.emitter.on('cordova:resume', function () {
            _this.onResume();
        });
        this.emitter.on('push:notification', function (data) {
            if (data.message.app.asleep || data.message.app.closed) {
                _this.insights.track('mobileapp.opened.push');
            }
        });
    };
    return Core;
}());
exports.Core = Core;

},{}],6:[function(require,module,exports){
"use strict";
var promise_1 = require('../promise');
var NO_PLUGIN = new Error('Missing deploy plugin: `ionic-plugin-deploy`');
/**
 * `Deploy` handles live deploys of the app. Downloading, extracting, and
 * rolling back snapshots.
 *
 * @featured
 */
var Deploy = (function () {
    function Deploy(deps, 
        /**
         * @hidden
         */
        options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.options = options;
        /**
         * The active deploy channel. Set this to change the channel on which
         * `Deploy` operates.
         */
        this.channel = 'production';
        this.config = deps.config;
        this.emitter = deps.emitter;
        this.logger = deps.logger;
        this.emitter.once('device:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.init(_this.config.get('app_id'), _this.config.getURL('api'));
            }
            _this.emitter.emit('deploy:ready');
        });
    }
    /**
     * Check for updates on the active channel.
     *
     * The promise resolves with a boolean. When `true`, a new snapshot exists on
     * the channel.
     */
    Deploy.prototype.check = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise();
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.check(_this.config.get('app_id'), _this.channel, function (result) {
                    if (result && result === 'true') {
                        _this.logger.info('Ionic Deploy: an update is available');
                        deferred.resolve(true);
                    }
                    else {
                        _this.logger.info('Ionic Deploy: no updates available');
                        deferred.resolve(false);
                    }
                }, function (error) {
                    _this.logger.error('Ionic Deploy: encountered an error while checking for updates');
                    deferred.reject(error);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * Download the available snapshot.
     *
     * This should be used in conjunction with
     * [`extract()`](/api/client/deploy/#extract).
     *
     * @param options
     *  Options for this download, such as a progress callback.
     */
    Deploy.prototype.download = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var deferred = new promise_1.DeferredPromise();
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.download(_this.config.get('app_id'), function (result) {
                    if (result === 'true') {
                        _this.logger.info('Ionic Deploy: download complete');
                        deferred.resolve();
                    }
                    else if (result === 'false') {
                        deferred.reject(new Error('Ionic Deploy: Download has failed: see native logs.'));
                    }
                    else {
                        if (options.onProgress) {
                            options.onProgress(result);
                        }
                    }
                }, function (error) {
                    deferred.reject(error);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * Extract the downloaded snapshot.
     *
     * This should be called after [`download()`](/api/client/deploy/#download)
     * successfully resolves.
     *
     * @param options
     */
    Deploy.prototype.extract = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var deferred = new promise_1.DeferredPromise();
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.extract(_this.config.get('app_id'), function (result) {
                    if (result === 'done') {
                        _this.logger.info('Ionic Deploy: extraction complete');
                        deferred.resolve();
                    }
                    else {
                        if (options.onProgress) {
                            options.onProgress(result);
                        }
                    }
                }, function (error) {
                    deferred.reject(error);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * Immediately reload the app with the latest deployed snapshot.
     *
     * This is only necessary to call if you have downloaded and extracted a
     * snapshot and wish to instantly reload the app with the latest deploy. The
     * latest deploy will automatically be loaded when the app is started.
     */
    Deploy.prototype.load = function () {
        var _this = this;
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.redirect(_this.config.get('app_id'));
            }
        });
    };
    /**
     * Get information about the current snapshot.
     *
     * The promise is resolved with an object that has key/value pairs pertaining
     * to the currently deployed snapshot.
     */
    Deploy.prototype.info = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise(); // TODO
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.info(_this.config.get('app_id'), function (result) {
                    deferred.resolve(result);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * List the snapshots that have been installed on this device.
     *
     * The promise is resolved with an array of snapshot UUIDs.
     */
    Deploy.prototype.getSnapshots = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise(); // TODO
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.getVersions(_this.config.get('app_id'), function (result) {
                    deferred.resolve(result);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * Remove a snapshot from this device.
     *
     * @param uuid
     *  The snapshot UUID to remove from the device.
     */
    Deploy.prototype.deleteSnapshot = function (uuid) {
        var _this = this;
        var deferred = new promise_1.DeferredPromise(); // TODO
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.deleteVersion(_this.config.get('app_id'), uuid, function (result) {
                    deferred.resolve(result);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * Fetches the metadata for a given snapshot. If no UUID is given, it will
     * attempt to grab the metadata for the most recently known snapshot.
     *
     * @param uuid
     *  The snapshot from which to grab metadata.
     */
    Deploy.prototype.getMetadata = function (uuid) {
        var _this = this;
        var deferred = new promise_1.DeferredPromise(); // TODO
        this.emitter.once('deploy:ready', function () {
            if (_this._getPlugin()) {
                _this.plugin.getMetadata(_this.config.get('app_id'), uuid, function (result) {
                    deferred.resolve(result.metadata);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.reject(NO_PLUGIN);
            }
        });
        return deferred.promise;
    };
    /**
     * @private
     */
    Deploy.prototype._getPlugin = function () {
        if (typeof window.IonicDeploy === 'undefined') {
            this.logger.warn('Ionic Deploy: Disabled! Deploy plugin is not installed or has not loaded. Have you run `ionic plugin add ionic-plugin-deploy` yet?');
            return;
        }
        if (!this.plugin) {
            this.plugin = window.IonicDeploy;
        }
        return this.plugin;
    };
    return Deploy;
}());
exports.Deploy = Deploy;

},{"../promise":14}],7:[function(require,module,exports){
"use strict";
/**
 * @hidden
 */
var Device = (function () {
    function Device(deps) {
        this.deps = deps;
        this.emitter = this.deps.emitter;
        this.deviceType = this.determineDeviceType();
        this.registerEventHandlers();
    }
    Device.prototype.isAndroid = function () {
        return this.deviceType === 'android';
    };
    Device.prototype.isIOS = function () {
        return this.deviceType === 'iphone' || this.deviceType === 'ipad';
    };
    Device.prototype.isConnectedToNetwork = function (options) {
        if (options === void 0) { options = {}; }
        if (typeof navigator.connection === 'undefined' ||
            typeof navigator.connection.type === 'undefined' ||
            typeof Connection === 'undefined') {
            if (!options.strictMode) {
                return true;
            }
            return false;
        }
        switch (navigator.connection.type) {
            case Connection.ETHERNET:
            case Connection.WIFI:
            case Connection.CELL_2G:
            case Connection.CELL_3G:
            case Connection.CELL_4G:
            case Connection.CELL:
                return true;
            default:
                return false;
        }
    };
    /**
     * @private
     */
    Device.prototype.registerEventHandlers = function () {
        var _this = this;
        if (this.deviceType === 'unknown') {
            this.emitter.emit('device:ready');
        }
        else {
            this.emitter.once('cordova:deviceready', function () {
                _this.emitter.emit('device:ready');
            });
        }
    };
    /**
     * @private
     */
    Device.prototype.determineDeviceType = function () {
        var agent = navigator.userAgent;
        var ipad = agent.match(/iPad/i);
        if (ipad && (ipad[0].toLowerCase() === 'ipad')) {
            return 'ipad';
        }
        var iphone = agent.match(/iPhone/i);
        if (iphone && (iphone[0].toLowerCase() === 'iphone')) {
            return 'iphone';
        }
        var android = agent.match(/Android/i);
        if (android && (android[0].toLowerCase() === 'android')) {
            return 'android';
        }
        return 'unknown';
    };
    return Device;
}());
exports.Device = Device;

},{}],8:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var auth_1 = require('./auth');
var client_1 = require('./client');
var config_1 = require('./config');
var cordova_1 = require('./cordova');
var core_1 = require('./core');
var deploy_1 = require('./deploy/deploy');
var device_1 = require('./device');
var events_1 = require('./events');
var insights_1 = require('./insights');
var logger_1 = require('./logger');
var push_1 = require('./push/push');
var storage_1 = require('./storage');
var user_1 = require('./user/user');
var modules = {};
function cache(target, propertyKey, descriptor) {
    var method = descriptor.get;
    descriptor.get = function () {
        if (typeof modules[propertyKey] === 'undefined') {
            var value = method.apply(this, arguments);
            modules[propertyKey] = value;
        }
        return modules[propertyKey];
    };
    descriptor.set = function (value) { };
}
/**
 * @hidden
 */
var Container = (function () {
    function Container() {
    }
    Object.defineProperty(Container.prototype, "appStatus", {
        get: function () {
            return { 'asleep': false, 'closed': false };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "config", {
        get: function () {
            return new config_1.Config();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "eventEmitter", {
        get: function () {
            return new events_1.EventEmitter();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "logger", {
        get: function () {
            var config = this.config;
            var c = {};
            if (typeof config.settings !== 'undefined') {
                c = config.settings.logger;
            }
            return new logger_1.Logger(c);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "localStorageStrategy", {
        get: function () {
            return new storage_1.LocalStorageStrategy();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "sessionStorageStrategy", {
        get: function () {
            return new storage_1.SessionStorageStrategy();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "authTokenContext", {
        get: function () {
            var label = 'auth_' + this.config.get('app_id');
            return new auth_1.CombinedAuthTokenContext({
                'storage': new storage_1.Storage({ 'strategy': this.localStorageStrategy }),
                'tempStorage': new storage_1.Storage({ 'strategy': this.sessionStorageStrategy })
            }, label);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "client", {
        get: function () {
            return new client_1.Client(this.authTokenContext, this.config.getURL('api'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "insights", {
        get: function () {
            return new insights_1.Insights({
                'appStatus': this.appStatus,
                'storage': new storage_1.Storage({ 'strategy': this.localStorageStrategy }),
                'config': this.config,
                'client': this.client,
                'logger': this.logger
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "core", {
        get: function () {
            return new core_1.Core({
                'config': this.config,
                'logger': this.logger,
                'emitter': this.eventEmitter,
                'insights': this.insights
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "device", {
        get: function () {
            return new device_1.Device({ 'emitter': this.eventEmitter });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "cordova", {
        get: function () {
            return new cordova_1.Cordova({
                'appStatus': this.appStatus,
                'device': this.device,
                'emitter': this.eventEmitter,
                'logger': this.logger
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "userContext", {
        get: function () {
            return new user_1.UserContext({ 'storage': new storage_1.Storage({ 'strategy': this.localStorageStrategy }), 'config': this.config });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "singleUserService", {
        get: function () {
            return new user_1.SingleUserService({ 'client': this.client, 'context': this.userContext });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "authModules", {
        get: function () {
            return {
                'basic': new auth_1.BasicAuth({ 'config': this.config, 'client': this.client }),
                'custom': new auth_1.CustomAuth({ 'config': this.config, 'client': this.client }),
                'twitter': new auth_1.TwitterAuth({ 'config': this.config, 'client': this.client }),
                'facebook': new auth_1.FacebookAuth({ 'config': this.config, 'client': this.client }),
                'github': new auth_1.GithubAuth({ 'config': this.config, 'client': this.client }),
                'google': new auth_1.GoogleAuth({ 'config': this.config, 'client': this.client }),
                'instagram': new auth_1.InstagramAuth({ 'config': this.config, 'client': this.client }),
                'linkedin': new auth_1.LinkedInAuth({ 'config': this.config, 'client': this.client })
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "auth", {
        get: function () {
            return new auth_1.Auth({
                'config': this.config,
                'emitter': this.eventEmitter,
                'authModules': this.authModules,
                'tokenContext': this.authTokenContext,
                'userService': this.singleUserService,
                'storage': new storage_1.Storage({ 'strategy': this.localStorageStrategy })
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "push", {
        get: function () {
            var config = this.config;
            var c = {};
            if (typeof config.settings !== 'undefined') {
                c = config.settings.push;
            }
            return new push_1.Push({
                'config': config,
                'auth': this.auth,
                'userService': this.singleUserService,
                'device': this.device,
                'client': this.client,
                'emitter': this.eventEmitter,
                'storage': new storage_1.Storage({ 'strategy': this.localStorageStrategy }),
                'logger': this.logger
            }, c);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "deploy", {
        get: function () {
            return new deploy_1.Deploy({
                'config': this.config,
                'emitter': this.eventEmitter,
                'logger': this.logger
            });
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "appStatus", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "config", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "eventEmitter", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "logger", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "localStorageStrategy", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "sessionStorageStrategy", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "authTokenContext", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "client", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "insights", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "core", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "device", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "cordova", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "userContext", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "singleUserService", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "authModules", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "auth", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "push", null);
    __decorate([
        cache, 
        __metadata('design:type', Object)
    ], Container.prototype, "deploy", null);
    return Container;
}());
exports.Container = Container;

},{"./auth":1,"./client":2,"./config":3,"./cordova":4,"./core":5,"./deploy/deploy":6,"./device":7,"./events":10,"./insights":12,"./logger":13,"./push/push":16,"./storage":17,"./user/user":19}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
"use strict";
/**
 * A registered event receiver.
 */
var EventReceiver = (function () {
    function EventReceiver(
        /**
         * An registered identifier for this event receiver.
         */
        key, 
        /**
         * The registered name of the event.
         */
        event, 
        /**
         * The actual callback.
         */
        handler) {
        this.key = key;
        this.event = event;
        this.handler = handler;
    }
    return EventReceiver;
}());
exports.EventReceiver = EventReceiver;
/**
 * Stores callbacks for registered events.
 */
var EventEmitter = (function () {
    function EventEmitter() {
        /**
         * @private
         */
        this.n = 0;
        /**
         * @private
         */
        this.eventReceivers = {};
        /**
         * @private
         */
        this.eventsEmitted = {};
    }
    /**
     * Register an event callback which gets triggered every time the event is
     * fired.
     *
     * @param event
     *  The event name.
     * @param callback
     *  A callback to attach to this event.
     */
    EventEmitter.prototype.on = function (event, callback) {
        if (typeof this.eventReceivers[event] === 'undefined') {
            this.eventReceivers[event] = {};
        }
        var receiver = new EventReceiver(this.n, event, callback);
        this.n++;
        this.eventReceivers[event][receiver.key] = receiver;
        return receiver;
    };
    /**
     * Unregister an event receiver returned from
     * [`on()`](/api/client/eventemitter#on).
     *
     * @param receiver
     *  The event receiver.
     */
    EventEmitter.prototype.off = function (receiver) {
        if (typeof this.eventReceivers[receiver.event] === 'undefined' ||
            typeof this.eventReceivers[receiver.event][receiver.key] === 'undefined') {
            throw new Error('unknown event receiver');
        }
        delete this.eventReceivers[receiver.event][receiver.key];
    };
    /**
     * Register an event callback that gets triggered only once. If the event was
     * triggered before your callback is registered, it calls your callback
     * immediately.
     *
     * @note TODO: Fix the docs for () => void syntax.
     *
     * @param event
     *  The event name.
     * @param callback
     *  A callback to attach to this event. It takes no arguments.
     */
    EventEmitter.prototype.once = function (event, callback) {
        var _this = this;
        if (this.emitted(event)) {
            callback();
        }
        else {
            this.on(event, function () {
                if (!_this.emitted(event)) {
                    callback();
                }
            });
        }
    };
    /**
     * Trigger an event. Call all callbacks in the order they were registered.
     *
     * @param event
     *  The event name.
     * @param data
     *  An object to pass to every callback.
     */
    EventEmitter.prototype.emit = function (event, data) {
        if (data === void 0) { data = null; }
        if (typeof this.eventReceivers[event] === 'undefined') {
            this.eventReceivers[event] = {};
        }
        if (typeof this.eventsEmitted[event] === 'undefined') {
            this.eventsEmitted[event] = 0;
        }
        for (var k in this.eventReceivers[event]) {
            this.eventReceivers[event][k].handler(data);
        }
        this.eventsEmitted[event] += 1;
    };
    /**
     * Return a count of the number of times an event has been triggered.
     *
     * @param event
     *  The event name.
     */
    EventEmitter.prototype.emitted = function (event) {
        if (typeof this.eventsEmitted[event] === 'undefined') {
            return 0;
        }
        return this.eventsEmitted[event];
    };
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;

},{}],11:[function(require,module,exports){
"use strict";
var auth_1 = require('./auth');
exports.Auth = auth_1.Auth;
exports.AuthType = auth_1.AuthType;
exports.BasicAuth = auth_1.BasicAuth;
exports.CustomAuth = auth_1.CustomAuth;
exports.FacebookAuth = auth_1.FacebookAuth;
exports.GithubAuth = auth_1.GithubAuth;
exports.GoogleAuth = auth_1.GoogleAuth;
exports.InstagramAuth = auth_1.InstagramAuth;
exports.LinkedInAuth = auth_1.LinkedInAuth;
exports.TwitterAuth = auth_1.TwitterAuth;
var client_1 = require('./client');
exports.Client = client_1.Client;
var config_1 = require('./config');
exports.Config = config_1.Config;
var cordova_1 = require('./cordova');
exports.Cordova = cordova_1.Cordova;
var core_1 = require('./core');
exports.Core = core_1.Core;
var deploy_1 = require('./deploy/deploy');
exports.Deploy = deploy_1.Deploy;
var device_1 = require('./device');
exports.Device = device_1.Device;
var errors_1 = require('./errors');
exports.Exception = errors_1.Exception;
exports.DetailedError = errors_1.DetailedError;
var di_1 = require('./di');
exports.DIContainer = di_1.Container;
var events_1 = require('./events');
exports.EventEmitter = events_1.EventEmitter;
var insights_1 = require('./insights');
exports.Insights = insights_1.Insights;
var logger_1 = require('./logger');
exports.Logger = logger_1.Logger;
var push_1 = require('./push/push');
exports.Push = push_1.Push;
var message_1 = require('./push/message');
exports.PushMessage = message_1.PushMessage;
var storage_1 = require('./storage');
exports.Storage = storage_1.Storage;
exports.LocalStorageStrategy = storage_1.LocalStorageStrategy;
exports.SessionStorageStrategy = storage_1.SessionStorageStrategy;
var user_1 = require('./user/user');
exports.UserContext = user_1.UserContext;
exports.User = user_1.User;
exports.SingleUserService = user_1.SingleUserService;

},{"./auth":1,"./client":2,"./config":3,"./cordova":4,"./core":5,"./deploy/deploy":6,"./device":7,"./di":8,"./errors":9,"./events":10,"./insights":12,"./logger":13,"./push/message":15,"./push/push":16,"./storage":17,"./user/user":19}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
"use strict";
/**
 * Simple console logger.
 */
var Logger = (function () {
    function Logger(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        /**
         * The function to use to log info level messages.
         */
        this.infofn = console.log.bind(console);
        /**
         * The function to use to log warn level messages.
         */
        this.warnfn = console.warn.bind(console);
        /**
         * The function to use to log error level messages.
         */
        this.errorfn = console.error.bind(console);
    }
    /**
     * Send a log at info level.
     *
     * @note TODO: Fix optionalParams in docs.
     *
     * @param message - The message to log.
     */
    Logger.prototype.info = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (!this.options.silent) {
            this.infofn.apply(this, [message].concat(optionalParams));
        }
    };
    /**
     * Send a log at warn level.
     *
     * @note TODO: Fix optionalParams in docs.
     *
     * @param message - The message to log.
     */
    Logger.prototype.warn = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (!this.options.silent) {
            this.warnfn.apply(this, [message].concat(optionalParams));
        }
    };
    /**
     * Send a log at error level.
     *
     * @note TODO: Fix optionalParams in docs.
     *
     * @param message - The message to log.
     */
    Logger.prototype.error = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        this.errorfn.apply(this, [message].concat(optionalParams));
    };
    return Logger;
}());
exports.Logger = Logger;

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
"use strict";
/**
 * Represents a push notification sent to the device.
 *
 * @featured
 */
var PushMessage = (function () {
    function PushMessage() {
    }
    /**
     * Create a PushMessage from the push plugin's format.
     *
     * @hidden
     *
     * @param data - The plugin's notification object.
     */
    PushMessage.fromPluginData = function (data) {
        var message = new PushMessage();
        message.raw = data;
        message.text = data.message;
        message.title = data.title;
        message.count = data.count;
        message.sound = data.sound;
        message.image = data.image;
        message.app = {
            'asleep': !data.additionalData.foreground,
            'closed': data.additionalData.coldstart
        };
        message.payload = data.additionalData['payload'];
        return message;
    };
    PushMessage.prototype.toString = function () {
        return "<PushMessage [\"" + this.title + "\"]>";
    };
    return PushMessage;
}());
exports.PushMessage = PushMessage;

},{}],16:[function(require,module,exports){
"use strict";
var promise_1 = require('../promise');
var message_1 = require('./message');
/**
 * `Push` handles push notifications for this app.
 *
 * @featured
 */
var Push = (function () {
    function Push(deps, options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        /**
         * @private
         */
        this.blockRegistration = false;
        /**
         * @private
         */
        this.blockUnregister = false;
        /**
         * @private
         */
        this.blockSaveToken = false;
        /**
         * @private
         */
        this.registered = false;
        this.config = deps.config;
        this.auth = deps.auth;
        this.userService = deps.userService;
        this.device = deps.device;
        this.client = deps.client;
        this.emitter = deps.emitter;
        this.storage = deps.storage;
        this.logger = deps.logger;
        // Check for the required values to use this service
        if (this.device.isAndroid() && !this.options.sender_id) {
            this.logger.error('Ionic Push: GCM project number not found (http://docs.ionic.io/docs/push-android-setup)');
            return;
        }
        if (!options.pluginConfig) {
            options.pluginConfig = {};
        }
        if (this.device.isAndroid()) {
            // inject gcm key for PushPlugin
            if (!options.pluginConfig.android) {
                options.pluginConfig.android = {};
            }
            if (!options.pluginConfig.android.senderID) {
                options.pluginConfig.android.senderID = this.options.sender_id;
            }
        }
        this.options = options;
    }
    Object.defineProperty(Push.prototype, "token", {
        get: function () {
            if (!this._token) {
                this._token = this.storage.get('push_token');
            }
            return this._token;
        },
        set: function (val) {
            if (!val) {
                this.storage.delete('push_token');
            }
            else {
                this.storage.set('push_token', val);
            }
            this._token = val;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Register a token with the API.
     *
     * When a token is saved, you can send push notifications to it. If a user is
     * logged in, the token is linked to them by their ID.
     *
     * @param token - The token.
     * @param options
     */
    Push.prototype.saveToken = function (token, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var deferred = new promise_1.DeferredPromise();
        var tokenData = {
            'token': token.token,
            'app_id': this.config.get('app_id')
        };
        if (!options.ignore_user) {
            var user = this.userService.current();
            if (this.auth.isAuthenticated()) {
                tokenData.user_id = user.id;
            }
        }
        if (!this.blockSaveToken) {
            this.client.post('/push/tokens')
                .send(tokenData)
                .end(function (err, res) {
                if (err) {
                    _this.blockSaveToken = false;
                    _this.logger.error('Ionic Push:', err);
                    deferred.reject(err);
                }
                else {
                    _this.blockSaveToken = false;
                    _this.logger.info('Ionic Push: saved push token: ' + token.token);
                    if (tokenData.user_id) {
                        _this.logger.info('Ionic Push: added push token to user: ' + tokenData.user_id);
                    }
                    token.id = res.body.data.id;
                    token.type = res.body.data.type;
                    token.saved = true;
                    deferred.resolve(token);
                }
            });
        }
        else {
            deferred.reject(new Error('A token save operation is already in progress.'));
        }
        return deferred.promise;
    };
    /**
     * Registers the device with GCM/APNS to get a push token.
     *
     * After a device is registered, you will likely want to save the token with
     * [`saveToken()`](/api/client/push/#saveToken) to the API.
     */
    Push.prototype.register = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise();
        if (this.blockRegistration) {
            deferred.reject(new Error('Another registration is already in progress.'));
        }
        else {
            this.blockRegistration = true;
            this.emitter.once('device:ready', function () {
                var pushPlugin = _this._getPushPlugin();
                if (pushPlugin) {
                    _this.plugin = pushPlugin.init(_this.options.pluginConfig);
                    _this.plugin.on('registration', function (data) {
                        _this.blockRegistration = false;
                        _this.token = { 'token': data.registrationId };
                        _this.token.registered = true;
                        deferred.resolve(_this.token);
                    });
                    _this._callbackRegistration();
                    _this.registered = true;
                }
                else {
                    deferred.reject(new Error('Push plugin not found! See logs.'));
                }
            });
        }
        return deferred.promise;
    };
    /**
     * Invalidate the current push token.
     */
    Push.prototype.unregister = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise();
        if (!this.blockUnregister) {
            var pushToken_1 = this.token;
            if (!pushToken_1) {
                deferred.resolve();
            }
            else {
                var tokenData = {
                    'token': pushToken_1.token,
                    'app_id': this.config.get('app_id')
                };
                if (this.plugin) {
                    this.plugin.unregister(function () { }, function () { });
                }
                this.client.post('/push/tokens/invalidate')
                    .send(tokenData)
                    .end(function (err, res) {
                    _this.blockUnregister = false;
                    if (err) {
                        _this.logger.error('Ionic Push:', err);
                        deferred.reject(err);
                    }
                    else {
                        _this.logger.info('Ionic Push: unregistered push token: ' + pushToken_1.token);
                        _this.token = null;
                        deferred.resolve();
                    }
                });
            }
        }
        else {
            deferred.reject(new Error('An unregister operation is already in progress.'));
        }
        this.blockUnregister = true;
        return deferred.promise;
    };
    /**
     * @private
     */
    Push.prototype._callbackRegistration = function () {
        var _this = this;
        this.plugin.on('registration', function (data) {
            _this.token = { 'token': data.registrationId };
            if (_this.options.debug) {
                _this.logger.info('Ionic Push (debug): device token registered: ' + _this.token);
            }
            _this.emitter.emit('push:register', _this.token);
        });
        this.plugin.on('notification', function (data) {
            var message = message_1.PushMessage.fromPluginData(data);
            if (_this.options.debug) {
                _this.logger.info('Ionic Push (debug): notification received: ' + message);
            }
            _this.emitter.emit('push:notification', { 'message': message, 'raw': data });
        });
        this.plugin.on('error', function (e) {
            if (_this.options.debug) {
                _this.logger.error('Ionic Push (debug): unexpected error occured.');
                _this.logger.error('Ionic Push:', e);
            }
            _this.emitter.emit('push:error', { 'err': e });
        });
    };
    /**
     * @private
     */
    Push.prototype._getPushPlugin = function () {
        var plugin = window.PushNotification;
        if (!plugin) {
            if (this.device.isIOS() || this.device.isAndroid()) {
                this.logger.error('Ionic Push: PushNotification plugin is required. Have you run `ionic plugin add phonegap-plugin-push` ?');
            }
            else {
                this.logger.warn('Ionic Push: Disabled! Native push notifications will not work in a browser. Run your app on an actual device to use push.');
            }
        }
        return plugin;
    };
    return Push;
}());
exports.Push = Push;

},{"../promise":14,"./message":15}],17:[function(require,module,exports){
"use strict";
/**
 * @hidden
 */
var LocalStorageStrategy = (function () {
    function LocalStorageStrategy() {
    }
    LocalStorageStrategy.prototype.get = function (key) {
        return localStorage.getItem(key);
    };
    LocalStorageStrategy.prototype.set = function (key, value) {
        return localStorage.setItem(key, value);
    };
    LocalStorageStrategy.prototype.delete = function (key) {
        return localStorage.removeItem(key);
    };
    return LocalStorageStrategy;
}());
exports.LocalStorageStrategy = LocalStorageStrategy;
/**
 * @hidden
 */
var SessionStorageStrategy = (function () {
    function SessionStorageStrategy() {
    }
    SessionStorageStrategy.prototype.get = function (key) {
        return sessionStorage.getItem(key);
    };
    SessionStorageStrategy.prototype.set = function (key, value) {
        return sessionStorage.setItem(key, value);
    };
    SessionStorageStrategy.prototype.delete = function (key) {
        return sessionStorage.removeItem(key);
    };
    return SessionStorageStrategy;
}());
exports.SessionStorageStrategy = SessionStorageStrategy;
/**
 * A generic local/session storage abstraction.
 */
var Storage = (function () {
    function Storage(deps, options) {
        if (options === void 0) { options = { 'prefix': 'ionic', 'cache': true }; }
        this.options = options;
        this.strategy = deps.strategy;
        this.storageCache = {};
    }
    /**
     * Set a value in the storage by the given key.
     *
     * @param key - The storage key to set.
     * @param value - The value to set. (Must be JSON-serializable).
     */
    Storage.prototype.set = function (key, value) {
        key = this.standardizeKey(key);
        var json = JSON.stringify(value);
        this.strategy.set(key, json);
        if (this.options.cache) {
            this.storageCache[key] = value;
        }
    };
    /**
     * Delete a value from the storage by the given key.
     *
     * @param key - The storage key to delete.
     */
    Storage.prototype.delete = function (key) {
        key = this.standardizeKey(key);
        this.strategy.delete(key);
        if (this.options.cache) {
            delete this.storageCache[key];
        }
    };
    /**
     * Get a value from the storage by the given key.
     *
     * @param key - The storage key to get.
     */
    Storage.prototype.get = function (key) {
        key = this.standardizeKey(key);
        if (this.options.cache) {
            var cached = this.storageCache[key];
            if (cached) {
                return cached;
            }
        }
        var json = this.strategy.get(key);
        if (!json) {
            return null;
        }
        try {
            var value = JSON.parse(json);
            if (this.options.cache) {
                this.storageCache[key] = value;
            }
            return value;
        }
        catch (err) {
            return null;
        }
    };
    /**
     * @private
     */
    Storage.prototype.standardizeKey = function (key) {
        return this.options.prefix + "_" + key;
    };
    return Storage;
}());
exports.Storage = Storage;

},{}],18:[function(require,module,exports){
"use strict";
var dataTypeMapping = {};
var DataTypeSchema = (function () {
    function DataTypeSchema(properties) {
        this.data = {};
        this.setProperties(properties);
    }
    DataTypeSchema.prototype.setProperties = function (properties) {
        if (properties instanceof Object) {
            for (var x in properties) {
                this.data[x] = properties[x];
            }
        }
    };
    DataTypeSchema.prototype.toJSON = function () {
        var data = this.data;
        return {
            '__Ionic_DataTypeSchema': data.name,
            'value': data.value
        };
    };
    DataTypeSchema.prototype.isValid = function () {
        if (this.data.name && this.data.value) {
            return true;
        }
        return false;
    };
    return DataTypeSchema;
}());
exports.DataTypeSchema = DataTypeSchema;
var DataType = (function () {
    function DataType() {
    }
    DataType.get = function (name, value) {
        if (dataTypeMapping[name]) {
            return new dataTypeMapping[name](value);
        }
        return false;
    };
    DataType.getMapping = function () {
        return dataTypeMapping;
    };
    Object.defineProperty(DataType, "Schema", {
        get: function () {
            return DataTypeSchema;
        },
        enumerable: true,
        configurable: true
    });
    DataType.register = function (name, cls) {
        dataTypeMapping[name] = cls;
    };
    return DataType;
}());
exports.DataType = DataType;
var UniqueArray = (function () {
    function UniqueArray(value) {
        this.data = [];
        if (value instanceof Array) {
            for (var x in value) {
                this.push(value[x]);
            }
        }
    }
    UniqueArray.prototype.toJSON = function () {
        var data = this.data;
        var schema = new DataTypeSchema({ 'name': 'UniqueArray', 'value': data });
        return schema.toJSON();
    };
    UniqueArray.fromStorage = function (value) {
        return new UniqueArray(value);
    };
    UniqueArray.prototype.push = function (value) {
        if (this.data.indexOf(value) === -1) {
            this.data.push(value);
        }
    };
    UniqueArray.prototype.pull = function (value) {
        var index = this.data.indexOf(value);
        this.data.splice(index, 1);
    };
    return UniqueArray;
}());
exports.UniqueArray = UniqueArray;
DataType.register('UniqueArray', UniqueArray);

},{}],19:[function(require,module,exports){
"use strict";
var promise_1 = require('../promise');
var data_types_1 = require('./data-types');
/**
 * @hidden
 */
var UserContext = (function () {
    function UserContext(deps) {
        this.config = deps.config;
        this.storage = deps.storage;
    }
    Object.defineProperty(UserContext.prototype, "label", {
        get: function () {
            return 'user_' + this.config.get('app_id');
        },
        enumerable: true,
        configurable: true
    });
    UserContext.prototype.unstore = function () {
        this.storage.delete(this.label);
    };
    UserContext.prototype.store = function (user) {
        this.storage.set(this.label, user.serializeForStorage());
    };
    UserContext.prototype.load = function (user) {
        var data = this.storage.get(this.label);
        if (data) {
            user.id = data.id;
            user.data = new UserData(data.data);
            user.details = data.details || {};
            user.social = data.social || {};
            user.fresh = data.fresh;
            return user;
        }
        return;
    };
    return UserContext;
}());
exports.UserContext = UserContext;
/**
 * @hidden
 */
var UserData = (function () {
    function UserData(data) {
        if (data === void 0) { data = {}; }
        this.data = {};
        if ((typeof data === 'object')) {
            this.data = data;
            this.deserializeDataTypes();
        }
    }
    UserData.prototype.get = function (key, defaultValue) {
        if (this.data.hasOwnProperty(key)) {
            return this.data[key];
        }
        else {
            if (defaultValue === 0 || defaultValue === false) {
                return defaultValue;
            }
            return defaultValue || null;
        }
    };
    UserData.prototype.set = function (key, value) {
        this.data[key] = value;
    };
    UserData.prototype.unset = function (key) {
        delete this.data[key];
    };
    /**
     * @private
     */
    UserData.prototype.deserializeDataTypes = function () {
        if (this.data) {
            for (var x in this.data) {
                // if we have an object, let's check for custom data types
                if (this.data[x] && typeof this.data[x] === 'object') {
                    // do we have a custom type?
                    if (this.data[x].__Ionic_DataTypeSchema) {
                        var name = this.data[x].__Ionic_DataTypeSchema;
                        var mapping = data_types_1.DataType.getMapping();
                        if (mapping[name]) {
                            // we have a custom type and a registered class, give the custom data type
                            // from storage
                            this.data[x] = mapping[name].fromStorage(this.data[x].value);
                        }
                    }
                }
            }
        }
    };
    return UserData;
}());
exports.UserData = UserData;
/**
 * Represents a user of the app.
 *
 * @featured
 */
var User = (function () {
    function User(deps) {
        /**
         * The details (email, password, etc) of this user.
         */
        this.details = {};
        /**
         * The social details of this user.
         */
        this.social = {};
        this.service = deps.service;
        this.fresh = true;
        this._unset = {};
        this.data = new UserData();
    }
    /**
     * Check whether this user is anonymous or not.
     *
     * If the `id` property is set, the user is no longer anonymous.
     */
    User.prototype.isAnonymous = function () {
        if (!this.id) {
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * Get a value from this user's custom data.
     *
     * Optionally, a default value can be provided.
     *
     * @param key - The data key to get.
     * @param defaultValue - The value to return if the key is absent.
     */
    User.prototype.get = function (key, defaultValue) {
        return this.data.get(key, defaultValue);
    };
    /**
     * Set a value in this user's custom data.
     *
     * @param key - The data key to set.
     * @param value - The value to set.
     */
    User.prototype.set = function (key, value) {
        delete this._unset[key];
        return this.data.set(key, value);
    };
    /**
     * Delete a value from this user's custom data.
     *
     * @param key - The data key to delete.
     */
    User.prototype.unset = function (key) {
        this._unset[key] = true;
        return this.data.unset(key);
    };
    /**
     * Revert this user to a fresh, anonymous state.
     */
    User.prototype.clear = function () {
        this.id = null;
        this.data = new UserData();
        this.details = {};
        this.fresh = true;
    };
    /**
     * Save this user to the API.
     */
    User.prototype.save = function () {
        this._unset = {};
        return this.service.save();
    };
    /**
     * Delete this user from the API.
     */
    User.prototype.delete = function () {
        return this.service.delete();
    };
    /**
     * Load the user from the API, overwriting the local user's data.
     *
     * @param id - The user ID to load into this user.
     */
    User.prototype.load = function (id) {
        return this.service.load(id);
    };
    /**
     * Store this user in local storage.
     */
    User.prototype.store = function () {
        this.service.store();
    };
    /**
     * Remove this user from local storage.
     */
    User.prototype.unstore = function () {
        this.service.unstore();
    };
    /**
     * @hidden
     */
    User.prototype.serializeForAPI = function () {
        return {
            'email': this.details.email,
            'password': this.details.password,
            'username': this.details.username,
            'image': this.details.image,
            'name': this.details.name,
            'custom': this.data.data
        };
    };
    /**
     * @hidden
     */
    User.prototype.serializeForStorage = function () {
        return {
            'id': this.id,
            'data': this.data.data,
            'details': this.details,
            'fresh': this.fresh,
            'social': this.social
        };
    };
    User.prototype.toString = function () {
        return "<User [" + (this.isAnonymous() ? 'anonymous' : this.id) + "]>";
    };
    return User;
}());
exports.User = User;
/**
 * @hidden
 */
var SingleUserService = (function () {
    function SingleUserService(deps, config) {
        if (config === void 0) { config = {}; }
        this.config = config;
        this.client = deps.client;
        this.context = deps.context;
    }
    SingleUserService.prototype.current = function () {
        if (!this.user) {
            this.user = this.context.load(new User({ 'service': this }));
        }
        if (!this.user) {
            this.user = new User({ 'service': this });
        }
        return this.user;
    };
    SingleUserService.prototype.store = function () {
        this.context.store(this.current());
    };
    SingleUserService.prototype.unstore = function () {
        this.context.unstore();
    };
    SingleUserService.prototype.load = function (id) {
        if (id === void 0) { id = 'self'; }
        var deferred = new promise_1.DeferredPromise();
        var user = this.current();
        this.client.get("/users/" + id)
            .end(function (err, res) {
            if (err) {
                deferred.reject(err);
            }
            else {
                user.id = res.body.data.uuid;
                user.data = new UserData(res.body.data.custom);
                user.details = res.body.data.details;
                user.fresh = false;
                user.social = res.body.data.social;
                deferred.resolve();
            }
        });
        return deferred.promise;
    };
    SingleUserService.prototype.delete = function () {
        var deferred = new promise_1.DeferredPromise();
        if (this.user.isAnonymous()) {
            deferred.reject(new Error('User is anonymous and cannot be deleted from the API.'));
        }
        else {
            this.unstore();
            this.client.delete("/users/" + this.user.id)
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve();
                }
            });
        }
        return deferred.promise;
    };
    SingleUserService.prototype.save = function () {
        var _this = this;
        var deferred = new promise_1.DeferredPromise();
        this.store();
        if (this.user.isAnonymous()) {
            deferred.reject(new Error('User is anonymous and cannot be updated in the API. Use load(<id>) or signup a user using auth.'));
        }
        else {
            this.client.patch("/users/" + this.user.id)
                .send(this.user.serializeForAPI())
                .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    _this.user.fresh = false;
                    deferred.resolve();
                }
            });
        }
        return deferred.promise;
    };
    return SingleUserService;
}());
exports.SingleUserService = SingleUserService;

},{"../promise":14,"./data-types":18}],20:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],21:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],22:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');
var requestBase = require('./request-base');
var isObject = require('./is-object');

/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  root = this;
}

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Expose `request`.
 */

var request = module.exports = require('./request').bind(null, Request);

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pushEncodedKeyValuePair(pairs, key, obj[key]);
        }
      }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
  if (Array.isArray(val)) {
    return val.forEach(function(v) {
      pushEncodedKeyValuePair(pairs, key, v);
    });
  }
  pairs.push(encodeURIComponent(key)
    + '=' + encodeURIComponent(val));
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  return /[\/+]json\b/.test(mime);
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  if (!parse && isJSON(this.type)) {
    parse = request.parse['application/json'];
  }
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case
  this._header = {}; // coerces header names to lowercase
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      err.rawResponse = self.xhr && self.xhr.responseText ? self.xhr.responseText : null;
      // issue #876: return the http status code if the response parsing fails
      err.statusCode = self.xhr && self.xhr.status ? self.xhr.status : null;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(new_err, res);
  });
}

/**
 * Mixin `Emitter` and `requestBase`.
 */

Emitter(Request.prototype);
for (var key in requestBase) {
  Request.prototype[key] = requestBase[key];
}

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr && this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set responseType to `val`. Presently valid responseTypes are 'blob' and 
 * 'arraybuffer'.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.responseType = function(val){
  this._responseType = val;
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @param {Object} options with 'type' property 'auto' or 'basic' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass, options){
  if (!options) {
    options = {
      type: 'basic'
    }
  }

  switch (options.type) {
    case 'basic':
      var str = btoa(user + ':' + pass);
      this.set('Authorization', 'Basic ' + str);
    break;

    case 'auto':
      this.username = user;
      this.password = pass;
    break;
  }
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  this._getFormData().append(field, file, filename || file.name);
  return this;
};

Request.prototype._getFormData = function(){
  if (!this._formData) {
    this._formData = new root.FormData();
  }
  return this._formData;
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this._header['content-type'];

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this._header['content-type'];
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * @deprecated
 */
Response.prototype.parse = function serialize(fn){
  if (root.console) {
    console.warn("Client-side parse() method has been renamed to serialize(). This method is not compatible with superagent v2.0");
  }
  this.serialize(fn);
  return this;
};

Response.prototype.serialize = function serialize(fn){
  this._parser = fn;
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(e){
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = 'download';
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  if (this.username && this.password) {
    xhr.open(this.method, this.url, true, this.username, this.password);
  } else {
    xhr.open(this.method, this.url, true);
  }

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var contentType = this._header['content-type'];
    var serialize = this._parser || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) serialize = request.serialize['application/json'];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  if (this._responseType) {
    xhr.responseType = this._responseType;
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};


/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

function del(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

},{"./is-object":23,"./request":25,"./request-base":24,"emitter":20,"reduce":21}],23:[function(require,module,exports){
/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return null != obj && 'object' == typeof obj;
}

module.exports = isObject;

},{}],24:[function(require,module,exports){
/**
 * Module of mixed-in functions shared between node and client code
 */
var isObject = require('./is-object');

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

exports.clearTimeout = function _clearTimeout(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Force given parser
 *
 * Sets the body parser no matter type.
 *
 * @param {Function}
 * @api public
 */

exports.parse = function parse(fn){
  this._parser = fn;
  return this;
};

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

exports.timeout = function timeout(ms){
  this._timeout = ms;
  return this;
};

/**
 * Faux promise support
 *
 * @param {Function} fulfill
 * @param {Function} reject
 * @return {Request}
 */

exports.then = function then(fulfill, reject) {
  return this.end(function(err, res) {
    err ? reject(err) : fulfill(res);
  });
}

/**
 * Allow for extension
 */

exports.use = function use(fn) {
  fn(this);
  return this;
}


/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

exports.get = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

exports.getHeader = exports.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

exports.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
exports.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
exports.field = function(name, val) {
  this._getFormData().append(name, val);
  return this;
};

},{"./is-object":23}],25:[function(require,module,exports){
// The node and browser modules expose versions of this with the
// appropriate constructor function bound as first argument
/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(RequestConstructor, method, url) {
  // callback
  if ('function' == typeof url) {
    return new RequestConstructor('GET', method).end(url);
  }

  // url first
  if (2 == arguments.length) {
    return new RequestConstructor('GET', method);
  }

  return new RequestConstructor(method, url);
}

module.exports = request;

},{}],26:[function(require,module,exports){
// Angular 1 modules and factories for the bundle

if (typeof angular === 'object' && angular.module) {

  angular.element(document).ready(function() {
    Ionic.core.init();
    Ionic.cordova.bootstrap();
  });

  angular.module('ionic.cloud', [])

  .provider('$ionicCloudConfig', function() {
    var config = Ionic.config;

    this.register = function(settings) {
      config.register(settings);
    };

    this.$get = function() {
      return config;
    };
  })

  .provider('$ionicCloud', ['$ionicCloudConfigProvider', function($ionicCloudConfigProvider) {
    this.init = function(value) {
      $ionicCloudConfigProvider.register(value);
    };

    this.$get = [function() {
      return Ionic.core;
    }];
  }])

  .factory('$ionicCloudClient', [function() {
    return Ionic.client;
  }])

  .factory('$ionicUser', [function() {
    return Ionic.singleUserService.current();
  }])

  .factory('$ionicAuth', [function() {
    return Ionic.auth;
  }])

  .factory('$ionicPush', [function() {
    return Ionic.push;
  }])

  .factory('$ionicDeploy', [function() {
    return Ionic.deploy;
  }])

  .run(['$window', '$q', '$rootScope', function($window, $q, $rootScope) {
    if (typeof $window.Promise === 'undefined') {
      $window.Promise = $q;
    } else {
      var init = Ionic.Cloud.DeferredPromise.prototype.init;

      Ionic.Cloud.DeferredPromise.prototype.init = function() {
        init.apply(this, arguments);
        this.promise = $q.when(this.promise);
      };
    }

    var emit = Ionic.Cloud.EventEmitter.prototype.emit;

    Ionic.Cloud.EventEmitter.prototype.emit = function(name, data) {
      $rootScope.$broadcast('cloud:' + name, data);
      return emit.apply(this, arguments);
    };
  }]);

}

},{}],27:[function(require,module,exports){
var Core = require("./../dist/es5/core").Core;
var DataType = require("./../dist/es5/user/data-types").DataType;
var Deploy = require("./../dist/es5/deploy/deploy").Deploy;
var EventEmitter = require("./../dist/es5/events").EventEmitter;
var Logger = require("./../dist/es5/logger").Logger;
var Push = require("./../dist/es5/push/push").Push;
var PushMessage = require("./../dist/es5/push/message").PushMessage;
var auth = require("./../dist/es5/auth");
var client = require("./../dist/es5/client");
var config = require("./../dist/es5/config");
var cordova = require("./../dist/es5/cordova");
var device = require("./../dist/es5/device");
var di = require("./../dist/es5/di");
var promise = require("./../dist/es5/promise");
var storage = require("./../dist/es5/storage");
var user = require("./../dist/es5/user/user");

// Declare the window object
window.Ionic = new di.Container();

// Ionic Modules
Ionic.Core = Core;
Ionic.User = user.User;
Ionic.Auth = auth.Auth;
Ionic.Deploy = Deploy;
Ionic.Push = Push;
Ionic.PushMessage = PushMessage;

// DataType Namespace
Ionic.DataType = DataType;
Ionic.DataTypes = DataType.getMapping();

// Cloud Namespace
Ionic.Cloud = {};
Ionic.Cloud.AuthType = auth.AuthType;
Ionic.Cloud.AuthTypes = {};
Ionic.Cloud.AuthTypes.BasicAuth = auth.BasicAuth;
Ionic.Cloud.AuthTypes.CustomAuth = auth.CustomAuth;
Ionic.Cloud.AuthTypes.TwitterAuth = auth.TwitterAuth;
Ionic.Cloud.AuthTypes.FacebookAuth = auth.FacebookAuth;
Ionic.Cloud.AuthTypes.GithubAuth = auth.GithubAuth;
Ionic.Cloud.AuthTypes.GoogleAuth = auth.GoogleAuth;
Ionic.Cloud.AuthTypes.InstagramAuth = auth.InstagramAuth;
Ionic.Cloud.AuthTypes.LinkedInAuth = auth.LinkedInAuth;
Ionic.Cloud.Cordova = cordova.Cordova;
Ionic.Cloud.Client = client.Client;
Ionic.Cloud.Device = device.Device;
Ionic.Cloud.EventEmitter = EventEmitter;
Ionic.Cloud.Logger = Logger;
Ionic.Cloud.DeferredPromise = promise.DeferredPromise;
Ionic.Cloud.Storage = storage.Storage;
Ionic.Cloud.UserContext = user.UserContext;
Ionic.Cloud.SingleUserService = user.SingleUserService;
Ionic.Cloud.AuthTokenContext = auth.AuthTokenContext;
Ionic.Cloud.CombinedAuthTokenContext = auth.CombinedAuthTokenContext;
Ionic.Cloud.LocalStorageStrategy = storage.LocalStorageStrategy;
Ionic.Cloud.SessionStorageStrategy = storage.SessionStorageStrategy;
Ionic.Cloud.Config = config.Config;

},{"./../dist/es5/auth":1,"./../dist/es5/client":2,"./../dist/es5/config":3,"./../dist/es5/cordova":4,"./../dist/es5/core":5,"./../dist/es5/deploy/deploy":6,"./../dist/es5/device":7,"./../dist/es5/di":8,"./../dist/es5/events":10,"./../dist/es5/logger":13,"./../dist/es5/promise":14,"./../dist/es5/push/message":15,"./../dist/es5/push/push":16,"./../dist/es5/storage":17,"./../dist/es5/user/data-types":18,"./../dist/es5/user/user":19}]},{},[27,26,11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2VzNS9hdXRoLmpzIiwiZGlzdC9lczUvY2xpZW50LmpzIiwiZGlzdC9lczUvY29uZmlnLmpzIiwiZGlzdC9lczUvY29yZG92YS5qcyIsImRpc3QvZXM1L2NvcmUuanMiLCJkaXN0L2VzNS9kZXBsb3kvZGVwbG95LmpzIiwiZGlzdC9lczUvZGV2aWNlLmpzIiwiZGlzdC9lczUvZGkuanMiLCJkaXN0L2VzNS9lcnJvcnMuanMiLCJkaXN0L2VzNS9ldmVudHMuanMiLCJkaXN0L2VzNS9pbmRleC5qcyIsImRpc3QvZXM1L2luc2lnaHRzLmpzIiwiZGlzdC9lczUvbG9nZ2VyLmpzIiwiZGlzdC9lczUvcHJvbWlzZS5qcyIsImRpc3QvZXM1L3B1c2gvbWVzc2FnZS5qcyIsImRpc3QvZXM1L3B1c2gvcHVzaC5qcyIsImRpc3QvZXM1L3N0b3JhZ2UuanMiLCJkaXN0L2VzNS91c2VyL2RhdGEtdHlwZXMuanMiLCJkaXN0L2VzNS91c2VyL3VzZXIuanMiLCJub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVkdWNlLWNvbXBvbmVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9jbGllbnQuanMiLCJub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3JlcXVlc3QtYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXF1ZXN0LmpzIiwic3JjL2FuZ3VsYXIuanMiLCJzcmMvZXM1LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBlcnJvcnNfMSA9IHJlcXVpcmUoJy4vZXJyb3JzJyk7XG52YXIgcHJvbWlzZV8xID0gcmVxdWlyZSgnLi9wcm9taXNlJyk7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIEF1dGhUb2tlbkNvbnRleHQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEF1dGhUb2tlbkNvbnRleHQoZGVwcywgbGFiZWwpIHtcbiAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgICAgICB0aGlzLnN0b3JhZ2UgPSBkZXBzLnN0b3JhZ2U7XG4gICAgfVxuICAgIEF1dGhUb2tlbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZS5nZXQodGhpcy5sYWJlbCk7XG4gICAgfTtcbiAgICBBdXRoVG9rZW5Db250ZXh0LnByb3RvdHlwZS5zdG9yZSA9IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgICB0aGlzLnN0b3JhZ2Uuc2V0KHRoaXMubGFiZWwsIHRva2VuKTtcbiAgICB9O1xuICAgIEF1dGhUb2tlbkNvbnRleHQucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zdG9yYWdlLmRlbGV0ZSh0aGlzLmxhYmVsKTtcbiAgICB9O1xuICAgIHJldHVybiBBdXRoVG9rZW5Db250ZXh0O1xufSgpKTtcbmV4cG9ydHMuQXV0aFRva2VuQ29udGV4dCA9IEF1dGhUb2tlbkNvbnRleHQ7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIENvbWJpbmVkQXV0aFRva2VuQ29udGV4dCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29tYmluZWRBdXRoVG9rZW5Db250ZXh0KGRlcHMsIGxhYmVsKSB7XG4gICAgICAgIHRoaXMubGFiZWwgPSBsYWJlbDtcbiAgICAgICAgdGhpcy5zdG9yYWdlID0gZGVwcy5zdG9yYWdlO1xuICAgICAgICB0aGlzLnRlbXBTdG9yYWdlID0gZGVwcy50ZW1wU3RvcmFnZTtcbiAgICB9XG4gICAgQ29tYmluZWRBdXRoVG9rZW5Db250ZXh0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwZXJtVG9rZW4gPSB0aGlzLnN0b3JhZ2UuZ2V0KHRoaXMubGFiZWwpO1xuICAgICAgICB2YXIgdGVtcFRva2VuID0gdGhpcy50ZW1wU3RvcmFnZS5nZXQodGhpcy5sYWJlbCk7XG4gICAgICAgIHZhciB0b2tlbiA9IHRlbXBUb2tlbiB8fCBwZXJtVG9rZW47XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9O1xuICAgIENvbWJpbmVkQXV0aFRva2VuQ29udGV4dC5wcm90b3R5cGUuc3RvcmUgPSBmdW5jdGlvbiAodG9rZW4sIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0geyAncGVybWFuZW50JzogdHJ1ZSB9OyB9XG4gICAgICAgIGlmIChvcHRpb25zLnBlcm1hbmVudCkge1xuICAgICAgICAgICAgdGhpcy5zdG9yYWdlLnNldCh0aGlzLmxhYmVsLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBTdG9yYWdlLnNldCh0aGlzLmxhYmVsLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENvbWJpbmVkQXV0aFRva2VuQ29udGV4dC5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN0b3JhZ2UuZGVsZXRlKHRoaXMubGFiZWwpO1xuICAgICAgICB0aGlzLnRlbXBTdG9yYWdlLmRlbGV0ZSh0aGlzLmxhYmVsKTtcbiAgICB9O1xuICAgIHJldHVybiBDb21iaW5lZEF1dGhUb2tlbkNvbnRleHQ7XG59KCkpO1xuZXhwb3J0cy5Db21iaW5lZEF1dGhUb2tlbkNvbnRleHQgPSBDb21iaW5lZEF1dGhUb2tlbkNvbnRleHQ7XG4vKipcbiAqIGBBdXRoYCBoYW5kbGVzIGF1dGhlbnRpY2F0aW9uIG9mIGEgc2luZ2xlIHVzZXIsIHN1Y2ggYXMgc2lnbmluZyB1cCwgbG9nZ2luZ1xuICogaW4gJiBvdXQsIHNvY2lhbCBwcm92aWRlciBhdXRoZW50aWNhdGlvbiwgZXRjLlxuICpcbiAqIEBmZWF0dXJlZFxuICovXG52YXIgQXV0aCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQXV0aChkZXBzLCBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBoaWRkZW5cbiAgICAgICAgICovXG4gICAgICAgIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy5jb25maWcgPSBkZXBzLmNvbmZpZztcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gZGVwcy5lbWl0dGVyO1xuICAgICAgICB0aGlzLmF1dGhNb2R1bGVzID0gZGVwcy5hdXRoTW9kdWxlcztcbiAgICAgICAgdGhpcy50b2tlbkNvbnRleHQgPSBkZXBzLnRva2VuQ29udGV4dDtcbiAgICAgICAgdGhpcy51c2VyU2VydmljZSA9IGRlcHMudXNlclNlcnZpY2U7XG4gICAgICAgIHRoaXMuc3RvcmFnZSA9IGRlcHMuc3RvcmFnZTtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEF1dGgucHJvdG90eXBlLCBcInBhc3N3b3JkUmVzZXRVcmxcIiwge1xuICAgICAgICAvKipcbiAgICAgICAgICogTGluayB0aGUgdXNlciB0byB0aGlzIFVSTCBmb3IgcGFzc3dvcmQgcmVzZXRzLiBPbmx5IGZvciBlbWFpbC9wYXNzd29yZFxuICAgICAgICAgKiBhdXRoZW50aWNhdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogVXNlIHRoaXMgaWYgeW91IHdhbnQgdG8gdXNlIG91ciBwYXNzd29yZCByZXNldCBmb3JtcyBpbnN0ZWFkIG9mIGNyZWF0aW5nXG4gICAgICAgICAqIHlvdXIgb3duIGluIHlvdXIgYXBwLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0VVJMKCd3ZWInKSArIFwiL3Bhc3N3b3JkL3Jlc2V0L1wiICsgdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogQ2hlY2sgd2hldGhlciB0aGUgdXNlciBpcyBsb2dnZWQgaW4gb3Igbm90LlxuICAgICAqXG4gICAgICogSWYgYW4gYXV0aCB0b2tlbiBleGlzdHMgaW4gbG9jYWwgc3RvcmFnZSwgdGhlIHVzZXIgaXMgbG9nZ2VkIGluLlxuICAgICAqL1xuICAgIEF1dGgucHJvdG90eXBlLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gdGhpcy50b2tlbkNvbnRleHQuZ2V0KCk7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2lnbiB1cCBhIHVzZXIgd2l0aCB0aGUgZ2l2ZW4gZGF0YS4gT25seSBmb3IgZW1haWwvcGFzc3dvcmRcbiAgICAgKiBhdXRoZW50aWNhdGlvbi5cbiAgICAgKlxuICAgICAqIGBzaWdudXBgIGRvZXMgbm90IGFmZmVjdCBsb2NhbCBkYXRhIG9yIHRoZSBjdXJyZW50IHVzZXIgdW50aWwgYGxvZ2luYCBpc1xuICAgICAqIGNhbGxlZC4gVGhpcyBtZWFucyB5b3UnbGwgbGlrZWx5IHdhbnQgdG8gbG9nIGluIHlvdXIgdXNlcnMgbWFudWFsbHkgYWZ0ZXJcbiAgICAgKiBzaWdudXAuXG4gICAgICpcbiAgICAgKiBJZiBhIHNpZ251cCBmYWlscywgdGhlIHByb21pc2UgcmVqZWN0cyB3aXRoIGEgW2BJRGV0YWlsZWRFcnJvcmBcbiAgICAgKiBvYmplY3RdKC9hcGkvY2xpZW50L2lkZXRhaWxlZGVycm9yKSB0aGF0IGNvbnRhaW5zIGFuIGFycmF5IG9mIGVycm9yIGNvZGVzXG4gICAgICogZnJvbSB0aGUgY2xvdWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGV0YWlscyAtIFRoZSBkZXRhaWxzIHRoYXQgZGVzY3JpYmUgYSB1c2VyLlxuICAgICAqL1xuICAgIEF1dGgucHJvdG90eXBlLnNpZ251cCA9IGZ1bmN0aW9uIChkZXRhaWxzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF1dGhNb2R1bGVzLmJhc2ljLnNpZ251cChkZXRhaWxzKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEF0dGVtcHQgdG8gbG9nIHRoZSB1c2VyIGluIHdpdGggdGhlIGdpdmVuIGNyZWRlbnRpYWxzLiBGb3IgY3VzdG9tICYgc29jaWFsXG4gICAgICogbG9naW5zLCBraWNrLW9mZiB0aGUgYXV0aGVudGljYXRpb24gcHJvY2Vzcy5cbiAgICAgKlxuICAgICAqIEFmdGVyIGxvZ2luLCB0aGUgZnVsbCB1c2VyIGlzIGxvYWRlZCBmcm9tIHRoZSBjbG91ZCBhbmQgc2F2ZWQgaW4gbG9jYWxcbiAgICAgKiBzdG9yYWdlIGFsb25nIHdpdGggdGhlaXIgYXV0aCB0b2tlbi5cbiAgICAgKlxuICAgICAqIEBub3RlIFRPRE86IEJldHRlciBlcnJvciBoYW5kbGluZyBkb2NzLlxuICAgICAqXG4gICAgICogQHBhcmFtIG1vZHVsZUlkXG4gICAgICogIFRoZSBhdXRoZW50aWNhdGlvbiBwcm92aWRlciBtb2R1bGUgSUQgdG8gdXNlIHdpdGggdGhpcyBsb2dpbi5cbiAgICAgKiBAcGFyYW0gY3JlZGVudGlhbHNcbiAgICAgKiAgRm9yIGVtYWlsL3Bhc3N3b3JkIGF1dGhlbnRpY2F0aW9uLCBnaXZlIGFuIGVtYWlsIGFuZCBwYXNzd29yZC4gRm9yIHNvY2lhbFxuICAgICAqICBhdXRoZW50aWNhdGlvbiwgZXhjbHVkZSB0aGlzIHBhcmFtZXRlci4gRm9yIGN1c3RvbSBhdXRoZW50aWNhdGlvbiwgc2VuZFxuICAgICAqICB3aGF0ZXZlciB5b3UgbmVlZC5cbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICBPcHRpb25zIGZvciB0aGlzIGxvZ2luLCBzdWNoIGFzIHdoZXRoZXIgdG8gcmVtZW1iZXIgdGhlIGxvZ2luIGFuZFxuICAgICAqICBJbkFwcEJyb3dzZXIgd2luZG93IG9wdGlvbnMgZm9yIGF1dGhlbnRpY2F0aW9uIHByb3ZpZGVycyB0aGF0IG1ha2UgdXNlIG9mXG4gICAgICogIGl0LlxuICAgICAqL1xuICAgIEF1dGgucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24gKG1vZHVsZUlkLCBjcmVkZW50aWFscywgb3B0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMucmVtZW1iZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBvcHRpb25zLnJlbWVtYmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5BcHBCcm93c2VyT3B0aW9ucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5BcHBCcm93c2VyT3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbkFwcEJyb3dzZXJPcHRpb25zLmxvY2F0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgb3B0aW9ucy5pbkFwcEJyb3dzZXJPcHRpb25zLmxvY2F0aW9uID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmluQXBwQnJvd3Nlck9wdGlvbnMuY2xlYXJjYWNoZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5BcHBCcm93c2VyT3B0aW9ucy5jbGVhcmNhY2hlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5BcHBCcm93c2VyT3B0aW9ucy5jbGVhcnNlc3Npb25jYWNoZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5BcHBCcm93c2VyT3B0aW9ucy5jbGVhcnNlc3Npb25jYWNoZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmF1dGhNb2R1bGVzW21vZHVsZUlkXTtcbiAgICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGNsYXNzIGlzIGludmFsaWQgb3IgbWlzc2luZzonICsgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuYXV0aGVudGljYXRlKGNyZWRlbnRpYWxzLCBvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICBfdGhpcy5zdG9yZVRva2VuKG9wdGlvbnMsIHIudG9rZW4pO1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnVzZXJTZXJ2aWNlLmxvYWQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXNlciA9IF90aGlzLnVzZXJTZXJ2aWNlLmN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgICB1c2VyLnN0b3JlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBMb2cgdGhlIHVzZXIgb3V0IG9mIHRoZSBhcHAuXG4gICAgICpcbiAgICAgKiBUaGlzIGNsZWFycyB0aGUgYXV0aCB0b2tlbiBvdXQgb2YgbG9jYWwgc3RvcmFnZSBhbmQgcmVzdG9yZXMgdGhlIHVzZXIgdG9cbiAgICAgKiBhbiB1bmF1dGhlbnRpY2F0ZWQgc3RhdGUuXG4gICAgICovXG4gICAgQXV0aC5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnRva2VuQ29udGV4dC5kZWxldGUoKTtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLnVzZXJTZXJ2aWNlLmN1cnJlbnQoKTtcbiAgICAgICAgdXNlci51bnN0b3JlKCk7XG4gICAgICAgIHVzZXIuY2xlYXIoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEtpY2stb2ZmIHRoZSBwYXNzd29yZCByZXNldCBwcm9jZXNzLiBPbmx5IGZvciBlbWFpbC9wYXNzd29yZFxuICAgICAqIGF1dGhlbnRpY2F0aW9uLlxuICAgICAqXG4gICAgICogQW4gZW1haWwgd2lsbCBiZSBzZW50IHRvIHRoZSB1c2VyIHdpdGggYSBzaG9ydCBwYXNzd29yZCByZXNldCBjb2RlLCB3aGljaFxuICAgICAqIHRoZXkgY2FuIGNvcHkgYmFjayBpbnRvIHlvdXIgYXBwIGFuZCB1c2UgdGhlIFtgY29uZmlybVBhc3N3b3JkUmVzZXQoKWBcbiAgICAgKiBtZXRob2RdKCNjb25maXJtUGFzc3dvcmRSZXNldCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZW1haWwgLSBUaGUgZW1haWwgYWRkcmVzcyB0byB3aGljaCB0byBzZW5kIGEgY29kZS5cbiAgICAgKi9cbiAgICBBdXRoLnByb3RvdHlwZS5yZXF1ZXN0UGFzc3dvcmRSZXNldCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICB0aGlzLnN0b3JhZ2Uuc2V0KCdhdXRoX3Bhc3N3b3JkX3Jlc2V0X2VtYWlsJywgZW1haWwpO1xuICAgICAgICByZXR1cm4gdGhpcy5hdXRoTW9kdWxlcy5iYXNpYy5yZXF1ZXN0UGFzc3dvcmRSZXNldChlbWFpbCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb25maXJtIGEgcGFzc3dvcmQgcmVzZXQuXG4gICAgICpcbiAgICAgKiBXaGVuIHRoZSB1c2VyIGdpdmVzIHlvdSB0aGVpciBwYXNzd29yZCByZXNldCBjb2RlIGludG8geW91ciBhcHAgYW5kIHRoZWlyXG4gICAgICogcmVxdWVzdGVkIGNoYW5nZWQgcGFzc3dvcmQsIGNhbGwgdGhpcyBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29kZSAtIFRoZSBwYXNzd29yZCByZXNldCBjb2RlIGZyb20gdGhlIHVzZXIuXG4gICAgICogQHBhcmFtIG5ld1Bhc3N3b3JkIC0gVGhlIHJlcXVlc3RlZCBjaGFuZ2VkIHBhc3N3b3JkIGZyb20gdGhlIHVzZXIuXG4gICAgICovXG4gICAgQXV0aC5wcm90b3R5cGUuY29uZmlybVBhc3N3b3JkUmVzZXQgPSBmdW5jdGlvbiAoY29kZSwgbmV3UGFzc3dvcmQpIHtcbiAgICAgICAgdmFyIGVtYWlsID0gdGhpcy5zdG9yYWdlLmdldCgnYXV0aF9wYXNzd29yZF9yZXNldF9lbWFpbCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5hdXRoTW9kdWxlcy5iYXNpYy5jb25maXJtUGFzc3dvcmRSZXNldChlbWFpbCwgY29kZSwgbmV3UGFzc3dvcmQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSByYXcgYXV0aCB0b2tlbiBvZiB0aGUgYWN0aXZlIHVzZXIgZnJvbSBsb2NhbCBzdG9yYWdlLlxuICAgICAqL1xuICAgIEF1dGgucHJvdG90eXBlLmdldFRva2VuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b2tlbkNvbnRleHQuZ2V0KCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgQXV0aC5wcm90b3R5cGUuc3RvcmVUb2tlbiA9IGZ1bmN0aW9uIChvcHRpb25zLCB0b2tlbikge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7ICdyZW1lbWJlcic6IHRydWUgfTsgfVxuICAgICAgICB2YXIgb3JpZ2luYWxUb2tlbiA9IHRoaXMuYXV0aFRva2VuO1xuICAgICAgICB0aGlzLmF1dGhUb2tlbiA9IHRva2VuO1xuICAgICAgICB0aGlzLnRva2VuQ29udGV4dC5zdG9yZSh0aGlzLmF1dGhUb2tlbiwgeyAncGVybWFuZW50Jzogb3B0aW9ucy5yZW1lbWJlciB9KTtcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2F1dGg6dG9rZW4tY2hhbmdlZCcsIHsgJ29sZCc6IG9yaWdpbmFsVG9rZW4sICduZXcnOiB0aGlzLmF1dGhUb2tlbiB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBBdXRoLmdldERldGFpbGVkRXJyb3JGcm9tUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHZhciBlcnJvcnMgPSBbXTtcbiAgICAgICAgdmFyIGRldGFpbHMgPSBbXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRldGFpbHMgPSByZXMuYm9keS5lcnJvci5kZXRhaWxzO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7IH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkZXRhaWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZGV0YWlsID0gZGV0YWlsc1tpXTtcbiAgICAgICAgICAgIGlmIChkZXRhaWwuZXJyb3JfdHlwZSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGRldGFpbC5lcnJvcl90eXBlICsgJ18nICsgZGV0YWlsLnBhcmFtZXRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBlcnJvcnNfMS5EZXRhaWxlZEVycm9yKCdFcnJvciBjcmVhdGluZyB1c2VyJywgZXJyb3JzKTtcbiAgICB9O1xuICAgIHJldHVybiBBdXRoO1xufSgpKTtcbmV4cG9ydHMuQXV0aCA9IEF1dGg7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIEF1dGhUeXBlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBdXRoVHlwZShkZXBzKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gZGVwcy5jb25maWc7XG4gICAgICAgIHRoaXMuY2xpZW50ID0gZGVwcy5jbGllbnQ7XG4gICAgfVxuICAgIEF1dGhUeXBlLnByb3RvdHlwZS5wYXJzZUluQXBwQnJvd3Nlck9wdGlvbnMgPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICBpZiAoIW9wdHMpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgcCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9wdHMpIHtcbiAgICAgICAgICAgIHZhciB2ID0gdm9pZCAwO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRzW2tdID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB2ID0gb3B0c1trXSA/ICd5ZXMnIDogJ25vJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYgPSBvcHRzW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC5wdXNoKGsgKyBcIj1cIiArIHYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwLmpvaW4oJywnKTtcbiAgICB9O1xuICAgIEF1dGhUeXBlLnByb3RvdHlwZS5pbkFwcEJyb3dzZXJGbG93ID0gZnVuY3Rpb24gKG1vZHVsZUlkLCBkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IHt9OyB9XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIGlmICghd2luZG93IHx8ICF3aW5kb3cuY29yZG92YSB8fCAhd2luZG93LmNvcmRvdmEuSW5BcHBCcm93c2VyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QobmV3IEVycm9yKCdJbkFwcEJyb3dzZXIgcGx1Z2luIG1pc3NpbmcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNsaWVudC5wb3N0KFwiL2F1dGgvbG9naW4vXCIgKyBtb2R1bGVJZClcbiAgICAgICAgICAgICAgICAuc2VuZCh7XG4gICAgICAgICAgICAgICAgJ2FwcF9pZCc6IHRoaXMuY29uZmlnLmdldCgnYXBwX2lkJyksXG4gICAgICAgICAgICAgICAgJ2NhbGxiYWNrJzogd2luZG93LmxvY2F0aW9uLmhyZWYsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBkYXRhXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lbmQoZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB3XzEgPSB3aW5kb3cuY29yZG92YS5JbkFwcEJyb3dzZXIub3BlbihyZXMuYm9keS5kYXRhLnVybCwgJ19ibGFuaycsIF90aGlzLnBhcnNlSW5BcHBCcm93c2VyT3B0aW9ucyhvcHRpb25zLmluQXBwQnJvd3Nlck9wdGlvbnMpKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRXhpdF8xID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignSW5BcHBCcm93c2VyIGV4aXQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkxvYWRFcnJvcl8xID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignSW5BcHBCcm93c2VyIGxvYWRlcnJvcicpKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uTG9hZFN0YXJ0ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnVybC5zbGljZSgwLCAyMCkgPT09ICdodHRwOi8vYXV0aC5pb25pYy5pbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXVlcnlTdHJpbmcgPSBkYXRhLnVybC5zcGxpdCgnIycpWzBdLnNwbGl0KCc/JylbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtUGFydHMgPSBxdWVyeVN0cmluZy5zcGxpdCgnJicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmFtUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBwYXJhbVBhcnRzW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1twYXJ0WzBdXSA9IHBhcnRbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdfMS5yZW1vdmVFdmVudExpc3RlbmVyKCdleGl0Jywgb25FeGl0XzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdfMS5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZXJyb3InLCBvbkxvYWRFcnJvcl8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3XzEuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rva2VuJzogcGFyYW1zWyd0b2tlbiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2lnbnVwJzogQm9vbGVhbihwYXJzZUludChwYXJhbXNbJ3NpZ251cCddLCAxMCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHdfMS5hZGRFdmVudExpc3RlbmVyKCdleGl0Jywgb25FeGl0XzEpO1xuICAgICAgICAgICAgICAgICAgICB3XzEuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVycm9yJywgb25Mb2FkRXJyb3JfMSk7XG4gICAgICAgICAgICAgICAgICAgIHdfMS5hZGRFdmVudExpc3RlbmVyKCdsb2Fkc3RhcnQnLCBvbkxvYWRTdGFydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcbiAgICByZXR1cm4gQXV0aFR5cGU7XG59KCkpO1xuZXhwb3J0cy5BdXRoVHlwZSA9IEF1dGhUeXBlO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBCYXNpY0F1dGggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCYXNpY0F1dGgsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQmFzaWNBdXRoKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgQmFzaWNBdXRoLnByb3RvdHlwZS5hdXRoZW50aWNhdGUgPSBmdW5jdGlvbiAoZGF0YSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICBpZiAoIWRhdGEuZW1haWwgfHwgIWRhdGEucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoJ2VtYWlsIGFuZCBwYXNzd29yZCBhcmUgcmVxdWlyZWQgZm9yIGJhc2ljIGF1dGhlbnRpY2F0aW9uJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jbGllbnQucG9zdCgnL2F1dGgvbG9naW4nKVxuICAgICAgICAgICAgICAgIC5zZW5kKHtcbiAgICAgICAgICAgICAgICAnYXBwX2lkJzogdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKSxcbiAgICAgICAgICAgICAgICAnZW1haWwnOiBkYXRhLmVtYWlsLFxuICAgICAgICAgICAgICAgICdwYXNzd29yZCc6IGRhdGEucGFzc3dvcmRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAndG9rZW4nOiByZXMuYm9keS5kYXRhLnRva2VuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgQmFzaWNBdXRoLnByb3RvdHlwZS5yZXF1ZXN0UGFzc3dvcmRSZXNldCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICBpZiAoIWVtYWlsKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QobmV3IEVycm9yKCdFbWFpbCBpcyByZXF1aXJlZCBmb3IgcGFzc3dvcmQgcmVzZXQgcmVxdWVzdC4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNsaWVudC5wb3N0KCcvdXNlcnMvcGFzc3dvcmQvcmVzZXQnKVxuICAgICAgICAgICAgICAgIC5zZW5kKHtcbiAgICAgICAgICAgICAgICAnYXBwX2lkJzogdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKSxcbiAgICAgICAgICAgICAgICAnZW1haWwnOiBlbWFpbCxcbiAgICAgICAgICAgICAgICAnZmxvdyc6ICdhcHAnXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lbmQoZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIEJhc2ljQXV0aC5wcm90b3R5cGUuY29uZmlybVBhc3N3b3JkUmVzZXQgPSBmdW5jdGlvbiAoZW1haWwsIGNvZGUsIG5ld1Bhc3N3b3JkKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIGlmICghY29kZSB8fCAhZW1haWwgfHwgIW5ld1Bhc3N3b3JkKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QobmV3IEVycm9yKCdDb2RlLCBuZXcgcGFzc3dvcmQsIGFuZCBlbWFpbCBhcmUgcmVxdWlyZWQuJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jbGllbnQucG9zdCgnL3VzZXJzL3Bhc3N3b3JkJylcbiAgICAgICAgICAgICAgICAuc2VuZCh7XG4gICAgICAgICAgICAgICAgJ3Jlc2V0X3Rva2VuJzogY29kZSxcbiAgICAgICAgICAgICAgICAnbmV3X3Bhc3N3b3JkJzogbmV3UGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgJ2VtYWlsJzogZW1haWxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgQmFzaWNBdXRoLnByb3RvdHlwZS5zaWdudXAgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICB2YXIgdXNlckRhdGEgPSB7XG4gICAgICAgICAgICAnYXBwX2lkJzogdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKSxcbiAgICAgICAgICAgICdlbWFpbCc6IGRhdGEuZW1haWwsXG4gICAgICAgICAgICAncGFzc3dvcmQnOiBkYXRhLnBhc3N3b3JkXG4gICAgICAgIH07XG4gICAgICAgIC8vIG9wdGlvbmFsIGRldGFpbHNcbiAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUpIHtcbiAgICAgICAgICAgIHVzZXJEYXRhLnVzZXJuYW1lID0gZGF0YS51c2VybmFtZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbWFnZSkge1xuICAgICAgICAgICAgdXNlckRhdGEuaW1hZ2UgPSBkYXRhLmltYWdlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLm5hbWUpIHtcbiAgICAgICAgICAgIHVzZXJEYXRhLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuY3VzdG9tKSB7XG4gICAgICAgICAgICB1c2VyRGF0YS5jdXN0b20gPSBkYXRhLmN1c3RvbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsaWVudC5wb3N0KCcvdXNlcnMnKVxuICAgICAgICAgICAgLnNlbmQodXNlckRhdGEpXG4gICAgICAgICAgICAuZW5kKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChBdXRoLmdldERldGFpbGVkRXJyb3JGcm9tUmVzcG9uc2UoZXJyLnJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIHJldHVybiBCYXNpY0F1dGg7XG59KEF1dGhUeXBlKSk7XG5leHBvcnRzLkJhc2ljQXV0aCA9IEJhc2ljQXV0aDtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgQ3VzdG9tQXV0aCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEN1c3RvbUF1dGgsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ3VzdG9tQXV0aCgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEN1c3RvbUF1dGgucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IHt9OyB9XG4gICAgICAgIHJldHVybiB0aGlzLmluQXBwQnJvd3NlckZsb3coJ2N1c3RvbScsIGRhdGEsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgcmV0dXJuIEN1c3RvbUF1dGg7XG59KEF1dGhUeXBlKSk7XG5leHBvcnRzLkN1c3RvbUF1dGggPSBDdXN0b21BdXRoO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBUd2l0dGVyQXV0aCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFR3aXR0ZXJBdXRoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFR3aXR0ZXJBdXRoKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVHdpdHRlckF1dGgucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IHt9OyB9XG4gICAgICAgIHJldHVybiB0aGlzLmluQXBwQnJvd3NlckZsb3coJ3R3aXR0ZXInLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHJldHVybiBUd2l0dGVyQXV0aDtcbn0oQXV0aFR5cGUpKTtcbmV4cG9ydHMuVHdpdHRlckF1dGggPSBUd2l0dGVyQXV0aDtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgRmFjZWJvb2tBdXRoID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRmFjZWJvb2tBdXRoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEZhY2Vib29rQXV0aCgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEZhY2Vib29rQXV0aC5wcm90b3R5cGUuYXV0aGVudGljYXRlID0gZnVuY3Rpb24gKGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IHZvaWQgMCkgeyBkYXRhID0ge307IH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5BcHBCcm93c2VyRmxvdygnZmFjZWJvb2snLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHJldHVybiBGYWNlYm9va0F1dGg7XG59KEF1dGhUeXBlKSk7XG5leHBvcnRzLkZhY2Vib29rQXV0aCA9IEZhY2Vib29rQXV0aDtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgR2l0aHViQXV0aCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEdpdGh1YkF1dGgsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gR2l0aHViQXV0aCgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEdpdGh1YkF1dGgucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IHt9OyB9XG4gICAgICAgIHJldHVybiB0aGlzLmluQXBwQnJvd3NlckZsb3coJ2dpdGh1YicsIGRhdGEsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgcmV0dXJuIEdpdGh1YkF1dGg7XG59KEF1dGhUeXBlKSk7XG5leHBvcnRzLkdpdGh1YkF1dGggPSBHaXRodWJBdXRoO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBHb29nbGVBdXRoID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoR29vZ2xlQXV0aCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBHb29nbGVBdXRoKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgR29vZ2xlQXV0aC5wcm90b3R5cGUuYXV0aGVudGljYXRlID0gZnVuY3Rpb24gKGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IHZvaWQgMCkgeyBkYXRhID0ge307IH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5BcHBCcm93c2VyRmxvdygnZ29vZ2xlJywgZGF0YSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICByZXR1cm4gR29vZ2xlQXV0aDtcbn0oQXV0aFR5cGUpKTtcbmV4cG9ydHMuR29vZ2xlQXV0aCA9IEdvb2dsZUF1dGg7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIEluc3RhZ3JhbUF1dGggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhJbnN0YWdyYW1BdXRoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEluc3RhZ3JhbUF1dGgoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBJbnN0YWdyYW1BdXRoLnByb3RvdHlwZS5hdXRoZW50aWNhdGUgPSBmdW5jdGlvbiAoZGF0YSwgb3B0aW9ucykge1xuICAgICAgICBpZiAoZGF0YSA9PT0gdm9pZCAwKSB7IGRhdGEgPSB7fTsgfVxuICAgICAgICByZXR1cm4gdGhpcy5pbkFwcEJyb3dzZXJGbG93KCdpbnN0YWdyYW0nLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHJldHVybiBJbnN0YWdyYW1BdXRoO1xufShBdXRoVHlwZSkpO1xuZXhwb3J0cy5JbnN0YWdyYW1BdXRoID0gSW5zdGFncmFtQXV0aDtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgTGlua2VkSW5BdXRoID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTGlua2VkSW5BdXRoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIExpbmtlZEluQXV0aCgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIExpbmtlZEluQXV0aC5wcm90b3R5cGUuYXV0aGVudGljYXRlID0gZnVuY3Rpb24gKGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IHZvaWQgMCkgeyBkYXRhID0ge307IH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5BcHBCcm93c2VyRmxvdygnbGlua2VkaW4nLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHJldHVybiBMaW5rZWRJbkF1dGg7XG59KEF1dGhUeXBlKSk7XG5leHBvcnRzLkxpbmtlZEluQXV0aCA9IExpbmtlZEluQXV0aDtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIHJlcXVlc3QgPSByZXF1aXJlKCdzdXBlcmFnZW50Jyk7XG4vKipcbiAqIGBDbGllbnRgIGlzIGZvciBtYWtpbmcgSFRUUCByZXF1ZXN0cyB0byB0aGUgQVBJLlxuICpcbiAqIFVuZGVyIHRoZSBob29kLCBpdCB1c2VzXG4gKiBbc3VwZXJhZ2VudF0oaHR0cDovL3Zpc2lvbm1lZGlhLmdpdGh1Yi5pby9zdXBlcmFnZW50LykuIFdoZW4gYSBtZXRob2QgaXNcbiAqIGNhbGxlZCwgeW91IGNhbiBjYWxsIGFueSBudW1iZXIgb2Ygc3VwZXJhZ2VudCBmdW5jdGlvbnMgb24gaXQgYW5kIHRoZW4gY2FsbFxuICogYGVuZCgpYCB0byBjb21wbGV0ZSBhbmQgc2VuZCB0aGUgcmVxdWVzdC5cbiAqXG4gKiBAZmVhdHVyZWRcbiAqL1xudmFyIENsaWVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2xpZW50KFxuICAgICAgICAvKipcbiAgICAgICAgICogQGhpZGRlblxuICAgICAgICAgKi9cbiAgICAgICAgdG9rZW5Db250ZXh0LCBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBoaWRkZW5cbiAgICAgICAgICovXG4gICAgICAgIGJhc2VVcmwsIHJlcSAvLyBUT0RPOiB1c2Ugc3VwZXJhZ2VudCB0eXBlc1xuICAgICAgICApIHtcbiAgICAgICAgdGhpcy50b2tlbkNvbnRleHQgPSB0b2tlbkNvbnRleHQ7XG4gICAgICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmw7XG4gICAgICAgIGlmICh0eXBlb2YgcmVxID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmVxID0gcmVxdWVzdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcSA9IHJlcTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR0VUIHJlcXVlc3QgZm9yIHJldHJpZXZpbmcgYSByZXNvdXJjZSBmcm9tIHRoZSBBUEkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnQgLSBUaGUgcGF0aCBvZiB0aGUgQVBJIGVuZHBvaW50LlxuICAgICAqL1xuICAgIENsaWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1cHBsZW1lbnQodGhpcy5yZXEuZ2V0LCBlbmRwb2ludCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBQT1NUIHJlcXVlc3QgZm9yIHNlbmRpbmcgYSBuZXcgcmVzb3VyY2UgdG8gdGhlIEFQSS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbmRwb2ludCAtIFRoZSBwYXRoIG9mIHRoZSBBUEkgZW5kcG9pbnQuXG4gICAgICovXG4gICAgQ2xpZW50LnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1cHBsZW1lbnQodGhpcy5yZXEucG9zdCwgZW5kcG9pbnQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUFVUIHJlcXVlc3QgZm9yIHJlcGxhY2luZyBhIHJlc291cmNlIGluIHRoZSBBUEkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnQgLSBUaGUgcGF0aCBvZiB0aGUgQVBJIGVuZHBvaW50LlxuICAgICAqL1xuICAgIENsaWVudC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1cHBsZW1lbnQodGhpcy5yZXEucHV0LCBlbmRwb2ludCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBQQVRDSCByZXF1ZXN0IGZvciBwZXJmb3JtaW5nIHBhcnRpYWwgdXBkYXRlcyB0byBhIHJlc291cmNlIGluIHRoZSBBUEkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnQgLSBUaGUgcGF0aCBvZiB0aGUgQVBJIGVuZHBvaW50LlxuICAgICAqL1xuICAgIENsaWVudC5wcm90b3R5cGUucGF0Y2ggPSBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3VwcGxlbWVudCh0aGlzLnJlcS5wYXRjaCwgZW5kcG9pbnQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogREVMRVRFIHJlcXVlc3QgZm9yIGRlbGV0aW5nIGEgcmVzb3VyY2UgZnJvbSB0aGUgQVBJLlxuICAgICAqXG4gICAgICogQHBhcmFtIGVuZHBvaW50IC0gVGhlIHBhdGggb2YgdGhlIEFQSSBlbmRwb2ludC5cbiAgICAgKi9cbiAgICBDbGllbnQucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbmRwb2ludCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdXBwbGVtZW50KHRoaXMucmVxLmRlbGV0ZSwgZW5kcG9pbnQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIENsaWVudC5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uIChtZXRob2QsIGVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1cHBsZW1lbnQodGhpcy5yZXEuYmluZCh0aGlzLnJlcSwgbWV0aG9kKSwgZW5kcG9pbnQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBDbGllbnQucHJvdG90eXBlLnN1cHBsZW1lbnQgPSBmdW5jdGlvbiAoZm4sIGVuZHBvaW50KSB7XG4gICAgICAgIGlmIChlbmRwb2ludC5zdWJzdHJpbmcoMCwgMSkgIT09ICcvJykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ2VuZHBvaW50IG11c3Qgc3RhcnQgd2l0aCBsZWFkaW5nIHNsYXNoJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlcSA9IGZuKHRoaXMuYmFzZVVybCArIGVuZHBvaW50KTtcbiAgICAgICAgdmFyIHRva2VuID0gdGhpcy50b2tlbkNvbnRleHQuZ2V0KCk7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgcmVxLnNldCgnQXV0aG9yaXphdGlvbicsIFwiQmVhcmVyIFwiICsgdG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXE7XG4gICAgfTtcbiAgICByZXR1cm4gQ2xpZW50O1xufSgpKTtcbmV4cG9ydHMuQ2xpZW50ID0gQ2xpZW50O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIENvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29uZmlnKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudXJscyA9IHtcbiAgICAgICAgICAgICdhcGknOiAnaHR0cHM6Ly9hcGkuaW9uaWMuaW8nLFxuICAgICAgICAgICAgJ3dlYic6ICdodHRwczovL3dlYi5pb25pYy5pbydcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBuZXcgY29uZmlnLlxuICAgICAqL1xuICAgIENvbmZpZy5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiAoc2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2V0IGEgdmFsdWUgZnJvbSB0aGUgY29yZSBzZXR0aW5ncy4gWW91IHNob3VsZCB1c2UgYHNldHRpbmdzYCBhdHRyaWJ1dGVcbiAgICAgKiBkaXJlY3RseSBmb3IgY29yZSBzZXR0aW5ncyBhbmQgb3RoZXIgc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUgLSBUaGUgc2V0dGluZ3Mga2V5IHRvIGdldC5cbiAgICAgKi9cbiAgICBDb25maWcucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncyB8fCAhdGhpcy5zZXR0aW5ncy5jb3JlKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNvcmVbbmFtZV07XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgQ29uZmlnLnByb3RvdHlwZS5nZXRVUkwgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgdXJscyA9ICh0aGlzLnNldHRpbmdzICYmIHRoaXMuc2V0dGluZ3MuY29yZSAmJiB0aGlzLnNldHRpbmdzLmNvcmUudXJscykgfHwge307XG4gICAgICAgIGlmICh1cmxzW25hbWVdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsc1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy51cmxzW25hbWVdO1xuICAgIH07XG4gICAgcmV0dXJuIENvbmZpZztcbn0oKSk7XG5leHBvcnRzLkNvbmZpZyA9IENvbmZpZztcbiIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBDb3Jkb3ZhID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb3Jkb3ZhKGRlcHMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy5hcHAgPSBkZXBzLmFwcFN0YXR1cztcbiAgICAgICAgdGhpcy5kZXZpY2UgPSBkZXBzLmRldmljZTtcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gZGVwcy5lbWl0dGVyO1xuICAgICAgICB0aGlzLmxvZ2dlciA9IGRlcHMubG9nZ2VyO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRXZlbnRIYW5kbGVycygpO1xuICAgIH1cbiAgICBDb3Jkb3ZhLnByb3RvdHlwZS5ib290c3RyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBldmVudHMgPSBbJ3BhdXNlJywgJ3Jlc3VtZSddO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5lbWl0dGVyLmVtaXQoJ2NvcmRvdmE6ZGV2aWNlcmVhZHknLCB7ICdhcmdzJzogYXJncyB9KTtcbiAgICAgICAgICAgIHZhciBfbG9vcF8xID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5lbWl0dGVyLmVtaXQoJ2NvcmRvdmE6JyArIGUsIHsgJ2FyZ3MnOiBhcmdzIH0pO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmb3IgKHZhciBfYSA9IDAsIGV2ZW50c18xID0gZXZlbnRzOyBfYSA8IGV2ZW50c18xLmxlbmd0aDsgX2ErKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnRzXzFbX2FdO1xuICAgICAgICAgICAgICAgIF9sb29wXzEoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgQ29yZG92YS5wcm90b3R5cGUucmVnaXN0ZXJFdmVudEhhbmRsZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2NvcmRvdmE6cGF1c2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpcy5hcHAuY2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignY29yZG92YTpyZXN1bWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpcy5hcHAuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIENvcmRvdmE7XG59KCkpO1xuZXhwb3J0cy5Db3Jkb3ZhID0gQ29yZG92YTtcbiIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBDb3JlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb3JlKGRlcHMpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl92ZXJzaW9uID0gJzAuOS4wJztcbiAgICAgICAgdGhpcy5jb25maWcgPSBkZXBzLmNvbmZpZztcbiAgICAgICAgdGhpcy5sb2dnZXIgPSBkZXBzLmxvZ2dlcjtcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gZGVwcy5lbWl0dGVyO1xuICAgICAgICB0aGlzLmluc2lnaHRzID0gZGVwcy5pbnNpZ2h0cztcbiAgICB9XG4gICAgQ29yZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgdGhpcy5vblJlc3VtZSgpO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvcmUucHJvdG90eXBlLCBcInZlcnNpb25cIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl92ZXJzaW9uO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIENvcmUucHJvdG90eXBlLm9uUmVzdW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmluc2lnaHRzLnRyYWNrKCdtb2JpbGVhcHAub3BlbmVkJyk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIENvcmUucHJvdG90eXBlLnJlZ2lzdGVyRXZlbnRIYW5kbGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdjb3Jkb3ZhOnJlc3VtZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF90aGlzLm9uUmVzdW1lKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3B1c2g6bm90aWZpY2F0aW9uJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLm1lc3NhZ2UuYXBwLmFzbGVlcCB8fCBkYXRhLm1lc3NhZ2UuYXBwLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIF90aGlzLmluc2lnaHRzLnRyYWNrKCdtb2JpbGVhcHAub3BlbmVkLnB1c2gnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gQ29yZTtcbn0oKSk7XG5leHBvcnRzLkNvcmUgPSBDb3JlO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcHJvbWlzZV8xID0gcmVxdWlyZSgnLi4vcHJvbWlzZScpO1xudmFyIE5PX1BMVUdJTiA9IG5ldyBFcnJvcignTWlzc2luZyBkZXBsb3kgcGx1Z2luOiBgaW9uaWMtcGx1Z2luLWRlcGxveWAnKTtcbi8qKlxuICogYERlcGxveWAgaGFuZGxlcyBsaXZlIGRlcGxveXMgb2YgdGhlIGFwcC4gRG93bmxvYWRpbmcsIGV4dHJhY3RpbmcsIGFuZFxuICogcm9sbGluZyBiYWNrIHNuYXBzaG90cy5cbiAqXG4gKiBAZmVhdHVyZWRcbiAqL1xudmFyIERlcGxveSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGVwbG95KGRlcHMsIFxuICAgICAgICAvKipcbiAgICAgICAgICogQGhpZGRlblxuICAgICAgICAgKi9cbiAgICAgICAgb3B0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGFjdGl2ZSBkZXBsb3kgY2hhbm5lbC4gU2V0IHRoaXMgdG8gY2hhbmdlIHRoZSBjaGFubmVsIG9uIHdoaWNoXG4gICAgICAgICAqIGBEZXBsb3lgIG9wZXJhdGVzLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jaGFubmVsID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGRlcHMuY29uZmlnO1xuICAgICAgICB0aGlzLmVtaXR0ZXIgPSBkZXBzLmVtaXR0ZXI7XG4gICAgICAgIHRoaXMubG9nZ2VyID0gZGVwcy5sb2dnZXI7XG4gICAgICAgIHRoaXMuZW1pdHRlci5vbmNlKCdkZXZpY2U6cmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuX2dldFBsdWdpbigpKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMucGx1Z2luLmluaXQoX3RoaXMuY29uZmlnLmdldCgnYXBwX2lkJyksIF90aGlzLmNvbmZpZy5nZXRVUkwoJ2FwaScpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGlzLmVtaXR0ZXIuZW1pdCgnZGVwbG95OnJlYWR5Jyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgdXBkYXRlcyBvbiB0aGUgYWN0aXZlIGNoYW5uZWwuXG4gICAgICpcbiAgICAgKiBUaGUgcHJvbWlzZSByZXNvbHZlcyB3aXRoIGEgYm9vbGVhbi4gV2hlbiBgdHJ1ZWAsIGEgbmV3IHNuYXBzaG90IGV4aXN0cyBvblxuICAgICAqIHRoZSBjaGFubmVsLlxuICAgICAqL1xuICAgIERlcGxveS5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIHRoaXMuZW1pdHRlci5vbmNlKCdkZXBsb3k6cmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuX2dldFBsdWdpbigpKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMucGx1Z2luLmNoZWNrKF90aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpLCBfdGhpcy5jaGFubmVsLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0ID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBEZXBsb3k6IGFuIHVwZGF0ZSBpcyBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5sb2dnZXIuaW5mbygnSW9uaWMgRGVwbG95OiBubyB1cGRhdGVzIGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMubG9nZ2VyLmVycm9yKCdJb25pYyBEZXBsb3k6IGVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIGNoZWNraW5nIGZvciB1cGRhdGVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoTk9fUExVR0lOKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgdGhlIGF2YWlsYWJsZSBzbmFwc2hvdC5cbiAgICAgKlxuICAgICAqIFRoaXMgc2hvdWxkIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aFxuICAgICAqIFtgZXh0cmFjdCgpYF0oL2FwaS9jbGllbnQvZGVwbG95LyNleHRyYWN0KS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIE9wdGlvbnMgZm9yIHRoaXMgZG93bmxvYWQsIHN1Y2ggYXMgYSBwcm9ncmVzcyBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBEZXBsb3kucHJvdG90eXBlLmRvd25sb2FkID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdmFyIGRlZmVycmVkID0gbmV3IHByb21pc2VfMS5EZWZlcnJlZFByb21pc2UoKTtcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uY2UoJ2RlcGxveTpyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5fZ2V0UGx1Z2luKCkpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5wbHVnaW4uZG93bmxvYWQoX3RoaXMuY29uZmlnLmdldCgnYXBwX2lkJyksIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5sb2dnZXIuaW5mbygnSW9uaWMgRGVwbG95OiBkb3dubG9hZCBjb21wbGV0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJlc3VsdCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignSW9uaWMgRGVwbG95OiBEb3dubG9hZCBoYXMgZmFpbGVkOiBzZWUgbmF0aXZlIGxvZ3MuJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub25Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Qcm9ncmVzcyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoTk9fUExVR0lOKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCB0aGUgZG93bmxvYWRlZCBzbmFwc2hvdC5cbiAgICAgKlxuICAgICAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBhZnRlciBbYGRvd25sb2FkKClgXSgvYXBpL2NsaWVudC9kZXBsb3kvI2Rvd25sb2FkKVxuICAgICAqIHN1Y2Nlc3NmdWxseSByZXNvbHZlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICovXG4gICAgRGVwbG95LnByb3RvdHlwZS5leHRyYWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdmFyIGRlZmVycmVkID0gbmV3IHByb21pc2VfMS5EZWZlcnJlZFByb21pc2UoKTtcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uY2UoJ2RlcGxveTpyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5fZ2V0UGx1Z2luKCkpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5wbHVnaW4uZXh0cmFjdChfdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09PSAnZG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBEZXBsb3k6IGV4dHJhY3Rpb24gY29tcGxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uUHJvZ3Jlc3MocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KE5PX1BMVUdJTik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEltbWVkaWF0ZWx5IHJlbG9hZCB0aGUgYXBwIHdpdGggdGhlIGxhdGVzdCBkZXBsb3llZCBzbmFwc2hvdC5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgb25seSBuZWNlc3NhcnkgdG8gY2FsbCBpZiB5b3UgaGF2ZSBkb3dubG9hZGVkIGFuZCBleHRyYWN0ZWQgYVxuICAgICAqIHNuYXBzaG90IGFuZCB3aXNoIHRvIGluc3RhbnRseSByZWxvYWQgdGhlIGFwcCB3aXRoIHRoZSBsYXRlc3QgZGVwbG95LiBUaGVcbiAgICAgKiBsYXRlc3QgZGVwbG95IHdpbGwgYXV0b21hdGljYWxseSBiZSBsb2FkZWQgd2hlbiB0aGUgYXBwIGlzIHN0YXJ0ZWQuXG4gICAgICovXG4gICAgRGVwbG95LnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmVtaXR0ZXIub25jZSgnZGVwbG95OnJlYWR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLl9nZXRQbHVnaW4oKSkge1xuICAgICAgICAgICAgICAgIF90aGlzLnBsdWdpbi5yZWRpcmVjdChfdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHNuYXBzaG90LlxuICAgICAqXG4gICAgICogVGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCBhbiBvYmplY3QgdGhhdCBoYXMga2V5L3ZhbHVlIHBhaXJzIHBlcnRhaW5pbmdcbiAgICAgKiB0byB0aGUgY3VycmVudGx5IGRlcGxveWVkIHNuYXBzaG90LlxuICAgICAqL1xuICAgIERlcGxveS5wcm90b3R5cGUuaW5mbyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmVycmVkID0gbmV3IHByb21pc2VfMS5EZWZlcnJlZFByb21pc2UoKTsgLy8gVE9ET1xuICAgICAgICB0aGlzLmVtaXR0ZXIub25jZSgnZGVwbG95OnJlYWR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLl9nZXRQbHVnaW4oKSkge1xuICAgICAgICAgICAgICAgIF90aGlzLnBsdWdpbi5pbmZvKF90aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KE5PX1BMVUdJTik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIExpc3QgdGhlIHNuYXBzaG90cyB0aGF0IGhhdmUgYmVlbiBpbnN0YWxsZWQgb24gdGhpcyBkZXZpY2UuXG4gICAgICpcbiAgICAgKiBUaGUgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIGFuIGFycmF5IG9mIHNuYXBzaG90IFVVSURzLlxuICAgICAqL1xuICAgIERlcGxveS5wcm90b3R5cGUuZ2V0U25hcHNob3RzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpOyAvLyBUT0RPXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbmNlKCdkZXBsb3k6cmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuX2dldFBsdWdpbigpKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMucGx1Z2luLmdldFZlcnNpb25zKF90aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KE5PX1BMVUdJTik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZSBhIHNuYXBzaG90IGZyb20gdGhpcyBkZXZpY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXVpZFxuICAgICAqICBUaGUgc25hcHNob3QgVVVJRCB0byByZW1vdmUgZnJvbSB0aGUgZGV2aWNlLlxuICAgICAqL1xuICAgIERlcGxveS5wcm90b3R5cGUuZGVsZXRlU25hcHNob3QgPSBmdW5jdGlvbiAodXVpZCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpOyAvLyBUT0RPXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbmNlKCdkZXBsb3k6cmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuX2dldFBsdWdpbigpKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMucGx1Z2luLmRlbGV0ZVZlcnNpb24oX3RoaXMuY29uZmlnLmdldCgnYXBwX2lkJyksIHV1aWQsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoTk9fUExVR0lOKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbWV0YWRhdGEgZm9yIGEgZ2l2ZW4gc25hcHNob3QuIElmIG5vIFVVSUQgaXMgZ2l2ZW4sIGl0IHdpbGxcbiAgICAgKiBhdHRlbXB0IHRvIGdyYWIgdGhlIG1ldGFkYXRhIGZvciB0aGUgbW9zdCByZWNlbnRseSBrbm93biBzbmFwc2hvdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB1dWlkXG4gICAgICogIFRoZSBzbmFwc2hvdCBmcm9tIHdoaWNoIHRvIGdyYWIgbWV0YWRhdGEuXG4gICAgICovXG4gICAgRGVwbG95LnByb3RvdHlwZS5nZXRNZXRhZGF0YSA9IGZ1bmN0aW9uICh1dWlkKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7IC8vIFRPRE9cbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uY2UoJ2RlcGxveTpyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5fZ2V0UGx1Z2luKCkpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5wbHVnaW4uZ2V0TWV0YWRhdGEoX3RoaXMuY29uZmlnLmdldCgnYXBwX2lkJyksIHV1aWQsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQubWV0YWRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoTk9fUExVR0lOKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBEZXBsb3kucHJvdG90eXBlLl9nZXRQbHVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93LklvbmljRGVwbG95ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybignSW9uaWMgRGVwbG95OiBEaXNhYmxlZCEgRGVwbG95IHBsdWdpbiBpcyBub3QgaW5zdGFsbGVkIG9yIGhhcyBub3QgbG9hZGVkLiBIYXZlIHlvdSBydW4gYGlvbmljIHBsdWdpbiBhZGQgaW9uaWMtcGx1Z2luLWRlcGxveWAgeWV0PycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4pIHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luID0gd2luZG93LklvbmljRGVwbG95O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnBsdWdpbjtcbiAgICB9O1xuICAgIHJldHVybiBEZXBsb3k7XG59KCkpO1xuZXhwb3J0cy5EZXBsb3kgPSBEZXBsb3k7XG4iLCJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgRGV2aWNlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEZXZpY2UoZGVwcykge1xuICAgICAgICB0aGlzLmRlcHMgPSBkZXBzO1xuICAgICAgICB0aGlzLmVtaXR0ZXIgPSB0aGlzLmRlcHMuZW1pdHRlcjtcbiAgICAgICAgdGhpcy5kZXZpY2VUeXBlID0gdGhpcy5kZXRlcm1pbmVEZXZpY2VUeXBlKCk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudEhhbmRsZXJzKCk7XG4gICAgfVxuICAgIERldmljZS5wcm90b3R5cGUuaXNBbmRyb2lkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2VUeXBlID09PSAnYW5kcm9pZCc7XG4gICAgfTtcbiAgICBEZXZpY2UucHJvdG90eXBlLmlzSU9TID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2VUeXBlID09PSAnaXBob25lJyB8fCB0aGlzLmRldmljZVR5cGUgPT09ICdpcGFkJztcbiAgICB9O1xuICAgIERldmljZS5wcm90b3R5cGUuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICBpZiAodHlwZW9mIG5hdmlnYXRvci5jb25uZWN0aW9uID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAgICAgdHlwZW9mIG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgICAgICB0eXBlb2YgQ29ubmVjdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5zdHJpY3RNb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIENvbm5lY3Rpb24uRVRIRVJORVQ6XG4gICAgICAgICAgICBjYXNlIENvbm5lY3Rpb24uV0lGSTpcbiAgICAgICAgICAgIGNhc2UgQ29ubmVjdGlvbi5DRUxMXzJHOlxuICAgICAgICAgICAgY2FzZSBDb25uZWN0aW9uLkNFTExfM0c6XG4gICAgICAgICAgICBjYXNlIENvbm5lY3Rpb24uQ0VMTF80RzpcbiAgICAgICAgICAgIGNhc2UgQ29ubmVjdGlvbi5DRUxMOlxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgRGV2aWNlLnByb3RvdHlwZS5yZWdpc3RlckV2ZW50SGFuZGxlcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLmRldmljZVR5cGUgPT09ICd1bmtub3duJykge1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RldmljZTpyZWFkeScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLm9uY2UoJ2NvcmRvdmE6ZGV2aWNlcmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuZW1pdHRlci5lbWl0KCdkZXZpY2U6cmVhZHknKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIERldmljZS5wcm90b3R5cGUuZGV0ZXJtaW5lRGV2aWNlVHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFnZW50ID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgICAgdmFyIGlwYWQgPSBhZ2VudC5tYXRjaCgvaVBhZC9pKTtcbiAgICAgICAgaWYgKGlwYWQgJiYgKGlwYWRbMF0udG9Mb3dlckNhc2UoKSA9PT0gJ2lwYWQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdpcGFkJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgaXBob25lID0gYWdlbnQubWF0Y2goL2lQaG9uZS9pKTtcbiAgICAgICAgaWYgKGlwaG9uZSAmJiAoaXBob25lWzBdLnRvTG93ZXJDYXNlKCkgPT09ICdpcGhvbmUnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdpcGhvbmUnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhbmRyb2lkID0gYWdlbnQubWF0Y2goL0FuZHJvaWQvaSk7XG4gICAgICAgIGlmIChhbmRyb2lkICYmIChhbmRyb2lkWzBdLnRvTG93ZXJDYXNlKCkgPT09ICdhbmRyb2lkJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnYW5kcm9pZCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICd1bmtub3duJztcbiAgICB9O1xuICAgIHJldHVybiBEZXZpY2U7XG59KCkpO1xuZXhwb3J0cy5EZXZpY2UgPSBEZXZpY2U7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBfX21ldGFkYXRhID0gKHRoaXMgJiYgdGhpcy5fX21ldGFkYXRhKSB8fCBmdW5jdGlvbiAoaywgdikge1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShrLCB2KTtcbn07XG52YXIgYXV0aF8xID0gcmVxdWlyZSgnLi9hdXRoJyk7XG52YXIgY2xpZW50XzEgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xudmFyIGNvbmZpZ18xID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbnZhciBjb3Jkb3ZhXzEgPSByZXF1aXJlKCcuL2NvcmRvdmEnKTtcbnZhciBjb3JlXzEgPSByZXF1aXJlKCcuL2NvcmUnKTtcbnZhciBkZXBsb3lfMSA9IHJlcXVpcmUoJy4vZGVwbG95L2RlcGxveScpO1xudmFyIGRldmljZV8xID0gcmVxdWlyZSgnLi9kZXZpY2UnKTtcbnZhciBldmVudHNfMSA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG52YXIgaW5zaWdodHNfMSA9IHJlcXVpcmUoJy4vaW5zaWdodHMnKTtcbnZhciBsb2dnZXJfMSA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG52YXIgcHVzaF8xID0gcmVxdWlyZSgnLi9wdXNoL3B1c2gnKTtcbnZhciBzdG9yYWdlXzEgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKTtcbnZhciB1c2VyXzEgPSByZXF1aXJlKCcuL3VzZXIvdXNlcicpO1xudmFyIG1vZHVsZXMgPSB7fTtcbmZ1bmN0aW9uIGNhY2hlKHRhcmdldCwgcHJvcGVydHlLZXksIGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgbWV0aG9kID0gZGVzY3JpcHRvci5nZXQ7XG4gICAgZGVzY3JpcHRvci5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlc1twcm9wZXJ0eUtleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBtZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIG1vZHVsZXNbcHJvcGVydHlLZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1vZHVsZXNbcHJvcGVydHlLZXldO1xuICAgIH07XG4gICAgZGVzY3JpcHRvci5zZXQgPSBmdW5jdGlvbiAodmFsdWUpIHsgfTtcbn1cbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgQ29udGFpbmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb250YWluZXIoKSB7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImFwcFN0YXR1c1wiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgJ2FzbGVlcCc6IGZhbHNlLCAnY2xvc2VkJzogZmFsc2UgfTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwiY29uZmlnXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGNvbmZpZ18xLkNvbmZpZygpO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ29udGFpbmVyLnByb3RvdHlwZSwgXCJldmVudEVtaXR0ZXJcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgZXZlbnRzXzEuRXZlbnRFbWl0dGVyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImxvZ2dlclwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgICAgICAgdmFyIGMgPSB7fTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGMgPSBjb25maWcuc2V0dGluZ3MubG9nZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBsb2dnZXJfMS5Mb2dnZXIoYyk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImxvY2FsU3RvcmFnZVN0cmF0ZWd5XCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHN0b3JhZ2VfMS5Mb2NhbFN0b3JhZ2VTdHJhdGVneSgpO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ29udGFpbmVyLnByb3RvdHlwZSwgXCJzZXNzaW9uU3RvcmFnZVN0cmF0ZWd5XCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHN0b3JhZ2VfMS5TZXNzaW9uU3RvcmFnZVN0cmF0ZWd5KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImF1dGhUb2tlbkNvbnRleHRcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsYWJlbCA9ICdhdXRoXycgKyB0aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBhdXRoXzEuQ29tYmluZWRBdXRoVG9rZW5Db250ZXh0KHtcbiAgICAgICAgICAgICAgICAnc3RvcmFnZSc6IG5ldyBzdG9yYWdlXzEuU3RvcmFnZSh7ICdzdHJhdGVneSc6IHRoaXMubG9jYWxTdG9yYWdlU3RyYXRlZ3kgfSksXG4gICAgICAgICAgICAgICAgJ3RlbXBTdG9yYWdlJzogbmV3IHN0b3JhZ2VfMS5TdG9yYWdlKHsgJ3N0cmF0ZWd5JzogdGhpcy5zZXNzaW9uU3RvcmFnZVN0cmF0ZWd5IH0pXG4gICAgICAgICAgICB9LCBsYWJlbCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImNsaWVudFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBjbGllbnRfMS5DbGllbnQodGhpcy5hdXRoVG9rZW5Db250ZXh0LCB0aGlzLmNvbmZpZy5nZXRVUkwoJ2FwaScpKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwiaW5zaWdodHNcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgaW5zaWdodHNfMS5JbnNpZ2h0cyh7XG4gICAgICAgICAgICAgICAgJ2FwcFN0YXR1cyc6IHRoaXMuYXBwU3RhdHVzLFxuICAgICAgICAgICAgICAgICdzdG9yYWdlJzogbmV3IHN0b3JhZ2VfMS5TdG9yYWdlKHsgJ3N0cmF0ZWd5JzogdGhpcy5sb2NhbFN0b3JhZ2VTdHJhdGVneSB9KSxcbiAgICAgICAgICAgICAgICAnY29uZmlnJzogdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgJ2NsaWVudCc6IHRoaXMuY2xpZW50LFxuICAgICAgICAgICAgICAgICdsb2dnZXInOiB0aGlzLmxvZ2dlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImNvcmVcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgY29yZV8xLkNvcmUoe1xuICAgICAgICAgICAgICAgICdjb25maWcnOiB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgICAgICAnbG9nZ2VyJzogdGhpcy5sb2dnZXIsXG4gICAgICAgICAgICAgICAgJ2VtaXR0ZXInOiB0aGlzLmV2ZW50RW1pdHRlcixcbiAgICAgICAgICAgICAgICAnaW5zaWdodHMnOiB0aGlzLmluc2lnaHRzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwiZGV2aWNlXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGRldmljZV8xLkRldmljZSh7ICdlbWl0dGVyJzogdGhpcy5ldmVudEVtaXR0ZXIgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImNvcmRvdmFcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgY29yZG92YV8xLkNvcmRvdmEoe1xuICAgICAgICAgICAgICAgICdhcHBTdGF0dXMnOiB0aGlzLmFwcFN0YXR1cyxcbiAgICAgICAgICAgICAgICAnZGV2aWNlJzogdGhpcy5kZXZpY2UsXG4gICAgICAgICAgICAgICAgJ2VtaXR0ZXInOiB0aGlzLmV2ZW50RW1pdHRlcixcbiAgICAgICAgICAgICAgICAnbG9nZ2VyJzogdGhpcy5sb2dnZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ29udGFpbmVyLnByb3RvdHlwZSwgXCJ1c2VyQ29udGV4dFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB1c2VyXzEuVXNlckNvbnRleHQoeyAnc3RvcmFnZSc6IG5ldyBzdG9yYWdlXzEuU3RvcmFnZSh7ICdzdHJhdGVneSc6IHRoaXMubG9jYWxTdG9yYWdlU3RyYXRlZ3kgfSksICdjb25maWcnOiB0aGlzLmNvbmZpZyB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwic2luZ2xlVXNlclNlcnZpY2VcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdXNlcl8xLlNpbmdsZVVzZXJTZXJ2aWNlKHsgJ2NsaWVudCc6IHRoaXMuY2xpZW50LCAnY29udGV4dCc6IHRoaXMudXNlckNvbnRleHQgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImF1dGhNb2R1bGVzXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdiYXNpYyc6IG5ldyBhdXRoXzEuQmFzaWNBdXRoKHsgJ2NvbmZpZyc6IHRoaXMuY29uZmlnLCAnY2xpZW50JzogdGhpcy5jbGllbnQgfSksXG4gICAgICAgICAgICAgICAgJ2N1c3RvbSc6IG5ldyBhdXRoXzEuQ3VzdG9tQXV0aCh7ICdjb25maWcnOiB0aGlzLmNvbmZpZywgJ2NsaWVudCc6IHRoaXMuY2xpZW50IH0pLFxuICAgICAgICAgICAgICAgICd0d2l0dGVyJzogbmV3IGF1dGhfMS5Ud2l0dGVyQXV0aCh7ICdjb25maWcnOiB0aGlzLmNvbmZpZywgJ2NsaWVudCc6IHRoaXMuY2xpZW50IH0pLFxuICAgICAgICAgICAgICAgICdmYWNlYm9vayc6IG5ldyBhdXRoXzEuRmFjZWJvb2tBdXRoKHsgJ2NvbmZpZyc6IHRoaXMuY29uZmlnLCAnY2xpZW50JzogdGhpcy5jbGllbnQgfSksXG4gICAgICAgICAgICAgICAgJ2dpdGh1Yic6IG5ldyBhdXRoXzEuR2l0aHViQXV0aCh7ICdjb25maWcnOiB0aGlzLmNvbmZpZywgJ2NsaWVudCc6IHRoaXMuY2xpZW50IH0pLFxuICAgICAgICAgICAgICAgICdnb29nbGUnOiBuZXcgYXV0aF8xLkdvb2dsZUF1dGgoeyAnY29uZmlnJzogdGhpcy5jb25maWcsICdjbGllbnQnOiB0aGlzLmNsaWVudCB9KSxcbiAgICAgICAgICAgICAgICAnaW5zdGFncmFtJzogbmV3IGF1dGhfMS5JbnN0YWdyYW1BdXRoKHsgJ2NvbmZpZyc6IHRoaXMuY29uZmlnLCAnY2xpZW50JzogdGhpcy5jbGllbnQgfSksXG4gICAgICAgICAgICAgICAgJ2xpbmtlZGluJzogbmV3IGF1dGhfMS5MaW5rZWRJbkF1dGgoeyAnY29uZmlnJzogdGhpcy5jb25maWcsICdjbGllbnQnOiB0aGlzLmNsaWVudCB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwiYXV0aFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBhdXRoXzEuQXV0aCh7XG4gICAgICAgICAgICAgICAgJ2NvbmZpZyc6IHRoaXMuY29uZmlnLFxuICAgICAgICAgICAgICAgICdlbWl0dGVyJzogdGhpcy5ldmVudEVtaXR0ZXIsXG4gICAgICAgICAgICAgICAgJ2F1dGhNb2R1bGVzJzogdGhpcy5hdXRoTW9kdWxlcyxcbiAgICAgICAgICAgICAgICAndG9rZW5Db250ZXh0JzogdGhpcy5hdXRoVG9rZW5Db250ZXh0LFxuICAgICAgICAgICAgICAgICd1c2VyU2VydmljZSc6IHRoaXMuc2luZ2xlVXNlclNlcnZpY2UsXG4gICAgICAgICAgICAgICAgJ3N0b3JhZ2UnOiBuZXcgc3RvcmFnZV8xLlN0b3JhZ2UoeyAnc3RyYXRlZ3knOiB0aGlzLmxvY2FsU3RvcmFnZVN0cmF0ZWd5IH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbnRhaW5lci5wcm90b3R5cGUsIFwicHVzaFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgICAgICAgdmFyIGMgPSB7fTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGMgPSBjb25maWcuc2V0dGluZ3MucHVzaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgcHVzaF8xLlB1c2goe1xuICAgICAgICAgICAgICAgICdjb25maWcnOiBjb25maWcsXG4gICAgICAgICAgICAgICAgJ2F1dGgnOiB0aGlzLmF1dGgsXG4gICAgICAgICAgICAgICAgJ3VzZXJTZXJ2aWNlJzogdGhpcy5zaW5nbGVVc2VyU2VydmljZSxcbiAgICAgICAgICAgICAgICAnZGV2aWNlJzogdGhpcy5kZXZpY2UsXG4gICAgICAgICAgICAgICAgJ2NsaWVudCc6IHRoaXMuY2xpZW50LFxuICAgICAgICAgICAgICAgICdlbWl0dGVyJzogdGhpcy5ldmVudEVtaXR0ZXIsXG4gICAgICAgICAgICAgICAgJ3N0b3JhZ2UnOiBuZXcgc3RvcmFnZV8xLlN0b3JhZ2UoeyAnc3RyYXRlZ3knOiB0aGlzLmxvY2FsU3RvcmFnZVN0cmF0ZWd5IH0pLFxuICAgICAgICAgICAgICAgICdsb2dnZXInOiB0aGlzLmxvZ2dlclxuICAgICAgICAgICAgfSwgYyk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb250YWluZXIucHJvdG90eXBlLCBcImRlcGxveVwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBkZXBsb3lfMS5EZXBsb3koe1xuICAgICAgICAgICAgICAgICdjb25maWcnOiB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgICAgICAnZW1pdHRlcic6IHRoaXMuZXZlbnRFbWl0dGVyLFxuICAgICAgICAgICAgICAgICdsb2dnZXInOiB0aGlzLmxvZ2dlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiYXBwU3RhdHVzXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiY29uZmlnXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiZXZlbnRFbWl0dGVyXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwibG9nZ2VyXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwibG9jYWxTdG9yYWdlU3RyYXRlZ3lcIiwgbnVsbCk7XG4gICAgX19kZWNvcmF0ZShbXG4gICAgICAgIGNhY2hlLCBcbiAgICAgICAgX19tZXRhZGF0YSgnZGVzaWduOnR5cGUnLCBPYmplY3QpXG4gICAgXSwgQ29udGFpbmVyLnByb3RvdHlwZSwgXCJzZXNzaW9uU3RvcmFnZVN0cmF0ZWd5XCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiYXV0aFRva2VuQ29udGV4dFwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcImNsaWVudFwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcImluc2lnaHRzXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiY29yZVwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcImRldmljZVwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcImNvcmRvdmFcIiwgbnVsbCk7XG4gICAgX19kZWNvcmF0ZShbXG4gICAgICAgIGNhY2hlLCBcbiAgICAgICAgX19tZXRhZGF0YSgnZGVzaWduOnR5cGUnLCBPYmplY3QpXG4gICAgXSwgQ29udGFpbmVyLnByb3RvdHlwZSwgXCJ1c2VyQ29udGV4dFwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcInNpbmdsZVVzZXJTZXJ2aWNlXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwiYXV0aE1vZHVsZXNcIiwgbnVsbCk7XG4gICAgX19kZWNvcmF0ZShbXG4gICAgICAgIGNhY2hlLCBcbiAgICAgICAgX19tZXRhZGF0YSgnZGVzaWduOnR5cGUnLCBPYmplY3QpXG4gICAgXSwgQ29udGFpbmVyLnByb3RvdHlwZSwgXCJhdXRoXCIsIG51bGwpO1xuICAgIF9fZGVjb3JhdGUoW1xuICAgICAgICBjYWNoZSwgXG4gICAgICAgIF9fbWV0YWRhdGEoJ2Rlc2lnbjp0eXBlJywgT2JqZWN0KVxuICAgIF0sIENvbnRhaW5lci5wcm90b3R5cGUsIFwicHVzaFwiLCBudWxsKTtcbiAgICBfX2RlY29yYXRlKFtcbiAgICAgICAgY2FjaGUsIFxuICAgICAgICBfX21ldGFkYXRhKCdkZXNpZ246dHlwZScsIE9iamVjdClcbiAgICBdLCBDb250YWluZXIucHJvdG90eXBlLCBcImRlcGxveVwiLCBudWxsKTtcbiAgICByZXR1cm4gQ29udGFpbmVyO1xufSgpKTtcbmV4cG9ydHMuQ29udGFpbmVyID0gQ29udGFpbmVyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgRXhjZXB0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRXhjZXB0aW9uLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLm5hbWUgPSAnRXhjZXB0aW9uJztcbiAgICAgICAgdGhpcy5zdGFjayA9IChuZXcgRXJyb3IoKSkuc3RhY2s7XG4gICAgfVxuICAgIEV4Y2VwdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyBcIjogXCIgKyB0aGlzLm1lc3NhZ2U7XG4gICAgfTtcbiAgICByZXR1cm4gRXhjZXB0aW9uO1xufShFcnJvcikpO1xuZXhwb3J0cy5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4vKipcbiAqIEFuIGVycm9yIHdpdGggZ2VuZXJpYyBlcnJvciBkZXRhaWxzLlxuICpcbiAqIEVycm9yIGRldGFpbHMgY2FuIGJlIGV4dHJhY3RlZCBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgYERgLiBGb3IgaW5zdGFuY2UsXG4gKiBpZiB0aGUgdHlwZSBvZiBgRGAgaXMgYHN0cmluZ1tdYCwgeW91IGNhbiBkbyB0aGlzOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGZ1bmN0aW9uIGhhbmRsZUVycm9yKGVycjogSURldGFpbGVkRXJyb3I8c3RyaW5nW10+KSB7XG4gKiAgIGZvciAobGV0IGkgaW4gZXJyLmRldGFpbHMpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKCdnb3QgZXJyb3IgY29kZTogJyArIGkpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAZmVhdHVyZWRcbiAqL1xudmFyIERldGFpbGVkRXJyb3IgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhEZXRhaWxlZEVycm9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIERldGFpbGVkRXJyb3IoXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICovXG4gICAgICAgIG1lc3NhZ2UsIFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGVycm9yIGRldGFpbHMuXG4gICAgICAgICAqL1xuICAgICAgICBkZXRhaWxzKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLmRldGFpbHMgPSBkZXRhaWxzO1xuICAgICAgICB0aGlzLm5hbWUgPSAnRGV0YWlsZWRFcnJvcic7XG4gICAgfVxuICAgIHJldHVybiBEZXRhaWxlZEVycm9yO1xufShFeGNlcHRpb24pKTtcbmV4cG9ydHMuRGV0YWlsZWRFcnJvciA9IERldGFpbGVkRXJyb3I7XG4iLCJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogQSByZWdpc3RlcmVkIGV2ZW50IHJlY2VpdmVyLlxuICovXG52YXIgRXZlbnRSZWNlaXZlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRXZlbnRSZWNlaXZlcihcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFuIHJlZ2lzdGVyZWQgaWRlbnRpZmllciBmb3IgdGhpcyBldmVudCByZWNlaXZlci5cbiAgICAgICAgICovXG4gICAgICAgIGtleSwgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgcmVnaXN0ZXJlZCBuYW1lIG9mIHRoZSBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgIGV2ZW50LCBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBhY3R1YWwgY2FsbGJhY2suXG4gICAgICAgICAqL1xuICAgICAgICBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMua2V5ID0ga2V5O1xuICAgICAgICB0aGlzLmV2ZW50ID0gZXZlbnQ7XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gICAgfVxuICAgIHJldHVybiBFdmVudFJlY2VpdmVyO1xufSgpKTtcbmV4cG9ydHMuRXZlbnRSZWNlaXZlciA9IEV2ZW50UmVjZWl2ZXI7XG4vKipcbiAqIFN0b3JlcyBjYWxsYmFja3MgZm9yIHJlZ2lzdGVyZWQgZXZlbnRzLlxuICovXG52YXIgRXZlbnRFbWl0dGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5uID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmV2ZW50UmVjZWl2ZXJzID0ge307XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5ldmVudHNFbWl0dGVkID0ge307XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGFuIGV2ZW50IGNhbGxiYWNrIHdoaWNoIGdldHMgdHJpZ2dlcmVkIGV2ZXJ5IHRpbWUgdGhlIGV2ZW50IGlzXG4gICAgICogZmlyZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiAgVGhlIGV2ZW50IG5hbWUuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIEEgY2FsbGJhY2sgdG8gYXR0YWNoIHRvIHRoaXMgZXZlbnQuXG4gICAgICovXG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmV2ZW50UmVjZWl2ZXJzW2V2ZW50XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRSZWNlaXZlcnNbZXZlbnRdID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlY2VpdmVyID0gbmV3IEV2ZW50UmVjZWl2ZXIodGhpcy5uLCBldmVudCwgY2FsbGJhY2spO1xuICAgICAgICB0aGlzLm4rKztcbiAgICAgICAgdGhpcy5ldmVudFJlY2VpdmVyc1tldmVudF1bcmVjZWl2ZXIua2V5XSA9IHJlY2VpdmVyO1xuICAgICAgICByZXR1cm4gcmVjZWl2ZXI7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVbnJlZ2lzdGVyIGFuIGV2ZW50IHJlY2VpdmVyIHJldHVybmVkIGZyb21cbiAgICAgKiBbYG9uKClgXSgvYXBpL2NsaWVudC9ldmVudGVtaXR0ZXIjb24pLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlY2VpdmVyXG4gICAgICogIFRoZSBldmVudCByZWNlaXZlci5cbiAgICAgKi9cbiAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIChyZWNlaXZlcikge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuZXZlbnRSZWNlaXZlcnNbcmVjZWl2ZXIuZXZlbnRdID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAgICAgdHlwZW9mIHRoaXMuZXZlbnRSZWNlaXZlcnNbcmVjZWl2ZXIuZXZlbnRdW3JlY2VpdmVyLmtleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gZXZlbnQgcmVjZWl2ZXInKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5ldmVudFJlY2VpdmVyc1tyZWNlaXZlci5ldmVudF1bcmVjZWl2ZXIua2V5XTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGFuIGV2ZW50IGNhbGxiYWNrIHRoYXQgZ2V0cyB0cmlnZ2VyZWQgb25seSBvbmNlLiBJZiB0aGUgZXZlbnQgd2FzXG4gICAgICogdHJpZ2dlcmVkIGJlZm9yZSB5b3VyIGNhbGxiYWNrIGlzIHJlZ2lzdGVyZWQsIGl0IGNhbGxzIHlvdXIgY2FsbGJhY2tcbiAgICAgKiBpbW1lZGlhdGVseS5cbiAgICAgKlxuICAgICAqIEBub3RlIFRPRE86IEZpeCB0aGUgZG9jcyBmb3IgKCkgPT4gdm9pZCBzeW50YXguXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiAgVGhlIGV2ZW50IG5hbWUuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIEEgY2FsbGJhY2sgdG8gYXR0YWNoIHRvIHRoaXMgZXZlbnQuIEl0IHRha2VzIG5vIGFyZ3VtZW50cy5cbiAgICAgKi9cbiAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLmVtaXR0ZWQoZXZlbnQpKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5vbihldmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghX3RoaXMuZW1pdHRlZChldmVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogVHJpZ2dlciBhbiBldmVudC4gQ2FsbCBhbGwgY2FsbGJhY2tzIGluIHRoZSBvcmRlciB0aGV5IHdlcmUgcmVnaXN0ZXJlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBldmVudFxuICAgICAqICBUaGUgZXZlbnQgbmFtZS5cbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqICBBbiBvYmplY3QgdG8gcGFzcyB0byBldmVyeSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IHZvaWQgMCkgeyBkYXRhID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuZXZlbnRSZWNlaXZlcnNbZXZlbnRdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhpcy5ldmVudFJlY2VpdmVyc1tldmVudF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuZXZlbnRzRW1pdHRlZFtldmVudF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50c0VtaXR0ZWRbZXZlbnRdID0gMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBrIGluIHRoaXMuZXZlbnRSZWNlaXZlcnNbZXZlbnRdKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50UmVjZWl2ZXJzW2V2ZW50XVtrXS5oYW5kbGVyKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZXZlbnRzRW1pdHRlZFtldmVudF0gKz0gMTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJldHVybiBhIGNvdW50IG9mIHRoZSBudW1iZXIgb2YgdGltZXMgYW4gZXZlbnQgaGFzIGJlZW4gdHJpZ2dlcmVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogIFRoZSBldmVudCBuYW1lLlxuICAgICAqL1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdHRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuZXZlbnRzRW1pdHRlZFtldmVudF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5ldmVudHNFbWl0dGVkW2V2ZW50XTtcbiAgICB9O1xuICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG59KCkpO1xuZXhwb3J0cy5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBhdXRoXzEgPSByZXF1aXJlKCcuL2F1dGgnKTtcbmV4cG9ydHMuQXV0aCA9IGF1dGhfMS5BdXRoO1xuZXhwb3J0cy5BdXRoVHlwZSA9IGF1dGhfMS5BdXRoVHlwZTtcbmV4cG9ydHMuQmFzaWNBdXRoID0gYXV0aF8xLkJhc2ljQXV0aDtcbmV4cG9ydHMuQ3VzdG9tQXV0aCA9IGF1dGhfMS5DdXN0b21BdXRoO1xuZXhwb3J0cy5GYWNlYm9va0F1dGggPSBhdXRoXzEuRmFjZWJvb2tBdXRoO1xuZXhwb3J0cy5HaXRodWJBdXRoID0gYXV0aF8xLkdpdGh1YkF1dGg7XG5leHBvcnRzLkdvb2dsZUF1dGggPSBhdXRoXzEuR29vZ2xlQXV0aDtcbmV4cG9ydHMuSW5zdGFncmFtQXV0aCA9IGF1dGhfMS5JbnN0YWdyYW1BdXRoO1xuZXhwb3J0cy5MaW5rZWRJbkF1dGggPSBhdXRoXzEuTGlua2VkSW5BdXRoO1xuZXhwb3J0cy5Ud2l0dGVyQXV0aCA9IGF1dGhfMS5Ud2l0dGVyQXV0aDtcbnZhciBjbGllbnRfMSA9IHJlcXVpcmUoJy4vY2xpZW50Jyk7XG5leHBvcnRzLkNsaWVudCA9IGNsaWVudF8xLkNsaWVudDtcbnZhciBjb25maWdfMSA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG5leHBvcnRzLkNvbmZpZyA9IGNvbmZpZ18xLkNvbmZpZztcbnZhciBjb3Jkb3ZhXzEgPSByZXF1aXJlKCcuL2NvcmRvdmEnKTtcbmV4cG9ydHMuQ29yZG92YSA9IGNvcmRvdmFfMS5Db3Jkb3ZhO1xudmFyIGNvcmVfMSA9IHJlcXVpcmUoJy4vY29yZScpO1xuZXhwb3J0cy5Db3JlID0gY29yZV8xLkNvcmU7XG52YXIgZGVwbG95XzEgPSByZXF1aXJlKCcuL2RlcGxveS9kZXBsb3knKTtcbmV4cG9ydHMuRGVwbG95ID0gZGVwbG95XzEuRGVwbG95O1xudmFyIGRldmljZV8xID0gcmVxdWlyZSgnLi9kZXZpY2UnKTtcbmV4cG9ydHMuRGV2aWNlID0gZGV2aWNlXzEuRGV2aWNlO1xudmFyIGVycm9yc18xID0gcmVxdWlyZSgnLi9lcnJvcnMnKTtcbmV4cG9ydHMuRXhjZXB0aW9uID0gZXJyb3JzXzEuRXhjZXB0aW9uO1xuZXhwb3J0cy5EZXRhaWxlZEVycm9yID0gZXJyb3JzXzEuRGV0YWlsZWRFcnJvcjtcbnZhciBkaV8xID0gcmVxdWlyZSgnLi9kaScpO1xuZXhwb3J0cy5ESUNvbnRhaW5lciA9IGRpXzEuQ29udGFpbmVyO1xudmFyIGV2ZW50c18xID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbmV4cG9ydHMuRXZlbnRFbWl0dGVyID0gZXZlbnRzXzEuRXZlbnRFbWl0dGVyO1xudmFyIGluc2lnaHRzXzEgPSByZXF1aXJlKCcuL2luc2lnaHRzJyk7XG5leHBvcnRzLkluc2lnaHRzID0gaW5zaWdodHNfMS5JbnNpZ2h0cztcbnZhciBsb2dnZXJfMSA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5leHBvcnRzLkxvZ2dlciA9IGxvZ2dlcl8xLkxvZ2dlcjtcbnZhciBwdXNoXzEgPSByZXF1aXJlKCcuL3B1c2gvcHVzaCcpO1xuZXhwb3J0cy5QdXNoID0gcHVzaF8xLlB1c2g7XG52YXIgbWVzc2FnZV8xID0gcmVxdWlyZSgnLi9wdXNoL21lc3NhZ2UnKTtcbmV4cG9ydHMuUHVzaE1lc3NhZ2UgPSBtZXNzYWdlXzEuUHVzaE1lc3NhZ2U7XG52YXIgc3RvcmFnZV8xID0gcmVxdWlyZSgnLi9zdG9yYWdlJyk7XG5leHBvcnRzLlN0b3JhZ2UgPSBzdG9yYWdlXzEuU3RvcmFnZTtcbmV4cG9ydHMuTG9jYWxTdG9yYWdlU3RyYXRlZ3kgPSBzdG9yYWdlXzEuTG9jYWxTdG9yYWdlU3RyYXRlZ3k7XG5leHBvcnRzLlNlc3Npb25TdG9yYWdlU3RyYXRlZ3kgPSBzdG9yYWdlXzEuU2Vzc2lvblN0b3JhZ2VTdHJhdGVneTtcbnZhciB1c2VyXzEgPSByZXF1aXJlKCcuL3VzZXIvdXNlcicpO1xuZXhwb3J0cy5Vc2VyQ29udGV4dCA9IHVzZXJfMS5Vc2VyQ29udGV4dDtcbmV4cG9ydHMuVXNlciA9IHVzZXJfMS5Vc2VyO1xuZXhwb3J0cy5TaW5nbGVVc2VyU2VydmljZSA9IHVzZXJfMS5TaW5nbGVVc2VyU2VydmljZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBTdGF0ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdGF0KGFwcElkLCBzdGF0LCB2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgPT09IHZvaWQgMCkgeyB2YWx1ZSA9IDE7IH1cbiAgICAgICAgdGhpcy5hcHBJZCA9IGFwcElkO1xuICAgICAgICB0aGlzLnN0YXQgPSBzdGF0O1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuYXBwSWQgPSBhcHBJZDtcbiAgICAgICAgdGhpcy5zdGF0ID0gc3RhdDtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLmNyZWF0ZWQgPSBuZXcgRGF0ZSgpO1xuICAgIH1cbiAgICBTdGF0LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcHBfaWQ6IHRoaXMuYXBwSWQsXG4gICAgICAgICAgICBzdGF0OiB0aGlzLnN0YXQsXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy52YWx1ZSxcbiAgICAgICAgICAgIGNyZWF0ZWQ6IHRoaXMuY3JlYXRlZC50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgIH07XG4gICAgcmV0dXJuIFN0YXQ7XG59KCkpO1xuZXhwb3J0cy5TdGF0ID0gU3RhdDtcbi8qKlxuICogQSBjbGllbnQgZm9yIEluc2lnaHRzIHRoYXQgaGFuZGxlcyBiYXRjaGluZywgdXNlciBhY3Rpdml0eSBpbnNpZ2h0LCBhbmRcbiAqIHNlbmRpbmcgaW5zaWdodHMgYXQgYW4gaW50ZXJ2YWwuXG4gKlxuICogQGhpZGRlblxuICovXG52YXIgSW5zaWdodHMgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEluc2lnaHRzKGRlcHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge1xuICAgICAgICAgICAgJ2ludGVydmFsU3VibWl0JzogNjAgKiAxMDAwLFxuICAgICAgICAgICAgJ2ludGVydmFsQWN0aXZlQ2hlY2snOiAxMDAwLFxuICAgICAgICAgICAgJ3N1Ym1pdENvdW50JzogMTAwXG4gICAgICAgIH07IH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy5hcHAgPSBkZXBzLmFwcFN0YXR1cztcbiAgICAgICAgdGhpcy5zdG9yYWdlID0gZGVwcy5zdG9yYWdlO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGRlcHMuY29uZmlnO1xuICAgICAgICB0aGlzLmNsaWVudCA9IGRlcHMuY2xpZW50O1xuICAgICAgICB0aGlzLmxvZ2dlciA9IGRlcHMubG9nZ2VyO1xuICAgICAgICB0aGlzLmJhdGNoID0gW107XG4gICAgICAgIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF90aGlzLnN1Ym1pdCgpO1xuICAgICAgICB9LCB0aGlzLm9wdGlvbnMuaW50ZXJ2YWxTdWJtaXQpO1xuICAgICAgICBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIV90aGlzLmFwcC5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5jaGVja0FjdGl2aXR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMub3B0aW9ucy5pbnRlcnZhbEFjdGl2ZUNoZWNrKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVHJhY2sgYW4gaW5zaWdodC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0IC0gVGhlIGluc2lnaHQgbmFtZS5cbiAgICAgKiBAcGFyYW0gdmFsdWUgLSBUaGUgbnVtYmVyIGJ5IHdoaWNoIHRvIGluY3JlbWVudCB0aGlzIGluc2lnaHQuXG4gICAgICovXG4gICAgSW5zaWdodHMucHJvdG90eXBlLnRyYWNrID0gZnVuY3Rpb24gKHN0YXQsIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7IHZhbHVlID0gMTsgfVxuICAgICAgICB0aGlzLnRyYWNrU3RhdChuZXcgU3RhdCh0aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpLCBzdGF0LCB2YWx1ZSkpO1xuICAgIH07XG4gICAgSW5zaWdodHMucHJvdG90eXBlLmNoZWNrQWN0aXZpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXNzaW9uID0gdGhpcy5zdG9yYWdlLmdldCgnaW5zaWdodHNfc2Vzc2lvbicpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICAgIHRoaXMubWFya0FjdGl2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZShzZXNzaW9uKTtcbiAgICAgICAgICAgIHZhciBob3VyID0gNjAgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBpZiAoZC5nZXRUaW1lKCkgKyBob3VyIDwgbmV3IERhdGUoKS5nZXRUaW1lKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1hcmtBY3RpdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgSW5zaWdodHMucHJvdG90eXBlLm1hcmtBY3RpdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3RvcmFnZS5zZXQoJ2luc2lnaHRzX3Nlc3Npb24nLCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1xuICAgICAgICB0aGlzLnRyYWNrKCdtb2JpbGVhcHAuYWN0aXZlJyk7XG4gICAgfTtcbiAgICBJbnNpZ2h0cy5wcm90b3R5cGUudHJhY2tTdGF0ID0gZnVuY3Rpb24gKHN0YXQpIHtcbiAgICAgICAgdGhpcy5iYXRjaC5wdXNoKHN0YXQpO1xuICAgICAgICBpZiAodGhpcy5zaG91bGRTdWJtaXQoKSkge1xuICAgICAgICAgICAgdGhpcy5zdWJtaXQoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgSW5zaWdodHMucHJvdG90eXBlLnNob3VsZFN1Ym1pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmF0Y2gubGVuZ3RoID49IHRoaXMub3B0aW9ucy5zdWJtaXRDb3VudDtcbiAgICB9O1xuICAgIEluc2lnaHRzLnByb3RvdHlwZS5zdWJtaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLmJhdGNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnNpZ2h0cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gdGhpcy5iYXRjaDsgX2kgPCBfYS5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHZhciBzdGF0ID0gX2FbX2ldO1xuICAgICAgICAgICAgaW5zaWdodHMucHVzaChzdGF0LnRvSlNPTigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsaWVudC5wb3N0KCcvaW5zaWdodHMnKVxuICAgICAgICAgICAgLnNlbmQoeyAnaW5zaWdodHMnOiBpbnNpZ2h0cyB9KVxuICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5sb2dnZXIuZXJyb3IoJ0lvbmljIEluc2lnaHRzOiBDb3VsZCBub3Qgc2VuZCBpbnNpZ2h0cy4nLCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5iYXRjaCA9IFtdO1xuICAgIH07XG4gICAgcmV0dXJuIEluc2lnaHRzO1xufSgpKTtcbmV4cG9ydHMuSW5zaWdodHMgPSBJbnNpZ2h0cztcbiIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBTaW1wbGUgY29uc29sZSBsb2dnZXIuXG4gKi9cbnZhciBMb2dnZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIExvZ2dlcihvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgZnVuY3Rpb24gdG8gdXNlIHRvIGxvZyBpbmZvIGxldmVsIG1lc3NhZ2VzLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pbmZvZm4gPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGZ1bmN0aW9uIHRvIHVzZSB0byBsb2cgd2FybiBsZXZlbCBtZXNzYWdlcy5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2FybmZuID0gY29uc29sZS53YXJuLmJpbmQoY29uc29sZSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgZnVuY3Rpb24gdG8gdXNlIHRvIGxvZyBlcnJvciBsZXZlbCBtZXNzYWdlcy5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXJyb3JmbiA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZCBhIGxvZyBhdCBpbmZvIGxldmVsLlxuICAgICAqXG4gICAgICogQG5vdGUgVE9ETzogRml4IG9wdGlvbmFsUGFyYW1zIGluIGRvY3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIHRvIGxvZy5cbiAgICAgKi9cbiAgICBMb2dnZXIucHJvdG90eXBlLmluZm8gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICB2YXIgb3B0aW9uYWxQYXJhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAxOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIG9wdGlvbmFsUGFyYW1zW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgdGhpcy5pbmZvZm4uYXBwbHkodGhpcywgW21lc3NhZ2VdLmNvbmNhdChvcHRpb25hbFBhcmFtcykpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZW5kIGEgbG9nIGF0IHdhcm4gbGV2ZWwuXG4gICAgICpcbiAgICAgKiBAbm90ZSBUT0RPOiBGaXggb3B0aW9uYWxQYXJhbXMgaW4gZG9jcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2UgdG8gbG9nLlxuICAgICAqL1xuICAgIExvZ2dlci5wcm90b3R5cGUud2FybiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIHZhciBvcHRpb25hbFBhcmFtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDE7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgb3B0aW9uYWxQYXJhbXNbX2kgLSAxXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLndhcm5mbi5hcHBseSh0aGlzLCBbbWVzc2FnZV0uY29uY2F0KG9wdGlvbmFsUGFyYW1zKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNlbmQgYSBsb2cgYXQgZXJyb3IgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBAbm90ZSBUT0RPOiBGaXggb3B0aW9uYWxQYXJhbXMgaW4gZG9jcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2UgdG8gbG9nLlxuICAgICAqL1xuICAgIExvZ2dlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICB2YXIgb3B0aW9uYWxQYXJhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAxOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIG9wdGlvbmFsUGFyYW1zW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZXJyb3Jmbi5hcHBseSh0aGlzLCBbbWVzc2FnZV0uY29uY2F0KG9wdGlvbmFsUGFyYW1zKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTG9nZ2VyO1xufSgpKTtcbmV4cG9ydHMuTG9nZ2VyID0gTG9nZ2VyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIEBoaWRkZW5cbiAqL1xudmFyIERlZmVycmVkUHJvbWlzZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGVmZXJyZWRQcm9taXNlKCkge1xuICAgICAgICB0aGlzLmluaXQoKTtcbiAgICB9XG4gICAgRGVmZXJyZWRQcm9taXNlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgICAgIF90aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gRGVmZXJyZWRQcm9taXNlO1xufSgpKTtcbmV4cG9ydHMuRGVmZXJyZWRQcm9taXNlID0gRGVmZXJyZWRQcm9taXNlO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIFJlcHJlc2VudHMgYSBwdXNoIG5vdGlmaWNhdGlvbiBzZW50IHRvIHRoZSBkZXZpY2UuXG4gKlxuICogQGZlYXR1cmVkXG4gKi9cbnZhciBQdXNoTWVzc2FnZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUHVzaE1lc3NhZ2UoKSB7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIFB1c2hNZXNzYWdlIGZyb20gdGhlIHB1c2ggcGx1Z2luJ3MgZm9ybWF0LlxuICAgICAqXG4gICAgICogQGhpZGRlblxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEgLSBUaGUgcGx1Z2luJ3Mgbm90aWZpY2F0aW9uIG9iamVjdC5cbiAgICAgKi9cbiAgICBQdXNoTWVzc2FnZS5mcm9tUGx1Z2luRGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gbmV3IFB1c2hNZXNzYWdlKCk7XG4gICAgICAgIG1lc3NhZ2UucmF3ID0gZGF0YTtcbiAgICAgICAgbWVzc2FnZS50ZXh0ID0gZGF0YS5tZXNzYWdlO1xuICAgICAgICBtZXNzYWdlLnRpdGxlID0gZGF0YS50aXRsZTtcbiAgICAgICAgbWVzc2FnZS5jb3VudCA9IGRhdGEuY291bnQ7XG4gICAgICAgIG1lc3NhZ2Uuc291bmQgPSBkYXRhLnNvdW5kO1xuICAgICAgICBtZXNzYWdlLmltYWdlID0gZGF0YS5pbWFnZTtcbiAgICAgICAgbWVzc2FnZS5hcHAgPSB7XG4gICAgICAgICAgICAnYXNsZWVwJzogIWRhdGEuYWRkaXRpb25hbERhdGEuZm9yZWdyb3VuZCxcbiAgICAgICAgICAgICdjbG9zZWQnOiBkYXRhLmFkZGl0aW9uYWxEYXRhLmNvbGRzdGFydFxuICAgICAgICB9O1xuICAgICAgICBtZXNzYWdlLnBheWxvYWQgPSBkYXRhLmFkZGl0aW9uYWxEYXRhWydwYXlsb2FkJ107XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH07XG4gICAgUHVzaE1lc3NhZ2UucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCI8UHVzaE1lc3NhZ2UgW1xcXCJcIiArIHRoaXMudGl0bGUgKyBcIlxcXCJdPlwiO1xuICAgIH07XG4gICAgcmV0dXJuIFB1c2hNZXNzYWdlO1xufSgpKTtcbmV4cG9ydHMuUHVzaE1lc3NhZ2UgPSBQdXNoTWVzc2FnZTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIHByb21pc2VfMSA9IHJlcXVpcmUoJy4uL3Byb21pc2UnKTtcbnZhciBtZXNzYWdlXzEgPSByZXF1aXJlKCcuL21lc3NhZ2UnKTtcbi8qKlxuICogYFB1c2hgIGhhbmRsZXMgcHVzaCBub3RpZmljYXRpb25zIGZvciB0aGlzIGFwcC5cbiAqXG4gKiBAZmVhdHVyZWRcbiAqL1xudmFyIFB1c2ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFB1c2goZGVwcywgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYmxvY2tSZWdpc3RyYXRpb24gPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmJsb2NrVW5yZWdpc3RlciA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYmxvY2tTYXZlVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlZ2lzdGVyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jb25maWcgPSBkZXBzLmNvbmZpZztcbiAgICAgICAgdGhpcy5hdXRoID0gZGVwcy5hdXRoO1xuICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlID0gZGVwcy51c2VyU2VydmljZTtcbiAgICAgICAgdGhpcy5kZXZpY2UgPSBkZXBzLmRldmljZTtcbiAgICAgICAgdGhpcy5jbGllbnQgPSBkZXBzLmNsaWVudDtcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gZGVwcy5lbWl0dGVyO1xuICAgICAgICB0aGlzLnN0b3JhZ2UgPSBkZXBzLnN0b3JhZ2U7XG4gICAgICAgIHRoaXMubG9nZ2VyID0gZGVwcy5sb2dnZXI7XG4gICAgICAgIC8vIENoZWNrIGZvciB0aGUgcmVxdWlyZWQgdmFsdWVzIHRvIHVzZSB0aGlzIHNlcnZpY2VcbiAgICAgICAgaWYgKHRoaXMuZGV2aWNlLmlzQW5kcm9pZCgpICYmICF0aGlzLm9wdGlvbnMuc2VuZGVyX2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignSW9uaWMgUHVzaDogR0NNIHByb2plY3QgbnVtYmVyIG5vdCBmb3VuZCAoaHR0cDovL2RvY3MuaW9uaWMuaW8vZG9jcy9wdXNoLWFuZHJvaWQtc2V0dXApJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnBsdWdpbkNvbmZpZykge1xuICAgICAgICAgICAgb3B0aW9ucy5wbHVnaW5Db25maWcgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kZXZpY2UuaXNBbmRyb2lkKCkpIHtcbiAgICAgICAgICAgIC8vIGluamVjdCBnY20ga2V5IGZvciBQdXNoUGx1Z2luXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGx1Z2luQ29uZmlnLmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnBsdWdpbkNvbmZpZy5hbmRyb2lkID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGx1Z2luQ29uZmlnLmFuZHJvaWQuc2VuZGVySUQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnBsdWdpbkNvbmZpZy5hbmRyb2lkLnNlbmRlcklEID0gdGhpcy5vcHRpb25zLnNlbmRlcl9pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHVzaC5wcm90b3R5cGUsIFwidG9rZW5cIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fdG9rZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90b2tlbiA9IHRoaXMuc3RvcmFnZS5nZXQoJ3B1c2hfdG9rZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90b2tlbjtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICBpZiAoIXZhbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmFnZS5kZWxldGUoJ3B1c2hfdG9rZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmFnZS5zZXQoJ3B1c2hfdG9rZW4nLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fdG9rZW4gPSB2YWw7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIGEgdG9rZW4gd2l0aCB0aGUgQVBJLlxuICAgICAqXG4gICAgICogV2hlbiBhIHRva2VuIGlzIHNhdmVkLCB5b3UgY2FuIHNlbmQgcHVzaCBub3RpZmljYXRpb25zIHRvIGl0LiBJZiBhIHVzZXIgaXNcbiAgICAgKiBsb2dnZWQgaW4sIHRoZSB0b2tlbiBpcyBsaW5rZWQgdG8gdGhlbSBieSB0aGVpciBJRC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbiAtIFRoZSB0b2tlbi5cbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqL1xuICAgIFB1c2gucHJvdG90eXBlLnNhdmVUb2tlbiA9IGZ1bmN0aW9uICh0b2tlbiwgb3B0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICB2YXIgdG9rZW5EYXRhID0ge1xuICAgICAgICAgICAgJ3Rva2VuJzogdG9rZW4udG9rZW4sXG4gICAgICAgICAgICAnYXBwX2lkJzogdGhpcy5jb25maWcuZ2V0KCdhcHBfaWQnKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIW9wdGlvbnMuaWdub3JlX3VzZXIpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gdGhpcy51c2VyU2VydmljZS5jdXJyZW50KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5hdXRoLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5EYXRhLnVzZXJfaWQgPSB1c2VyLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5ibG9ja1NhdmVUb2tlbikge1xuICAgICAgICAgICAgdGhpcy5jbGllbnQucG9zdCgnL3B1c2gvdG9rZW5zJylcbiAgICAgICAgICAgICAgICAuc2VuZCh0b2tlbkRhdGEpXG4gICAgICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmJsb2NrU2F2ZVRva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5lcnJvcignSW9uaWMgUHVzaDonLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmJsb2NrU2F2ZVRva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBQdXNoOiBzYXZlZCBwdXNoIHRva2VuOiAnICsgdG9rZW4udG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW5EYXRhLnVzZXJfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBQdXNoOiBhZGRlZCBwdXNoIHRva2VuIHRvIHVzZXI6ICcgKyB0b2tlbkRhdGEudXNlcl9pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uaWQgPSByZXMuYm9keS5kYXRhLmlkO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gcmVzLmJvZHkuZGF0YS50eXBlO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5zYXZlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignQSB0b2tlbiBzYXZlIG9wZXJhdGlvbiBpcyBhbHJlYWR5IGluIHByb2dyZXNzLicpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVycyB0aGUgZGV2aWNlIHdpdGggR0NNL0FQTlMgdG8gZ2V0IGEgcHVzaCB0b2tlbi5cbiAgICAgKlxuICAgICAqIEFmdGVyIGEgZGV2aWNlIGlzIHJlZ2lzdGVyZWQsIHlvdSB3aWxsIGxpa2VseSB3YW50IHRvIHNhdmUgdGhlIHRva2VuIHdpdGhcbiAgICAgKiBbYHNhdmVUb2tlbigpYF0oL2FwaS9jbGllbnQvcHVzaC8jc2F2ZVRva2VuKSB0byB0aGUgQVBJLlxuICAgICAqL1xuICAgIFB1c2gucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICBpZiAodGhpcy5ibG9ja1JlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignQW5vdGhlciByZWdpc3RyYXRpb24gaXMgYWxyZWFkeSBpbiBwcm9ncmVzcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmJsb2NrUmVnaXN0cmF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5vbmNlKCdkZXZpY2U6cmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHB1c2hQbHVnaW4gPSBfdGhpcy5fZ2V0UHVzaFBsdWdpbigpO1xuICAgICAgICAgICAgICAgIGlmIChwdXNoUGx1Z2luKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnBsdWdpbiA9IHB1c2hQbHVnaW4uaW5pdChfdGhpcy5vcHRpb25zLnBsdWdpbkNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnBsdWdpbi5vbigncmVnaXN0cmF0aW9uJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmJsb2NrUmVnaXN0cmF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy50b2tlbiA9IHsgJ3Rva2VuJzogZGF0YS5yZWdpc3RyYXRpb25JZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMudG9rZW4ucmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKF90aGlzLnRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxsYmFja1JlZ2lzdHJhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5yZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoJ1B1c2ggcGx1Z2luIG5vdCBmb3VuZCEgU2VlIGxvZ3MuJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSW52YWxpZGF0ZSB0aGUgY3VycmVudCBwdXNoIHRva2VuLlxuICAgICAqL1xuICAgIFB1c2gucHJvdG90eXBlLnVucmVnaXN0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIGlmICghdGhpcy5ibG9ja1VucmVnaXN0ZXIpIHtcbiAgICAgICAgICAgIHZhciBwdXNoVG9rZW5fMSA9IHRoaXMudG9rZW47XG4gICAgICAgICAgICBpZiAoIXB1c2hUb2tlbl8xKSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ3Rva2VuJzogcHVzaFRva2VuXzEudG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICdhcHBfaWQnOiB0aGlzLmNvbmZpZy5nZXQoJ2FwcF9pZCcpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4udW5yZWdpc3RlcihmdW5jdGlvbiAoKSB7IH0sIGZ1bmN0aW9uICgpIHsgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50LnBvc3QoJy9wdXNoL3Rva2Vucy9pbnZhbGlkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLnNlbmQodG9rZW5EYXRhKVxuICAgICAgICAgICAgICAgICAgICAuZW5kKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5ibG9ja1VucmVnaXN0ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubG9nZ2VyLmVycm9yKCdJb25pYyBQdXNoOicsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBQdXNoOiB1bnJlZ2lzdGVyZWQgcHVzaCB0b2tlbjogJyArIHB1c2hUb2tlbl8xLnRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLnRva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KG5ldyBFcnJvcignQW4gdW5yZWdpc3RlciBvcGVyYXRpb24gaXMgYWxyZWFkeSBpbiBwcm9ncmVzcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ibG9ja1VucmVnaXN0ZXIgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgUHVzaC5wcm90b3R5cGUuX2NhbGxiYWNrUmVnaXN0cmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLnBsdWdpbi5vbigncmVnaXN0cmF0aW9uJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIF90aGlzLnRva2VuID0geyAndG9rZW4nOiBkYXRhLnJlZ2lzdHJhdGlvbklkIH07XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgIF90aGlzLmxvZ2dlci5pbmZvKCdJb25pYyBQdXNoIChkZWJ1Zyk6IGRldmljZSB0b2tlbiByZWdpc3RlcmVkOiAnICsgX3RoaXMudG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3RoaXMuZW1pdHRlci5lbWl0KCdwdXNoOnJlZ2lzdGVyJywgX3RoaXMudG9rZW4pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wbHVnaW4ub24oJ25vdGlmaWNhdGlvbicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VfMS5QdXNoTWVzc2FnZS5mcm9tUGx1Z2luRGF0YShkYXRhKTtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMubG9nZ2VyLmluZm8oJ0lvbmljIFB1c2ggKGRlYnVnKTogbm90aWZpY2F0aW9uIHJlY2VpdmVkOiAnICsgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5lbWl0dGVyLmVtaXQoJ3B1c2g6bm90aWZpY2F0aW9uJywgeyAnbWVzc2FnZSc6IG1lc3NhZ2UsICdyYXcnOiBkYXRhIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wbHVnaW4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMubG9nZ2VyLmVycm9yKCdJb25pYyBQdXNoIChkZWJ1Zyk6IHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJlZC4nKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5sb2dnZXIuZXJyb3IoJ0lvbmljIFB1c2g6JywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5lbWl0dGVyLmVtaXQoJ3B1c2g6ZXJyb3InLCB7ICdlcnInOiBlIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgUHVzaC5wcm90b3R5cGUuX2dldFB1c2hQbHVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwbHVnaW4gPSB3aW5kb3cuUHVzaE5vdGlmaWNhdGlvbjtcbiAgICAgICAgaWYgKCFwbHVnaW4pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRldmljZS5pc0lPUygpIHx8IHRoaXMuZGV2aWNlLmlzQW5kcm9pZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0lvbmljIFB1c2g6IFB1c2hOb3RpZmljYXRpb24gcGx1Z2luIGlzIHJlcXVpcmVkLiBIYXZlIHlvdSBydW4gYGlvbmljIHBsdWdpbiBhZGQgcGhvbmVnYXAtcGx1Z2luLXB1c2hgID8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0lvbmljIFB1c2g6IERpc2FibGVkISBOYXRpdmUgcHVzaCBub3RpZmljYXRpb25zIHdpbGwgbm90IHdvcmsgaW4gYSBicm93c2VyLiBSdW4geW91ciBhcHAgb24gYW4gYWN0dWFsIGRldmljZSB0byB1c2UgcHVzaC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGx1Z2luO1xuICAgIH07XG4gICAgcmV0dXJuIFB1c2g7XG59KCkpO1xuZXhwb3J0cy5QdXNoID0gUHVzaDtcbiIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBMb2NhbFN0b3JhZ2VTdHJhdGVneSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTG9jYWxTdG9yYWdlU3RyYXRlZ3koKSB7XG4gICAgfVxuICAgIExvY2FsU3RvcmFnZVN0cmF0ZWd5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgIH07XG4gICAgTG9jYWxTdG9yYWdlU3RyYXRlZ3kucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlKTtcbiAgICB9O1xuICAgIExvY2FsU3RvcmFnZVN0cmF0ZWd5LnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgIH07XG4gICAgcmV0dXJuIExvY2FsU3RvcmFnZVN0cmF0ZWd5O1xufSgpKTtcbmV4cG9ydHMuTG9jYWxTdG9yYWdlU3RyYXRlZ3kgPSBMb2NhbFN0b3JhZ2VTdHJhdGVneTtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgU2Vzc2lvblN0b3JhZ2VTdHJhdGVneSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Vzc2lvblN0b3JhZ2VTdHJhdGVneSgpIHtcbiAgICB9XG4gICAgU2Vzc2lvblN0b3JhZ2VTdHJhdGVneS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgIH07XG4gICAgU2Vzc2lvblN0b3JhZ2VTdHJhdGVneS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSk7XG4gICAgfTtcbiAgICBTZXNzaW9uU3RvcmFnZVN0cmF0ZWd5LnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2Vzc2lvblN0b3JhZ2VTdHJhdGVneTtcbn0oKSk7XG5leHBvcnRzLlNlc3Npb25TdG9yYWdlU3RyYXRlZ3kgPSBTZXNzaW9uU3RvcmFnZVN0cmF0ZWd5O1xuLyoqXG4gKiBBIGdlbmVyaWMgbG9jYWwvc2Vzc2lvbiBzdG9yYWdlIGFic3RyYWN0aW9uLlxuICovXG52YXIgU3RvcmFnZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3RvcmFnZShkZXBzLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHsgJ3ByZWZpeCc6ICdpb25pYycsICdjYWNoZSc6IHRydWUgfTsgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB0aGlzLnN0cmF0ZWd5ID0gZGVwcy5zdHJhdGVneTtcbiAgICAgICAgdGhpcy5zdG9yYWdlQ2FjaGUgPSB7fTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0IGEgdmFsdWUgaW4gdGhlIHN0b3JhZ2UgYnkgdGhlIGdpdmVuIGtleS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXkgLSBUaGUgc3RvcmFnZSBrZXkgdG8gc2V0LlxuICAgICAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBzZXQuIChNdXN0IGJlIEpTT04tc2VyaWFsaXphYmxlKS5cbiAgICAgKi9cbiAgICBTdG9yYWdlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICBrZXkgPSB0aGlzLnN0YW5kYXJkaXplS2V5KGtleSk7XG4gICAgICAgIHZhciBqc29uID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICB0aGlzLnN0cmF0ZWd5LnNldChrZXksIGpzb24pO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNhY2hlKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3JhZ2VDYWNoZVtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIHZhbHVlIGZyb20gdGhlIHN0b3JhZ2UgYnkgdGhlIGdpdmVuIGtleS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXkgLSBUaGUgc3RvcmFnZSBrZXkgdG8gZGVsZXRlLlxuICAgICAqL1xuICAgIFN0b3JhZ2UucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAga2V5ID0gdGhpcy5zdGFuZGFyZGl6ZUtleShrZXkpO1xuICAgICAgICB0aGlzLnN0cmF0ZWd5LmRlbGV0ZShrZXkpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNhY2hlKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdG9yYWdlQ2FjaGVba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogR2V0IGEgdmFsdWUgZnJvbSB0aGUgc3RvcmFnZSBieSB0aGUgZ2l2ZW4ga2V5LlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleSAtIFRoZSBzdG9yYWdlIGtleSB0byBnZXQuXG4gICAgICovXG4gICAgU3RvcmFnZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBrZXkgPSB0aGlzLnN0YW5kYXJkaXplS2V5KGtleSk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgIHZhciBjYWNoZWQgPSB0aGlzLnN0b3JhZ2VDYWNoZVtrZXldO1xuICAgICAgICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpzb24gPSB0aGlzLnN0cmF0ZWd5LmdldChrZXkpO1xuICAgICAgICBpZiAoIWpzb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmFnZUNhY2hlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBTdG9yYWdlLnByb3RvdHlwZS5zdGFuZGFyZGl6ZUtleSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5wcmVmaXggKyBcIl9cIiArIGtleTtcbiAgICB9O1xuICAgIHJldHVybiBTdG9yYWdlO1xufSgpKTtcbmV4cG9ydHMuU3RvcmFnZSA9IFN0b3JhZ2U7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBkYXRhVHlwZU1hcHBpbmcgPSB7fTtcbnZhciBEYXRhVHlwZVNjaGVtYSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGF0YVR5cGVTY2hlbWEocHJvcGVydGllcykge1xuICAgICAgICB0aGlzLmRhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5zZXRQcm9wZXJ0aWVzKHByb3BlcnRpZXMpO1xuICAgIH1cbiAgICBEYXRhVHlwZVNjaGVtYS5wcm90b3R5cGUuc2V0UHJvcGVydGllcyA9IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmIChwcm9wZXJ0aWVzIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbeF0gPSBwcm9wZXJ0aWVzW3hdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBEYXRhVHlwZVNjaGVtYS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdfX0lvbmljX0RhdGFUeXBlU2NoZW1hJzogZGF0YS5uYW1lLFxuICAgICAgICAgICAgJ3ZhbHVlJzogZGF0YS52YWx1ZVxuICAgICAgICB9O1xuICAgIH07XG4gICAgRGF0YVR5cGVTY2hlbWEucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubmFtZSAmJiB0aGlzLmRhdGEudmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIHJldHVybiBEYXRhVHlwZVNjaGVtYTtcbn0oKSk7XG5leHBvcnRzLkRhdGFUeXBlU2NoZW1hID0gRGF0YVR5cGVTY2hlbWE7XG52YXIgRGF0YVR5cGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIERhdGFUeXBlKCkge1xuICAgIH1cbiAgICBEYXRhVHlwZS5nZXQgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGRhdGFUeXBlTWFwcGluZ1tuYW1lXSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBkYXRhVHlwZU1hcHBpbmdbbmFtZV0odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIERhdGFUeXBlLmdldE1hcHBpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkYXRhVHlwZU1hcHBpbmc7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVR5cGUsIFwiU2NoZW1hXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRGF0YVR5cGVTY2hlbWE7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIERhdGFUeXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKG5hbWUsIGNscykge1xuICAgICAgICBkYXRhVHlwZU1hcHBpbmdbbmFtZV0gPSBjbHM7XG4gICAgfTtcbiAgICByZXR1cm4gRGF0YVR5cGU7XG59KCkpO1xuZXhwb3J0cy5EYXRhVHlwZSA9IERhdGFUeXBlO1xudmFyIFVuaXF1ZUFycmF5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVbmlxdWVBcnJheSh2YWx1ZSkge1xuICAgICAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2godmFsdWVbeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFVuaXF1ZUFycmF5LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gbmV3IERhdGFUeXBlU2NoZW1hKHsgJ25hbWUnOiAnVW5pcXVlQXJyYXknLCAndmFsdWUnOiBkYXRhIH0pO1xuICAgICAgICByZXR1cm4gc2NoZW1hLnRvSlNPTigpO1xuICAgIH07XG4gICAgVW5pcXVlQXJyYXkuZnJvbVN0b3JhZ2UgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVbmlxdWVBcnJheSh2YWx1ZSk7XG4gICAgfTtcbiAgICBVbmlxdWVBcnJheS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5kYXRhLmluZGV4T2YodmFsdWUpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhLnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBVbmlxdWVBcnJheS5wcm90b3R5cGUucHVsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmRhdGEuaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gICAgcmV0dXJuIFVuaXF1ZUFycmF5O1xufSgpKTtcbmV4cG9ydHMuVW5pcXVlQXJyYXkgPSBVbmlxdWVBcnJheTtcbkRhdGFUeXBlLnJlZ2lzdGVyKCdVbmlxdWVBcnJheScsIFVuaXF1ZUFycmF5KTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIHByb21pc2VfMSA9IHJlcXVpcmUoJy4uL3Byb21pc2UnKTtcbnZhciBkYXRhX3R5cGVzXzEgPSByZXF1aXJlKCcuL2RhdGEtdHlwZXMnKTtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgVXNlckNvbnRleHQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFVzZXJDb250ZXh0KGRlcHMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBkZXBzLmNvbmZpZztcbiAgICAgICAgdGhpcy5zdG9yYWdlID0gZGVwcy5zdG9yYWdlO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoVXNlckNvbnRleHQucHJvdG90eXBlLCBcImxhYmVsXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3VzZXJfJyArIHRoaXMuY29uZmlnLmdldCgnYXBwX2lkJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIFVzZXJDb250ZXh0LnByb3RvdHlwZS51bnN0b3JlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN0b3JhZ2UuZGVsZXRlKHRoaXMubGFiZWwpO1xuICAgIH07XG4gICAgVXNlckNvbnRleHQucHJvdG90eXBlLnN0b3JlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhpcy5zdG9yYWdlLnNldCh0aGlzLmxhYmVsLCB1c2VyLnNlcmlhbGl6ZUZvclN0b3JhZ2UoKSk7XG4gICAgfTtcbiAgICBVc2VyQ29udGV4dC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zdG9yYWdlLmdldCh0aGlzLmxhYmVsKTtcbiAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHVzZXIuaWQgPSBkYXRhLmlkO1xuICAgICAgICAgICAgdXNlci5kYXRhID0gbmV3IFVzZXJEYXRhKGRhdGEuZGF0YSk7XG4gICAgICAgICAgICB1c2VyLmRldGFpbHMgPSBkYXRhLmRldGFpbHMgfHwge307XG4gICAgICAgICAgICB1c2VyLnNvY2lhbCA9IGRhdGEuc29jaWFsIHx8IHt9O1xuICAgICAgICAgICAgdXNlci5mcmVzaCA9IGRhdGEuZnJlc2g7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfTtcbiAgICByZXR1cm4gVXNlckNvbnRleHQ7XG59KCkpO1xuZXhwb3J0cy5Vc2VyQ29udGV4dCA9IFVzZXJDb250ZXh0O1xuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbnZhciBVc2VyRGF0YSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXNlckRhdGEoZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSA9PT0gdm9pZCAwKSB7IGRhdGEgPSB7fTsgfVxuICAgICAgICB0aGlzLmRhdGEgPSB7fTtcbiAgICAgICAgaWYgKCh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZURhdGFUeXBlcygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFVzZXJEYXRhLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5LCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoZGVmYXVsdFZhbHVlID09PSAwIHx8IGRlZmF1bHRWYWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZSB8fCBudWxsO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBVc2VyRGF0YS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5kYXRhW2tleV0gPSB2YWx1ZTtcbiAgICB9O1xuICAgIFVzZXJEYXRhLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuZGF0YVtrZXldO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBVc2VyRGF0YS5wcm90b3R5cGUuZGVzZXJpYWxpemVEYXRhVHlwZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gdGhpcy5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgd2UgaGF2ZSBhbiBvYmplY3QsIGxldCdzIGNoZWNrIGZvciBjdXN0b20gZGF0YSB0eXBlc1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbeF0gJiYgdHlwZW9mIHRoaXMuZGF0YVt4XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gd2UgaGF2ZSBhIGN1c3RvbSB0eXBlP1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3hdLl9fSW9uaWNfRGF0YVR5cGVTY2hlbWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gdGhpcy5kYXRhW3hdLl9fSW9uaWNfRGF0YVR5cGVTY2hlbWE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFwcGluZyA9IGRhdGFfdHlwZXNfMS5EYXRhVHlwZS5nZXRNYXBwaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWFwcGluZ1tuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGhhdmUgYSBjdXN0b20gdHlwZSBhbmQgYSByZWdpc3RlcmVkIGNsYXNzLCBnaXZlIHRoZSBjdXN0b20gZGF0YSB0eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZnJvbSBzdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhW3hdID0gbWFwcGluZ1tuYW1lXS5mcm9tU3RvcmFnZSh0aGlzLmRhdGFbeF0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gVXNlckRhdGE7XG59KCkpO1xuZXhwb3J0cy5Vc2VyRGF0YSA9IFVzZXJEYXRhO1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgdXNlciBvZiB0aGUgYXBwLlxuICpcbiAqIEBmZWF0dXJlZFxuICovXG52YXIgVXNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXNlcihkZXBzKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgZGV0YWlscyAoZW1haWwsIHBhc3N3b3JkLCBldGMpIG9mIHRoaXMgdXNlci5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGV0YWlscyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHNvY2lhbCBkZXRhaWxzIG9mIHRoaXMgdXNlci5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc29jaWFsID0ge307XG4gICAgICAgIHRoaXMuc2VydmljZSA9IGRlcHMuc2VydmljZTtcbiAgICAgICAgdGhpcy5mcmVzaCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3Vuc2V0ID0ge307XG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayB3aGV0aGVyIHRoaXMgdXNlciBpcyBhbm9ueW1vdXMgb3Igbm90LlxuICAgICAqXG4gICAgICogSWYgdGhlIGBpZGAgcHJvcGVydHkgaXMgc2V0LCB0aGUgdXNlciBpcyBubyBsb25nZXIgYW5vbnltb3VzLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLmlzQW5vbnltb3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuaWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBHZXQgYSB2YWx1ZSBmcm9tIHRoaXMgdXNlcidzIGN1c3RvbSBkYXRhLlxuICAgICAqXG4gICAgICogT3B0aW9uYWxseSwgYSBkZWZhdWx0IHZhbHVlIGNhbiBiZSBwcm92aWRlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXkgLSBUaGUgZGF0YSBrZXkgdG8gZ2V0LlxuICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWUgLSBUaGUgdmFsdWUgdG8gcmV0dXJuIGlmIHRoZSBrZXkgaXMgYWJzZW50LlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmdldChrZXksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZXQgYSB2YWx1ZSBpbiB0aGlzIHVzZXIncyBjdXN0b20gZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXkgLSBUaGUgZGF0YSBrZXkgdG8gc2V0LlxuICAgICAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBzZXQuXG4gICAgICovXG4gICAgVXNlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3Vuc2V0W2tleV07XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGEuc2V0KGtleSwgdmFsdWUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgdmFsdWUgZnJvbSB0aGlzIHVzZXIncyBjdXN0b20gZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXkgLSBUaGUgZGF0YSBrZXkgdG8gZGVsZXRlLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLnVuc2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB0aGlzLl91bnNldFtrZXldID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS51bnNldChrZXkpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmV2ZXJ0IHRoaXMgdXNlciB0byBhIGZyZXNoLCBhbm9ueW1vdXMgc3RhdGUuXG4gICAgICovXG4gICAgVXNlci5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgVXNlckRhdGEoKTtcbiAgICAgICAgdGhpcy5kZXRhaWxzID0ge307XG4gICAgICAgIHRoaXMuZnJlc2ggPSB0cnVlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2F2ZSB0aGlzIHVzZXIgdG8gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBVc2VyLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91bnNldCA9IHt9O1xuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2aWNlLnNhdmUoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIERlbGV0ZSB0aGlzIHVzZXIgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VydmljZS5kZWxldGUoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIExvYWQgdGhlIHVzZXIgZnJvbSB0aGUgQVBJLCBvdmVyd3JpdGluZyB0aGUgbG9jYWwgdXNlcidzIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWQgLSBUaGUgdXNlciBJRCB0byBsb2FkIGludG8gdGhpcyB1c2VyLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VydmljZS5sb2FkKGlkKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFN0b3JlIHRoaXMgdXNlciBpbiBsb2NhbCBzdG9yYWdlLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLnN0b3JlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNlcnZpY2Uuc3RvcmUoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZSB0aGlzIHVzZXIgZnJvbSBsb2NhbCBzdG9yYWdlLlxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLnVuc3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc2VydmljZS51bnN0b3JlKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgVXNlci5wcm90b3R5cGUuc2VyaWFsaXplRm9yQVBJID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ2VtYWlsJzogdGhpcy5kZXRhaWxzLmVtYWlsLFxuICAgICAgICAgICAgJ3Bhc3N3b3JkJzogdGhpcy5kZXRhaWxzLnBhc3N3b3JkLFxuICAgICAgICAgICAgJ3VzZXJuYW1lJzogdGhpcy5kZXRhaWxzLnVzZXJuYW1lLFxuICAgICAgICAgICAgJ2ltYWdlJzogdGhpcy5kZXRhaWxzLmltYWdlLFxuICAgICAgICAgICAgJ25hbWUnOiB0aGlzLmRldGFpbHMubmFtZSxcbiAgICAgICAgICAgICdjdXN0b20nOiB0aGlzLmRhdGEuZGF0YVxuICAgICAgICB9O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIFVzZXIucHJvdG90eXBlLnNlcmlhbGl6ZUZvclN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnaWQnOiB0aGlzLmlkLFxuICAgICAgICAgICAgJ2RhdGEnOiB0aGlzLmRhdGEuZGF0YSxcbiAgICAgICAgICAgICdkZXRhaWxzJzogdGhpcy5kZXRhaWxzLFxuICAgICAgICAgICAgJ2ZyZXNoJzogdGhpcy5mcmVzaCxcbiAgICAgICAgICAgICdzb2NpYWwnOiB0aGlzLnNvY2lhbFxuICAgICAgICB9O1xuICAgIH07XG4gICAgVXNlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBcIjxVc2VyIFtcIiArICh0aGlzLmlzQW5vbnltb3VzKCkgPyAnYW5vbnltb3VzJyA6IHRoaXMuaWQpICsgXCJdPlwiO1xuICAgIH07XG4gICAgcmV0dXJuIFVzZXI7XG59KCkpO1xuZXhwb3J0cy5Vc2VyID0gVXNlcjtcbi8qKlxuICogQGhpZGRlblxuICovXG52YXIgU2luZ2xlVXNlclNlcnZpY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNpbmdsZVVzZXJTZXJ2aWNlKGRlcHMsIGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnID09PSB2b2lkIDApIHsgY29uZmlnID0ge307IH1cbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIHRoaXMuY2xpZW50ID0gZGVwcy5jbGllbnQ7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGRlcHMuY29udGV4dDtcbiAgICB9XG4gICAgU2luZ2xlVXNlclNlcnZpY2UucHJvdG90eXBlLmN1cnJlbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy51c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB0aGlzLmNvbnRleHQubG9hZChuZXcgVXNlcih7ICdzZXJ2aWNlJzogdGhpcyB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG5ldyBVc2VyKHsgJ3NlcnZpY2UnOiB0aGlzIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnVzZXI7XG4gICAgfTtcbiAgICBTaW5nbGVVc2VyU2VydmljZS5wcm90b3R5cGUuc3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5zdG9yZSh0aGlzLmN1cnJlbnQoKSk7XG4gICAgfTtcbiAgICBTaW5nbGVVc2VyU2VydmljZS5wcm90b3R5cGUudW5zdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnVuc3RvcmUoKTtcbiAgICB9O1xuICAgIFNpbmdsZVVzZXJTZXJ2aWNlLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIGlmIChpZCA9PT0gdm9pZCAwKSB7IGlkID0gJ3NlbGYnOyB9XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIHZhciB1c2VyID0gdGhpcy5jdXJyZW50KCk7XG4gICAgICAgIHRoaXMuY2xpZW50LmdldChcIi91c2Vycy9cIiArIGlkKVxuICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVzZXIuaWQgPSByZXMuYm9keS5kYXRhLnV1aWQ7XG4gICAgICAgICAgICAgICAgdXNlci5kYXRhID0gbmV3IFVzZXJEYXRhKHJlcy5ib2R5LmRhdGEuY3VzdG9tKTtcbiAgICAgICAgICAgICAgICB1c2VyLmRldGFpbHMgPSByZXMuYm9keS5kYXRhLmRldGFpbHM7XG4gICAgICAgICAgICAgICAgdXNlci5mcmVzaCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVzZXIuc29jaWFsID0gcmVzLmJvZHkuZGF0YS5zb2NpYWw7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcbiAgICBTaW5nbGVVc2VyU2VydmljZS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgcHJvbWlzZV8xLkRlZmVycmVkUHJvbWlzZSgpO1xuICAgICAgICBpZiAodGhpcy51c2VyLmlzQW5vbnltb3VzKCkpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoJ1VzZXIgaXMgYW5vbnltb3VzIGFuZCBjYW5ub3QgYmUgZGVsZXRlZCBmcm9tIHRoZSBBUEkuJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy51bnN0b3JlKCk7XG4gICAgICAgICAgICB0aGlzLmNsaWVudC5kZWxldGUoXCIvdXNlcnMvXCIgKyB0aGlzLnVzZXIuaWQpXG4gICAgICAgICAgICAgICAgLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG4gICAgU2luZ2xlVXNlclNlcnZpY2UucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBwcm9taXNlXzEuRGVmZXJyZWRQcm9taXNlKCk7XG4gICAgICAgIHRoaXMuc3RvcmUoKTtcbiAgICAgICAgaWYgKHRoaXMudXNlci5pc0Fub255bW91cygpKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QobmV3IEVycm9yKCdVc2VyIGlzIGFub255bW91cyBhbmQgY2Fubm90IGJlIHVwZGF0ZWQgaW4gdGhlIEFQSS4gVXNlIGxvYWQoPGlkPikgb3Igc2lnbnVwIGEgdXNlciB1c2luZyBhdXRoLicpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2xpZW50LnBhdGNoKFwiL3VzZXJzL1wiICsgdGhpcy51c2VyLmlkKVxuICAgICAgICAgICAgICAgIC5zZW5kKHRoaXMudXNlci5zZXJpYWxpemVGb3JBUEkoKSlcbiAgICAgICAgICAgICAgICAuZW5kKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy51c2VyLmZyZXNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuICAgIHJldHVybiBTaW5nbGVVc2VyU2VydmljZTtcbn0oKSk7XG5leHBvcnRzLlNpbmdsZVVzZXJTZXJ2aWNlID0gU2luZ2xlVXNlclNlcnZpY2U7XG4iLCJcclxuLyoqXHJcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXHJcbiAqL1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcclxuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXHJcbiAqIEByZXR1cm4ge09iamVjdH1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XHJcbiAgZm9yICh2YXIga2V5IGluIEVtaXR0ZXIucHJvdG90eXBlKSB7XHJcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAodGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW10pXHJcbiAgICAucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXHJcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIGZ1bmN0aW9uIG9uKCkge1xyXG4gICAgdGhpcy5vZmYoZXZlbnQsIG9uKTtcclxuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgfVxyXG5cclxuICBvbi5mbiA9IGZuO1xyXG4gIHRoaXMub24oZXZlbnQsIG9uKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxyXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cclxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcblxyXG4gIC8vIGFsbFxyXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyBzcGVjaWZpYyBldmVudFxyXG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcclxuXHJcbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xyXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxyXG4gIHZhciBjYjtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xyXG4gICAgY2IgPSBjYWxsYmFja3NbaV07XHJcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xyXG4gICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge01peGVkfSAuLi5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxyXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG5cclxuICBpZiAoY2FsbGJhY2tzKSB7XHJcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xyXG59O1xyXG4iLCJcbi8qKlxuICogUmVkdWNlIGBhcnJgIHdpdGggYGZuYC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge01peGVkfSBpbml0aWFsXG4gKlxuICogVE9ETzogY29tYmF0aWJsZSBlcnJvciBoYW5kbGluZz9cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFyciwgZm4sIGluaXRpYWwpeyAgXG4gIHZhciBpZHggPSAwO1xuICB2YXIgbGVuID0gYXJyLmxlbmd0aDtcbiAgdmFyIGN1cnIgPSBhcmd1bWVudHMubGVuZ3RoID09IDNcbiAgICA/IGluaXRpYWxcbiAgICA6IGFycltpZHgrK107XG5cbiAgd2hpbGUgKGlkeCA8IGxlbikge1xuICAgIGN1cnIgPSBmbi5jYWxsKG51bGwsIGN1cnIsIGFycltpZHhdLCArK2lkeCwgYXJyKTtcbiAgfVxuICBcbiAgcmV0dXJuIGN1cnI7XG59OyIsIi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXInKTtcbnZhciByZWR1Y2UgPSByZXF1aXJlKCdyZWR1Y2UnKTtcbnZhciByZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4vcmVxdWVzdC1iYXNlJyk7XG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyAvLyBXZWIgV29ya2VyXG4gIHJvb3QgPSBzZWxmO1xufSBlbHNlIHsgLy8gT3RoZXIgZW52aXJvbm1lbnRzXG4gIHJvb3QgPSB0aGlzO1xufVxuXG4vKipcbiAqIE5vb3AuXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpe307XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBob3N0IG9iamVjdCxcbiAqIHdlIGRvbid0IHdhbnQgdG8gc2VyaWFsaXplIHRoZXNlIDopXG4gKlxuICogVE9ETzogZnV0dXJlIHByb29mLCBtb3ZlIHRvIGNvbXBvZW50IGxhbmRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gaXNIb3N0KG9iaikge1xuICB2YXIgc3RyID0ge30udG9TdHJpbmcuY2FsbChvYmopO1xuXG4gIHN3aXRjaCAoc3RyKSB7XG4gICAgY2FzZSAnW29iamVjdCBGaWxlXSc6XG4gICAgY2FzZSAnW29iamVjdCBCbG9iXSc6XG4gICAgY2FzZSAnW29iamVjdCBGb3JtRGF0YV0nOlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdGAuXG4gKi9cblxudmFyIHJlcXVlc3QgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLmJpbmQobnVsbCwgUmVxdWVzdCk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIFhIUi5cbiAqL1xuXG5yZXF1ZXN0LmdldFhIUiA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHJvb3QuWE1MSHR0cFJlcXVlc3RcbiAgICAgICYmICghcm9vdC5sb2NhdGlvbiB8fCAnZmlsZTonICE9IHJvb3QubG9jYXRpb24ucHJvdG9jb2xcbiAgICAgICAgICB8fCAhcm9vdC5BY3RpdmVYT2JqZWN0KSkge1xuICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3Q7XG4gIH0gZWxzZSB7XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNaWNyb3NvZnQuWE1MSFRUUCcpOyB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUC42LjAnKTsgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuMy4wJyk7IH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQJyk7IH0gY2F0Y2goZSkge31cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSwgYWRkZWQgdG8gc3VwcG9ydCBJRS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIHRyaW0gPSAnJy50cmltXG4gID8gZnVuY3Rpb24ocykgeyByZXR1cm4gcy50cmltKCk7IH1cbiAgOiBmdW5jdGlvbihzKSB7IHJldHVybiBzLnJlcGxhY2UoLyheXFxzKnxcXHMqJCkvZywgJycpOyB9O1xuXG4vKipcbiAqIFNlcmlhbGl6ZSB0aGUgZ2l2ZW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VyaWFsaXplKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gIHZhciBwYWlycyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKG51bGwgIT0gb2JqW2tleV0pIHtcbiAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIG9ialtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICByZXR1cm4gcGFpcnMuam9pbignJicpO1xufVxuXG4vKipcbiAqIEhlbHBzICdzZXJpYWxpemUnIHdpdGggc2VyaWFsaXppbmcgYXJyYXlzLlxuICogTXV0YXRlcyB0aGUgcGFpcnMgYXJyYXkuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGFpcnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICovXG5cbmZ1bmN0aW9uIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIHZhbCkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgcmV0dXJuIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIHYpO1xuICAgIH0pO1xuICB9XG4gIHBhaXJzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSlcbiAgICArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpKTtcbn1cblxuLyoqXG4gKiBFeHBvc2Ugc2VyaWFsaXphdGlvbiBtZXRob2QuXG4gKi9cblxuIHJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4gLyoqXG4gICogUGFyc2UgdGhlIGdpdmVuIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBgc3RyYC5cbiAgKlxuICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICogQGFwaSBwcml2YXRlXG4gICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cikge1xuICB2YXIgb2JqID0ge307XG4gIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICB2YXIgcGFydHM7XG4gIHZhciBwYWlyO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYWlycy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICBwYXJ0cyA9IHBhaXIuc3BsaXQoJz0nKTtcbiAgICBvYmpbZGVjb2RlVVJJQ29tcG9uZW50KHBhcnRzWzBdKV0gPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBFeHBvc2UgcGFyc2VyLlxuICovXG5cbnJlcXVlc3QucGFyc2VTdHJpbmcgPSBwYXJzZVN0cmluZztcblxuLyoqXG4gKiBEZWZhdWx0IE1JTUUgdHlwZSBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICovXG5cbnJlcXVlc3QudHlwZXMgPSB7XG4gIGh0bWw6ICd0ZXh0L2h0bWwnLFxuICBqc29uOiAnYXBwbGljYXRpb24vanNvbicsXG4gIHhtbDogJ2FwcGxpY2F0aW9uL3htbCcsXG4gIHVybGVuY29kZWQ6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAnZm9ybSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAnZm9ybS1kYXRhJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbi8qKlxuICogRGVmYXVsdCBzZXJpYWxpemF0aW9uIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24ob2JqKXtcbiAqICAgICAgIHJldHVybiAnZ2VuZXJhdGVkIHhtbCBoZXJlJztcbiAqICAgICB9O1xuICpcbiAqL1xuXG4gcmVxdWVzdC5zZXJpYWxpemUgPSB7XG4gICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogc2VyaWFsaXplLFxuICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeVxuIH07XG5cbiAvKipcbiAgKiBEZWZhdWx0IHBhcnNlcnMuXG4gICpcbiAgKiAgICAgc3VwZXJhZ2VudC5wYXJzZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihzdHIpe1xuICAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcbiAgKiAgICAgfTtcbiAgKlxuICAqL1xuXG5yZXF1ZXN0LnBhcnNlID0ge1xuICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXG4gICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5wYXJzZVxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gaGVhZGVyIGBzdHJgIGludG9cbiAqIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtYXBwZWQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVyKHN0cikge1xuICB2YXIgbGluZXMgPSBzdHIuc3BsaXQoL1xccj9cXG4vKTtcbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgaW5kZXg7XG4gIHZhciBsaW5lO1xuICB2YXIgZmllbGQ7XG4gIHZhciB2YWw7XG5cbiAgbGluZXMucG9wKCk7IC8vIHRyYWlsaW5nIENSTEZcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGluZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgaW5kZXggPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBmaWVsZCA9IGxpbmUuc2xpY2UoMCwgaW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsID0gdHJpbShsaW5lLnNsaWNlKGluZGV4ICsgMSkpO1xuICAgIGZpZWxkc1tmaWVsZF0gPSB2YWw7XG4gIH1cblxuICByZXR1cm4gZmllbGRzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICByZXR1cm4gL1tcXC8rXWpzb25cXGIvLnRlc3QobWltZSk7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBtaW1lIHR5cGUgZm9yIHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiB0eXBlKHN0cil7XG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGhlYWRlciBmaWVsZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcmFtcyhzdHIpe1xuICByZXR1cm4gcmVkdWNlKHN0ci5zcGxpdCgvICo7ICovKSwgZnVuY3Rpb24ob2JqLCBzdHIpe1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKVxuICAgICAgLCBrZXkgPSBwYXJ0cy5zaGlmdCgpXG4gICAgICAsIHZhbCA9IHBhcnRzLnNoaWZ0KCk7XG5cbiAgICBpZiAoa2V5ICYmIHZhbCkgb2JqW2tleV0gPSB2YWw7XG4gICAgcmV0dXJuIG9iajtcbiAgfSwge30pO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnJlcSA9IHJlcTtcbiAgdGhpcy54aHIgPSB0aGlzLnJlcS54aHI7XG4gIC8vIHJlc3BvbnNlVGV4dCBpcyBhY2Nlc3NpYmxlIG9ubHkgaWYgcmVzcG9uc2VUeXBlIGlzICcnIG9yICd0ZXh0JyBhbmQgb24gb2xkZXIgYnJvd3NlcnNcbiAgdGhpcy50ZXh0ID0gKCh0aGlzLnJlcS5tZXRob2QgIT0nSEVBRCcgJiYgKHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJycgfHwgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcpKSB8fCB0eXBlb2YgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJylcbiAgICAgPyB0aGlzLnhoci5yZXNwb25zZVRleHRcbiAgICAgOiBudWxsO1xuICB0aGlzLnN0YXR1c1RleHQgPSB0aGlzLnJlcS54aHIuc3RhdHVzVGV4dDtcbiAgdGhpcy5zZXRTdGF0dXNQcm9wZXJ0aWVzKHRoaXMueGhyLnN0YXR1cyk7XG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXG4gIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgdGhpcy5zZXRIZWFkZXJQcm9wZXJ0aWVzKHRoaXMuaGVhZGVyKTtcbiAgdGhpcy5ib2R5ID0gdGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJ1xuICAgID8gdGhpcy5wYXJzZUJvZHkodGhpcy50ZXh0ID8gdGhpcy50ZXh0IDogdGhpcy54aHIucmVzcG9uc2UpXG4gICAgOiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGBmaWVsZGAgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZS5wcm90b3R5cGUuc2V0SGVhZGVyUHJvcGVydGllcyA9IGZ1bmN0aW9uKGhlYWRlcil7XG4gIC8vIGNvbnRlbnQtdHlwZVxuICB2YXIgY3QgPSB0aGlzLmhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XG4gIHRoaXMudHlwZSA9IHR5cGUoY3QpO1xuXG4gIC8vIHBhcmFtc1xuICB2YXIgb2JqID0gcGFyYW1zKGN0KTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikgdGhpc1trZXldID0gb2JqW2tleV07XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBib2R5IGBzdHJgLlxuICpcbiAqIFVzZWQgZm9yIGF1dG8tcGFyc2luZyBvZiBib2RpZXMuIFBhcnNlcnNcbiAqIGFyZSBkZWZpbmVkIG9uIHRoZSBgc3VwZXJhZ2VudC5wYXJzZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLnBhcnNlQm9keSA9IGZ1bmN0aW9uKHN0cil7XG4gIHZhciBwYXJzZSA9IHJlcXVlc3QucGFyc2VbdGhpcy50eXBlXTtcbiAgaWYgKCFwYXJzZSAmJiBpc0pTT04odGhpcy50eXBlKSkge1xuICAgIHBhcnNlID0gcmVxdWVzdC5wYXJzZVsnYXBwbGljYXRpb24vanNvbiddO1xuICB9XG4gIHJldHVybiBwYXJzZSAmJiBzdHIgJiYgKHN0ci5sZW5ndGggfHwgc3RyIGluc3RhbmNlb2YgT2JqZWN0KVxuICAgID8gcGFyc2Uoc3RyKVxuICAgIDogbnVsbDtcbn07XG5cbi8qKlxuICogU2V0IGZsYWdzIHN1Y2ggYXMgYC5va2AgYmFzZWQgb24gYHN0YXR1c2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYSAyeHggcmVzcG9uc2Ugd2lsbCBnaXZlIHlvdSBhIGAub2tgIG9mIF9fdHJ1ZV9fXG4gKiB3aGVyZWFzIDV4eCB3aWxsIGJlIF9fZmFsc2VfXyBhbmQgYC5lcnJvcmAgd2lsbCBiZSBfX3RydWVfXy4gVGhlXG4gKiBgLmNsaWVudEVycm9yYCBhbmQgYC5zZXJ2ZXJFcnJvcmAgYXJlIGFsc28gYXZhaWxhYmxlIHRvIGJlIG1vcmVcbiAqIHNwZWNpZmljLCBhbmQgYC5zdGF0dXNUeXBlYCBpcyB0aGUgY2xhc3Mgb2YgZXJyb3IgcmFuZ2luZyBmcm9tIDEuLjVcbiAqIHNvbWV0aW1lcyB1c2VmdWwgZm9yIG1hcHBpbmcgcmVzcG9uZCBjb2xvcnMgZXRjLlxuICpcbiAqIFwic3VnYXJcIiBwcm9wZXJ0aWVzIGFyZSBhbHNvIGRlZmluZWQgZm9yIGNvbW1vbiBjYXNlcy4gQ3VycmVudGx5IHByb3ZpZGluZzpcbiAqXG4gKiAgIC0gLm5vQ29udGVudFxuICogICAtIC5iYWRSZXF1ZXN0XG4gKiAgIC0gLnVuYXV0aG9yaXplZFxuICogICAtIC5ub3RBY2NlcHRhYmxlXG4gKiAgIC0gLm5vdEZvdW5kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHN0YXR1c1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLnNldFN0YXR1c1Byb3BlcnRpZXMgPSBmdW5jdGlvbihzdGF0dXMpe1xuICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gIGlmIChzdGF0dXMgPT09IDEyMjMpIHtcbiAgICBzdGF0dXMgPSAyMDQ7XG4gIH1cblxuICB2YXIgdHlwZSA9IHN0YXR1cyAvIDEwMCB8IDA7XG5cbiAgLy8gc3RhdHVzIC8gY2xhc3NcbiAgdGhpcy5zdGF0dXMgPSB0aGlzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XG4gIHRoaXMuc3RhdHVzVHlwZSA9IHR5cGU7XG5cbiAgLy8gYmFzaWNzXG4gIHRoaXMuaW5mbyA9IDEgPT0gdHlwZTtcbiAgdGhpcy5vayA9IDIgPT0gdHlwZTtcbiAgdGhpcy5jbGllbnRFcnJvciA9IDQgPT0gdHlwZTtcbiAgdGhpcy5zZXJ2ZXJFcnJvciA9IDUgPT0gdHlwZTtcbiAgdGhpcy5lcnJvciA9ICg0ID09IHR5cGUgfHwgNSA9PSB0eXBlKVxuICAgID8gdGhpcy50b0Vycm9yKClcbiAgICA6IGZhbHNlO1xuXG4gIC8vIHN1Z2FyXG4gIHRoaXMuYWNjZXB0ZWQgPSAyMDIgPT0gc3RhdHVzO1xuICB0aGlzLm5vQ29udGVudCA9IDIwNCA9PSBzdGF0dXM7XG4gIHRoaXMuYmFkUmVxdWVzdCA9IDQwMCA9PSBzdGF0dXM7XG4gIHRoaXMudW5hdXRob3JpemVkID0gNDAxID09IHN0YXR1cztcbiAgdGhpcy5ub3RBY2NlcHRhYmxlID0gNDA2ID09IHN0YXR1cztcbiAgdGhpcy5ub3RGb3VuZCA9IDQwNCA9PSBzdGF0dXM7XG4gIHRoaXMuZm9yYmlkZGVuID0gNDAzID09IHN0YXR1cztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGBFcnJvcmAgcmVwcmVzZW50YXRpdmUgb2YgdGhpcyByZXNwb25zZS5cbiAqXG4gKiBAcmV0dXJuIHtFcnJvcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLnRvRXJyb3IgPSBmdW5jdGlvbigpe1xuICB2YXIgcmVxID0gdGhpcy5yZXE7XG4gIHZhciBtZXRob2QgPSByZXEubWV0aG9kO1xuICB2YXIgdXJsID0gcmVxLnVybDtcblxuICB2YXIgbXNnID0gJ2Nhbm5vdCAnICsgbWV0aG9kICsgJyAnICsgdXJsICsgJyAoJyArIHRoaXMuc3RhdHVzICsgJyknO1xuICB2YXIgZXJyID0gbmV3IEVycm9yKG1zZyk7XG4gIGVyci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgZXJyLm1ldGhvZCA9IG1ldGhvZDtcbiAgZXJyLnVybCA9IHVybDtcblxuICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBFeHBvc2UgYFJlc3BvbnNlYC5cbiAqL1xuXG5yZXF1ZXN0LlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdGAgd2l0aCB0aGUgZ2l2ZW4gYG1ldGhvZGAgYW5kIGB1cmxgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdChtZXRob2QsIHVybCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkgfHwgW107XG4gIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICB0aGlzLnVybCA9IHVybDtcbiAgdGhpcy5oZWFkZXIgPSB7fTsgLy8gcHJlc2VydmVzIGhlYWRlciBuYW1lIGNhc2VcbiAgdGhpcy5faGVhZGVyID0ge307IC8vIGNvZXJjZXMgaGVhZGVyIG5hbWVzIHRvIGxvd2VyY2FzZVxuICB0aGlzLm9uKCdlbmQnLCBmdW5jdGlvbigpe1xuICAgIHZhciBlcnIgPSBudWxsO1xuICAgIHZhciByZXMgPSBudWxsO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IG5ldyBSZXNwb25zZShzZWxmKTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGVyciA9IG5ldyBFcnJvcignUGFyc2VyIGlzIHVuYWJsZSB0byBwYXJzZSB0aGUgcmVzcG9uc2UnKTtcbiAgICAgIGVyci5wYXJzZSA9IHRydWU7XG4gICAgICBlcnIub3JpZ2luYWwgPSBlO1xuICAgICAgLy8gaXNzdWUgIzY3NTogcmV0dXJuIHRoZSByYXcgcmVzcG9uc2UgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcbiAgICAgIGVyci5yYXdSZXNwb25zZSA9IHNlbGYueGhyICYmIHNlbGYueGhyLnJlc3BvbnNlVGV4dCA/IHNlbGYueGhyLnJlc3BvbnNlVGV4dCA6IG51bGw7XG4gICAgICAvLyBpc3N1ZSAjODc2OiByZXR1cm4gdGhlIGh0dHAgc3RhdHVzIGNvZGUgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcbiAgICAgIGVyci5zdGF0dXNDb2RlID0gc2VsZi54aHIgJiYgc2VsZi54aHIuc3RhdHVzID8gc2VsZi54aHIuc3RhdHVzIDogbnVsbDtcbiAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5jYWxsYmFjayhlcnIsIHJlcyk7XG4gICAgfVxuXG4gICAgaWYgKHJlcy5zdGF0dXMgPj0gMjAwICYmIHJlcy5zdGF0dXMgPCAzMDApIHtcbiAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVyciwgcmVzKTtcbiAgICB9XG5cbiAgICB2YXIgbmV3X2VyciA9IG5ldyBFcnJvcihyZXMuc3RhdHVzVGV4dCB8fCAnVW5zdWNjZXNzZnVsIEhUVFAgcmVzcG9uc2UnKTtcbiAgICBuZXdfZXJyLm9yaWdpbmFsID0gZXJyO1xuICAgIG5ld19lcnIucmVzcG9uc2UgPSByZXM7XG4gICAgbmV3X2Vyci5zdGF0dXMgPSByZXMuc3RhdHVzO1xuXG4gICAgc2VsZi5jYWxsYmFjayhuZXdfZXJyLCByZXMpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBNaXhpbiBgRW1pdHRlcmAgYW5kIGByZXF1ZXN0QmFzZWAuXG4gKi9cblxuRW1pdHRlcihSZXF1ZXN0LnByb3RvdHlwZSk7XG5mb3IgKHZhciBrZXkgaW4gcmVxdWVzdEJhc2UpIHtcbiAgUmVxdWVzdC5wcm90b3R5cGVba2V5XSA9IHJlcXVlc3RCYXNlW2tleV07XG59XG5cbi8qKlxuICogQWJvcnQgdGhlIHJlcXVlc3QsIGFuZCBjbGVhciBwb3RlbnRpYWwgdGltZW91dC5cbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLmFib3J0ZWQpIHJldHVybjtcbiAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgdGhpcy54aHIgJiYgdGhpcy54aHIuYWJvcnQoKTtcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcbiAgdGhpcy5lbWl0KCdhYm9ydCcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IENvbnRlbnQtVHlwZSB0byBgdHlwZWAsIG1hcHBpbmcgdmFsdWVzIGZyb20gYHJlcXVlc3QudHlwZXNgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcbiAqICAgICAgICAudHlwZSgnYXBwbGljYXRpb24veG1sJylcbiAqICAgICAgICAuc2VuZCh4bWxzdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS50eXBlID0gZnVuY3Rpb24odHlwZSl7XG4gIHRoaXMuc2V0KCdDb250ZW50LVR5cGUnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHJlc3BvbnNlVHlwZSB0byBgdmFsYC4gUHJlc2VudGx5IHZhbGlkIHJlc3BvbnNlVHlwZXMgYXJlICdibG9iJyBhbmQgXG4gKiAnYXJyYXlidWZmZXInLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnJlc3BvbnNlVHlwZSgnYmxvYicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnJlc3BvbnNlVHlwZSA9IGZ1bmN0aW9uKHZhbCl7XG4gIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQWNjZXB0JywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXNzXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycgb3IgJ2Jhc2ljJyAoZGVmYXVsdCAnYmFzaWMnKVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbih1c2VyLCBwYXNzLCBvcHRpb25zKXtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHR5cGU6ICdiYXNpYydcbiAgICB9XG4gIH1cblxuICBzd2l0Y2ggKG9wdGlvbnMudHlwZSkge1xuICAgIGNhc2UgJ2Jhc2ljJzpcbiAgICAgIHZhciBzdHIgPSBidG9hKHVzZXIgKyAnOicgKyBwYXNzKTtcbiAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0Jhc2ljICcgKyBzdHIpO1xuICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYXV0byc6XG4gICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcjtcbiAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzO1xuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4qIEFkZCBxdWVyeS1zdHJpbmcgYHZhbGAuXG4qXG4qIEV4YW1wbGVzOlxuKlxuKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuKiAgICAgLnF1ZXJ5KCdzaXplPTEwJylcbiogICAgIC5xdWVyeSh7IGNvbG9yOiAnYmx1ZScgfSlcbipcbiogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSB2YWxcbiogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4qIEBhcGkgcHVibGljXG4qL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uKHZhbCl7XG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSBzZXJpYWxpemUodmFsKTtcbiAgaWYgKHZhbCkgdGhpcy5fcXVlcnkucHVzaCh2YWwpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUXVldWUgdGhlIGdpdmVuIGBmaWxlYCBhcyBhbiBhdHRhY2htZW50IHRvIHRoZSBzcGVjaWZpZWQgYGZpZWxkYCxcbiAqIHdpdGggb3B0aW9uYWwgYGZpbGVuYW1lYC5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5hdHRhY2gobmV3IEJsb2IoWyc8YSBpZD1cImFcIj48YiBpZD1cImJcIj5oZXkhPC9iPjwvYT4nXSwgeyB0eXBlOiBcInRleHQvaHRtbFwifSkpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcGFyYW0ge0Jsb2J8RmlsZX0gZmlsZVxuICogQHBhcmFtIHtTdHJpbmd9IGZpbGVuYW1lXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24oZmllbGQsIGZpbGUsIGZpbGVuYW1lKXtcbiAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIGZpbGVuYW1lIHx8IGZpbGUubmFtZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2dldEZvcm1EYXRhID0gZnVuY3Rpb24oKXtcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSkge1xuICAgIHRoaXMuX2Zvcm1EYXRhID0gbmV3IHJvb3QuRm9ybURhdGEoKTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZm9ybURhdGE7XG59O1xuXG4vKipcbiAqIFNlbmQgYGRhdGFgIGFzIHRoZSByZXF1ZXN0IGJvZHksIGRlZmF1bHRpbmcgdGhlIGAudHlwZSgpYCB0byBcImpzb25cIiB3aGVuXG4gKiBhbiBvYmplY3QgaXMgZ2l2ZW4uXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gbWFudWFsIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnanNvbicpXG4gKiAgICAgICAgIC5zZW5kKCd7XCJuYW1lXCI6XCJ0alwifScpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byBqc29uXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gbWFudWFsIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdmb3JtJylcbiAqICAgICAgICAgLnNlbmQoJ25hbWU9dGonKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGF1dG8geC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBkZWZhdWx0cyB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgKiAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAgKiAgICAgICAgLnNlbmQoJ3NwZWNpZXM9ZmVycmV0JylcbiAgKiAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGFcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24oZGF0YSl7XG4gIHZhciBvYmogPSBpc09iamVjdChkYXRhKTtcbiAgdmFyIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuXG4gIC8vIG1lcmdlXG4gIGlmIChvYmogJiYgaXNPYmplY3QodGhpcy5fZGF0YSkpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YVtrZXldID0gZGF0YVtrZXldO1xuICAgIH1cbiAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgZGF0YSkge1xuICAgIGlmICghdHlwZSkgdGhpcy50eXBlKCdmb3JtJyk7XG4gICAgdHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgaWYgKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnID09IHR5cGUpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAgID8gdGhpcy5fZGF0YSArICcmJyArIGRhdGFcbiAgICAgICAgOiBkYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9kYXRhID0gKHRoaXMuX2RhdGEgfHwgJycpICsgZGF0YTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIH1cblxuICBpZiAoIW9iaiB8fCBpc0hvc3QoZGF0YSkpIHJldHVybiB0aGlzO1xuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqL1xuUmVzcG9uc2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gc2VyaWFsaXplKGZuKXtcbiAgaWYgKHJvb3QuY29uc29sZSkge1xuICAgIGNvbnNvbGUud2FybihcIkNsaWVudC1zaWRlIHBhcnNlKCkgbWV0aG9kIGhhcyBiZWVuIHJlbmFtZWQgdG8gc2VyaWFsaXplKCkuIFRoaXMgbWV0aG9kIGlzIG5vdCBjb21wYXRpYmxlIHdpdGggc3VwZXJhZ2VudCB2Mi4wXCIpO1xuICB9XG4gIHRoaXMuc2VyaWFsaXplKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNwb25zZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24gc2VyaWFsaXplKGZuKXtcbiAgdGhpcy5fcGFyc2VyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgdmFyIGZuID0gdGhpcy5fY2FsbGJhY2s7XG4gIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG4gIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgaGFzIGJlZW4gdGVybWluYXRlZFxcblBvc3NpYmxlIGNhdXNlczogdGhlIG5ldHdvcmsgaXMgb2ZmbGluZSwgT3JpZ2luIGlzIG5vdCBhbGxvd2VkIGJ5IEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiwgdGhlIHBhZ2UgaXMgYmVpbmcgdW5sb2FkZWQsIGV0Yy4nKTtcbiAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggdGltZW91dCBlcnJvci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS50aW1lb3V0RXJyb3IgPSBmdW5jdGlvbigpe1xuICB2YXIgdGltZW91dCA9IHRoaXMuX3RpbWVvdXQ7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ3RpbWVvdXQgb2YgJyArIHRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnKTtcbiAgZXJyLnRpbWVvdXQgPSB0aW1lb3V0O1xuICB0aGlzLmNhbGxiYWNrKGVycik7XG59O1xuXG4vKipcbiAqIEVuYWJsZSB0cmFuc21pc3Npb24gb2YgY29va2llcyB3aXRoIHgtZG9tYWluIHJlcXVlc3RzLlxuICpcbiAqIE5vdGUgdGhhdCBmb3IgdGhpcyB0byB3b3JrIHRoZSBvcmlnaW4gbXVzdCBub3QgYmVcbiAqIHVzaW5nIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCIgd2l0aCBhIHdpbGRjYXJkLFxuICogYW5kIGFsc28gbXVzdCBzZXQgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFsc1wiXG4gKiB0byBcInRydWVcIi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLndpdGhDcmVkZW50aWFscyA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuX3dpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oZm4pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gIHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LmpvaW4oJyYnKTtcbiAgdmFyIHRpbWVvdXQgPSB0aGlzLl90aW1lb3V0O1xuICB2YXIgZGF0YSA9IHRoaXMuX2Zvcm1EYXRhIHx8IHRoaXMuX2RhdGE7XG5cbiAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgdGhpcy5fY2FsbGJhY2sgPSBmbiB8fCBub29wO1xuXG4gIC8vIHN0YXRlIGNoYW5nZVxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICBpZiAoNCAhPSB4aHIucmVhZHlTdGF0ZSkgcmV0dXJuO1xuXG4gICAgLy8gSW4gSUU5LCByZWFkcyB0byBhbnkgcHJvcGVydHkgKGUuZy4gc3RhdHVzKSBvZmYgb2YgYW4gYWJvcnRlZCBYSFIgd2lsbFxuICAgIC8vIHJlc3VsdCBpbiB0aGUgZXJyb3IgXCJDb3VsZCBub3QgY29tcGxldGUgdGhlIG9wZXJhdGlvbiBkdWUgdG8gZXJyb3IgYzAwYzAyM2ZcIlxuICAgIHZhciBzdGF0dXM7XG4gICAgdHJ5IHsgc3RhdHVzID0geGhyLnN0YXR1cyB9IGNhdGNoKGUpIHsgc3RhdHVzID0gMDsgfVxuXG4gICAgaWYgKDAgPT0gc3RhdHVzKSB7XG4gICAgICBpZiAoc2VsZi50aW1lZG91dCkgcmV0dXJuIHNlbGYudGltZW91dEVycm9yKCk7XG4gICAgICBpZiAoc2VsZi5hYm9ydGVkKSByZXR1cm47XG4gICAgICByZXR1cm4gc2VsZi5jcm9zc0RvbWFpbkVycm9yKCk7XG4gICAgfVxuICAgIHNlbGYuZW1pdCgnZW5kJyk7XG4gIH07XG5cbiAgLy8gcHJvZ3Jlc3NcbiAgdmFyIGhhbmRsZVByb2dyZXNzID0gZnVuY3Rpb24oZSl7XG4gICAgaWYgKGUudG90YWwgPiAwKSB7XG4gICAgICBlLnBlcmNlbnQgPSBlLmxvYWRlZCAvIGUudG90YWwgKiAxMDA7XG4gICAgfVxuICAgIGUuZGlyZWN0aW9uID0gJ2Rvd25sb2FkJztcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gIH07XG4gIGlmICh0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xuICAgIHhoci5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3M7XG4gIH1cbiAgdHJ5IHtcbiAgICBpZiAoeGhyLnVwbG9hZCAmJiB0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xuICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3M7XG4gICAgfVxuICB9IGNhdGNoKGUpIHtcbiAgICAvLyBBY2Nlc3NpbmcgeGhyLnVwbG9hZCBmYWlscyBpbiBJRSBmcm9tIGEgd2ViIHdvcmtlciwgc28ganVzdCBwcmV0ZW5kIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgzNzI0NS94bWxodHRwcmVxdWVzdC11cGxvYWQtdGhyb3dzLWludmFsaWQtYXJndW1lbnQtd2hlbi11c2VkLWZyb20td2ViLXdvcmtlci1jb250ZXh0XG4gIH1cblxuICAvLyB0aW1lb3V0XG4gIGlmICh0aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgc2VsZi50aW1lZG91dCA9IHRydWU7XG4gICAgICBzZWxmLmFib3J0KCk7XG4gICAgfSwgdGltZW91dCk7XG4gIH1cblxuICAvLyBxdWVyeXN0cmluZ1xuICBpZiAocXVlcnkpIHtcbiAgICBxdWVyeSA9IHJlcXVlc3Quc2VyaWFsaXplT2JqZWN0KHF1ZXJ5KTtcbiAgICB0aGlzLnVybCArPSB+dGhpcy51cmwuaW5kZXhPZignPycpXG4gICAgICA/ICcmJyArIHF1ZXJ5XG4gICAgICA6ICc/JyArIHF1ZXJ5O1xuICB9XG5cbiAgLy8gaW5pdGlhdGUgcmVxdWVzdFxuICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgfSBlbHNlIHtcbiAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUpO1xuICB9XG5cbiAgLy8gQ09SU1xuICBpZiAodGhpcy5fd2l0aENyZWRlbnRpYWxzKSB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblxuICAvLyBib2R5XG4gIGlmICgnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIWlzSG9zdChkYXRhKSkge1xuICAgIC8vIHNlcmlhbGl6ZSBzdHVmZlxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3BhcnNlciB8fCByZXF1ZXN0LnNlcmlhbGl6ZVtjb250ZW50VHlwZSA/IGNvbnRlbnRUeXBlLnNwbGl0KCc7JylbMF0gOiAnJ107XG4gICAgaWYgKCFzZXJpYWxpemUgJiYgaXNKU09OKGNvbnRlbnRUeXBlKSkgc2VyaWFsaXplID0gcmVxdWVzdC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICBpZiAoc2VyaWFsaXplKSBkYXRhID0gc2VyaWFsaXplKGRhdGEpO1xuICB9XG5cbiAgLy8gc2V0IGhlYWRlciBmaWVsZHNcbiAgZm9yICh2YXIgZmllbGQgaW4gdGhpcy5oZWFkZXIpIHtcbiAgICBpZiAobnVsbCA9PSB0aGlzLmhlYWRlcltmaWVsZF0pIGNvbnRpbnVlO1xuICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGZpZWxkLCB0aGlzLmhlYWRlcltmaWVsZF0pO1xuICB9XG5cbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG4gIH1cblxuICAvLyBzZW5kIHN0dWZmXG4gIHRoaXMuZW1pdCgncmVxdWVzdCcsIHRoaXMpO1xuXG4gIC8vIElFMTEgeGhyLnNlbmQodW5kZWZpbmVkKSBzZW5kcyAndW5kZWZpbmVkJyBzdHJpbmcgYXMgUE9TVCBwYXlsb2FkIChpbnN0ZWFkIG9mIG5vdGhpbmcpXG4gIC8vIFdlIG5lZWQgbnVsbCBoZXJlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gIHhoci5zZW5kKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJyA/IGRhdGEgOiBudWxsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogRXhwb3NlIGBSZXF1ZXN0YC5cbiAqL1xuXG5yZXF1ZXN0LlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIEdFVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBkYXRhIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0dFVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IGRhdGEgb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LmhlYWQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0hFQUQnLCB1cmwpO1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBERUxFVEUgYHVybGAgd2l0aCBvcHRpb25hbCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRlbCh1cmwsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0RFTEVURScsIHVybCk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG5yZXF1ZXN0WydkZWwnXSA9IGRlbDtcbnJlcXVlc3RbJ2RlbGV0ZSddID0gZGVsO1xuXG4vKipcbiAqIFBBVENIIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gZGF0YVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BPU1QnLCB1cmwpO1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBQVVQgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBkYXRhIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wdXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BVVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuIiwiLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhbiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzT2JqZWN0KG9iaikge1xuICByZXR1cm4gbnVsbCAhPSBvYmogJiYgJ29iamVjdCcgPT0gdHlwZW9mIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIENsZWFyIHByZXZpb3VzIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpe1xuICB0aGlzLl90aW1lb3V0ID0gMDtcbiAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEZvcmNlIGdpdmVuIHBhcnNlclxuICpcbiAqIFNldHMgdGhlIGJvZHkgcGFyc2VyIG5vIG1hdHRlciB0eXBlLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiBwYXJzZShmbil7XG4gIHRoaXMuX3BhcnNlciA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRpbWVvdXQgdG8gYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG1zKXtcbiAgdGhpcy5fdGltZW91dCA9IG1zO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRmF1eCBwcm9taXNlIHN1cHBvcnRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RcbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKi9cblxuZXhwb3J0cy50aGVuID0gZnVuY3Rpb24gdGhlbihmdWxmaWxsLCByZWplY3QpIHtcbiAgcmV0dXJuIHRoaXMuZW5kKGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gICAgZXJyID8gcmVqZWN0KGVycikgOiBmdWxmaWxsKHJlcyk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEFsbG93IGZvciBleHRlbnNpb25cbiAqL1xuXG5leHBvcnRzLnVzZSA9IGZ1bmN0aW9uIHVzZShmbikge1xuICBmbih0aGlzKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBHZXQgcmVxdWVzdCBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xuICByZXR1cm4gdGhpcy5faGVhZGVyW2ZpZWxkLnRvTG93ZXJDYXNlKCldO1xufTtcblxuLyoqXG4gKiBHZXQgY2FzZS1pbnNlbnNpdGl2ZSBoZWFkZXIgYGZpZWxkYCB2YWx1ZS5cbiAqIFRoaXMgaXMgYSBkZXByZWNhdGVkIGludGVybmFsIEFQSS4gVXNlIGAuZ2V0KGZpZWxkKWAgaW5zdGVhZC5cbiAqXG4gKiAoZ2V0SGVhZGVyIGlzIG5vIGxvbmdlciB1c2VkIGludGVybmFsbHkgYnkgdGhlIHN1cGVyYWdlbnQgY29kZSBiYXNlKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAZGVwcmVjYXRlZFxuICovXG5cbmV4cG9ydHMuZ2V0SGVhZGVyID0gZXhwb3J0cy5nZXQ7XG5cbi8qKlxuICogU2V0IGhlYWRlciBgZmllbGRgIHRvIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0LlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuc2V0KCdYLUFQSS1LZXknLCAnZm9vYmFyJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoeyBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJywgJ1gtQVBJLUtleSc6ICdmb29iYXInIH0pXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBmaWVsZFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24oZmllbGQsIHZhbCl7XG4gIGlmIChpc09iamVjdChmaWVsZCkpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gZmllbGQpIHtcbiAgICAgIHRoaXMuc2V0KGtleSwgZmllbGRba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXSA9IHZhbDtcbiAgdGhpcy5oZWFkZXJbZmllbGRdID0gdmFsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhlYWRlciBgZmllbGRgLlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnVuc2V0KCdVc2VyLUFnZW50JylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqL1xuZXhwb3J0cy51bnNldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgZGVsZXRlIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbiAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIHRoZSBmaWVsZCBgbmFtZWAgYW5kIGB2YWxgIGZvciBcIm11bHRpcGFydC9mb3JtLWRhdGFcIlxuICogcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoJ2ZvbycsICdiYXInKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnRzLmZpZWxkID0gZnVuY3Rpb24obmFtZSwgdmFsKSB7XG4gIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKG5hbWUsIHZhbCk7XG4gIHJldHVybiB0aGlzO1xufTtcbiIsIi8vIFRoZSBub2RlIGFuZCBicm93c2VyIG1vZHVsZXMgZXhwb3NlIHZlcnNpb25zIG9mIHRoaXMgd2l0aCB0aGVcbi8vIGFwcHJvcHJpYXRlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGJvdW5kIGFzIGZpcnN0IGFyZ3VtZW50XG4vKipcbiAqIElzc3VlIGEgcmVxdWVzdDpcbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICByZXF1ZXN0KCdHRVQnLCAnL3VzZXJzJykuZW5kKGNhbGxiYWNrKVxuICogICAgcmVxdWVzdCgnL3VzZXJzJykuZW5kKGNhbGxiYWNrKVxuICogICAgcmVxdWVzdCgnL3VzZXJzJywgY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd8RnVuY3Rpb259IHVybCBvciBjYWxsYmFja1xuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gcmVxdWVzdChSZXF1ZXN0Q29uc3RydWN0b3IsIG1ldGhvZCwgdXJsKSB7XG4gIC8vIGNhbGxiYWNrXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiB1cmwpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3RDb25zdHJ1Y3RvcignR0VUJywgbWV0aG9kKS5lbmQodXJsKTtcbiAgfVxuXG4gIC8vIHVybCBmaXJzdFxuICBpZiAoMiA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0Q29uc3RydWN0b3IoJ0dFVCcsIG1ldGhvZCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJlcXVlc3RDb25zdHJ1Y3RvcihtZXRob2QsIHVybCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdDtcbiIsIi8vIEFuZ3VsYXIgMSBtb2R1bGVzIGFuZCBmYWN0b3JpZXMgZm9yIHRoZSBidW5kbGVcblxuaWYgKHR5cGVvZiBhbmd1bGFyID09PSAnb2JqZWN0JyAmJiBhbmd1bGFyLm1vZHVsZSkge1xuXG4gIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgSW9uaWMuY29yZS5pbml0KCk7XG4gICAgSW9uaWMuY29yZG92YS5ib290c3RyYXAoKTtcbiAgfSk7XG5cbiAgYW5ndWxhci5tb2R1bGUoJ2lvbmljLmNsb3VkJywgW10pXG5cbiAgLnByb3ZpZGVyKCckaW9uaWNDbG91ZENvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb25maWcgPSBJb25pYy5jb25maWc7XG5cbiAgICB0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgIGNvbmZpZy5yZWdpc3RlcihzZXR0aW5ncyk7XG4gICAgfTtcblxuICAgIHRoaXMuJGdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuICB9KVxuXG4gIC5wcm92aWRlcignJGlvbmljQ2xvdWQnLCBbJyRpb25pY0Nsb3VkQ29uZmlnUHJvdmlkZXInLCBmdW5jdGlvbigkaW9uaWNDbG91ZENvbmZpZ1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5pbml0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICRpb25pY0Nsb3VkQ29uZmlnUHJvdmlkZXIucmVnaXN0ZXIodmFsdWUpO1xuICAgIH07XG5cbiAgICB0aGlzLiRnZXQgPSBbZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gSW9uaWMuY29yZTtcbiAgICB9XTtcbiAgfV0pXG5cbiAgLmZhY3RvcnkoJyRpb25pY0Nsb3VkQ2xpZW50JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiBJb25pYy5jbGllbnQ7XG4gIH1dKVxuXG4gIC5mYWN0b3J5KCckaW9uaWNVc2VyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiBJb25pYy5zaW5nbGVVc2VyU2VydmljZS5jdXJyZW50KCk7XG4gIH1dKVxuXG4gIC5mYWN0b3J5KCckaW9uaWNBdXRoJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiBJb25pYy5hdXRoO1xuICB9XSlcblxuICAuZmFjdG9yeSgnJGlvbmljUHVzaCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSW9uaWMucHVzaDtcbiAgfV0pXG5cbiAgLmZhY3RvcnkoJyRpb25pY0RlcGxveScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSW9uaWMuZGVwbG95O1xuICB9XSlcblxuICAucnVuKFsnJHdpbmRvdycsICckcScsICckcm9vdFNjb3BlJywgZnVuY3Rpb24oJHdpbmRvdywgJHEsICRyb290U2NvcGUpIHtcbiAgICBpZiAodHlwZW9mICR3aW5kb3cuUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICR3aW5kb3cuUHJvbWlzZSA9ICRxO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5pdCA9IElvbmljLkNsb3VkLkRlZmVycmVkUHJvbWlzZS5wcm90b3R5cGUuaW5pdDtcblxuICAgICAgSW9uaWMuQ2xvdWQuRGVmZXJyZWRQcm9taXNlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5wcm9taXNlID0gJHEud2hlbih0aGlzLnByb21pc2UpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgZW1pdCA9IElvbmljLkNsb3VkLkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdDtcblxuICAgIElvbmljLkNsb3VkLkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcbiAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnY2xvdWQ6JyArIG5hbWUsIGRhdGEpO1xuICAgICAgcmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsInZhciBDb3JlID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvY29yZVwiKS5Db3JlO1xudmFyIERhdGFUeXBlID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvdXNlci9kYXRhLXR5cGVzXCIpLkRhdGFUeXBlO1xudmFyIERlcGxveSA9IHJlcXVpcmUoXCIuLy4uL2Rpc3QvZXM1L2RlcGxveS9kZXBsb3lcIikuRGVwbG95O1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLy4uL2Rpc3QvZXM1L2V2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvbG9nZ2VyXCIpLkxvZ2dlcjtcbnZhciBQdXNoID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvcHVzaC9wdXNoXCIpLlB1c2g7XG52YXIgUHVzaE1lc3NhZ2UgPSByZXF1aXJlKFwiLi8uLi9kaXN0L2VzNS9wdXNoL21lc3NhZ2VcIikuUHVzaE1lc3NhZ2U7XG52YXIgYXV0aCA9IHJlcXVpcmUoXCIuLy4uL2Rpc3QvZXM1L2F1dGhcIik7XG52YXIgY2xpZW50ID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvY2xpZW50XCIpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuLy4uL2Rpc3QvZXM1L2NvbmZpZ1wiKTtcbnZhciBjb3Jkb3ZhID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvY29yZG92YVwiKTtcbnZhciBkZXZpY2UgPSByZXF1aXJlKFwiLi8uLi9kaXN0L2VzNS9kZXZpY2VcIik7XG52YXIgZGkgPSByZXF1aXJlKFwiLi8uLi9kaXN0L2VzNS9kaVwiKTtcbnZhciBwcm9taXNlID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvcHJvbWlzZVwiKTtcbnZhciBzdG9yYWdlID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvc3RvcmFnZVwiKTtcbnZhciB1c2VyID0gcmVxdWlyZShcIi4vLi4vZGlzdC9lczUvdXNlci91c2VyXCIpO1xuXG4vLyBEZWNsYXJlIHRoZSB3aW5kb3cgb2JqZWN0XG53aW5kb3cuSW9uaWMgPSBuZXcgZGkuQ29udGFpbmVyKCk7XG5cbi8vIElvbmljIE1vZHVsZXNcbklvbmljLkNvcmUgPSBDb3JlO1xuSW9uaWMuVXNlciA9IHVzZXIuVXNlcjtcbklvbmljLkF1dGggPSBhdXRoLkF1dGg7XG5Jb25pYy5EZXBsb3kgPSBEZXBsb3k7XG5Jb25pYy5QdXNoID0gUHVzaDtcbklvbmljLlB1c2hNZXNzYWdlID0gUHVzaE1lc3NhZ2U7XG5cbi8vIERhdGFUeXBlIE5hbWVzcGFjZVxuSW9uaWMuRGF0YVR5cGUgPSBEYXRhVHlwZTtcbklvbmljLkRhdGFUeXBlcyA9IERhdGFUeXBlLmdldE1hcHBpbmcoKTtcblxuLy8gQ2xvdWQgTmFtZXNwYWNlXG5Jb25pYy5DbG91ZCA9IHt9O1xuSW9uaWMuQ2xvdWQuQXV0aFR5cGUgPSBhdXRoLkF1dGhUeXBlO1xuSW9uaWMuQ2xvdWQuQXV0aFR5cGVzID0ge307XG5Jb25pYy5DbG91ZC5BdXRoVHlwZXMuQmFzaWNBdXRoID0gYXV0aC5CYXNpY0F1dGg7XG5Jb25pYy5DbG91ZC5BdXRoVHlwZXMuQ3VzdG9tQXV0aCA9IGF1dGguQ3VzdG9tQXV0aDtcbklvbmljLkNsb3VkLkF1dGhUeXBlcy5Ud2l0dGVyQXV0aCA9IGF1dGguVHdpdHRlckF1dGg7XG5Jb25pYy5DbG91ZC5BdXRoVHlwZXMuRmFjZWJvb2tBdXRoID0gYXV0aC5GYWNlYm9va0F1dGg7XG5Jb25pYy5DbG91ZC5BdXRoVHlwZXMuR2l0aHViQXV0aCA9IGF1dGguR2l0aHViQXV0aDtcbklvbmljLkNsb3VkLkF1dGhUeXBlcy5Hb29nbGVBdXRoID0gYXV0aC5Hb29nbGVBdXRoO1xuSW9uaWMuQ2xvdWQuQXV0aFR5cGVzLkluc3RhZ3JhbUF1dGggPSBhdXRoLkluc3RhZ3JhbUF1dGg7XG5Jb25pYy5DbG91ZC5BdXRoVHlwZXMuTGlua2VkSW5BdXRoID0gYXV0aC5MaW5rZWRJbkF1dGg7XG5Jb25pYy5DbG91ZC5Db3Jkb3ZhID0gY29yZG92YS5Db3Jkb3ZhO1xuSW9uaWMuQ2xvdWQuQ2xpZW50ID0gY2xpZW50LkNsaWVudDtcbklvbmljLkNsb3VkLkRldmljZSA9IGRldmljZS5EZXZpY2U7XG5Jb25pYy5DbG91ZC5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5Jb25pYy5DbG91ZC5Mb2dnZXIgPSBMb2dnZXI7XG5Jb25pYy5DbG91ZC5EZWZlcnJlZFByb21pc2UgPSBwcm9taXNlLkRlZmVycmVkUHJvbWlzZTtcbklvbmljLkNsb3VkLlN0b3JhZ2UgPSBzdG9yYWdlLlN0b3JhZ2U7XG5Jb25pYy5DbG91ZC5Vc2VyQ29udGV4dCA9IHVzZXIuVXNlckNvbnRleHQ7XG5Jb25pYy5DbG91ZC5TaW5nbGVVc2VyU2VydmljZSA9IHVzZXIuU2luZ2xlVXNlclNlcnZpY2U7XG5Jb25pYy5DbG91ZC5BdXRoVG9rZW5Db250ZXh0ID0gYXV0aC5BdXRoVG9rZW5Db250ZXh0O1xuSW9uaWMuQ2xvdWQuQ29tYmluZWRBdXRoVG9rZW5Db250ZXh0ID0gYXV0aC5Db21iaW5lZEF1dGhUb2tlbkNvbnRleHQ7XG5Jb25pYy5DbG91ZC5Mb2NhbFN0b3JhZ2VTdHJhdGVneSA9IHN0b3JhZ2UuTG9jYWxTdG9yYWdlU3RyYXRlZ3k7XG5Jb25pYy5DbG91ZC5TZXNzaW9uU3RvcmFnZVN0cmF0ZWd5ID0gc3RvcmFnZS5TZXNzaW9uU3RvcmFnZVN0cmF0ZWd5O1xuSW9uaWMuQ2xvdWQuQ29uZmlnID0gY29uZmlnLkNvbmZpZztcbiJdfQ==
