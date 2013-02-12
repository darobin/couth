

var _ =         require("underscore")
,   nopt =      require("nopt")
;

function Couth (conf) {
    if (!conf) conf = {};
    this.conf = _.extend({
        target:     "dev"
    ,   debug:      false
    ,   silent:     false
    ,   all:        { port: 5984 }
    ,   dev:        { port: 5984 }
    ,   prod:       { port: 5984 }
    ,   test:       { port: 5984 }
    }, conf);
    this.curTarget = "all";
}

// helpers
function setOrReturn (field) {
    return function (value) {
        if (value) {
            this.conf[field] = value;
            return this;
        }
        else return this.conf[field];
    };
}

function targetedSetOrReturn (field) {
    return function (value) {
        if (value) {
            this.conf[this.curTarget][field] = value;
            return this;
        }
        else return this.conf[this.curTarget][field];
    };
}

// function targetedPushOrReturn (field) {
//     return function (value) {
//         if (!this.conf[this.curTarget][field]) this.conf[this.curTarget][field] = [];
//         if (value) {
//             this.conf[this.curTarget][field].push(value);
//             return this;
//         }
//         else return this.conf[this.curTarget][field];
//     };
// }

Couth.prototype = {
    // deployment target: dev, prod, test
    target: setOrReturn("target")
    // debug: boolean
,   debug:  setOrReturn("debug")
    // silent: boolean
,   silent: setOrReturn("silent")
    // process command-line options
,   cli:    function () {
        var knownOpts = {
                target: String
            ,   debug:  Boolean
            ,   silent: Boolean
            }
        ,   shortHands = {
                t:      ["--target"]
            ,   d:      ["--debug"]
            ,   s:      ["--silent"]
            ,   dev:    ["--target", "dev"]
            ,   prod:   ["--target", "prod"]
            }
        ,   opts = nopt(knownOpts, shortHands)
        ;
        if (opts.target) this.target(opts.target);
        if (opts.debug)  this.debug(opts.debug);
        if (opts.silent) this.silent(opts.silent);
        return this;
    }
    // set environment for subsequent configuration
,   all:    function () { this.curTarget = "all"; return this; }
,   dev:    function () { this.curTarget = "dev"; return this; }
,   prod:   function () { this.curTarget = "prod"; return this; }
,   test:   function () { this.curTarget = "test"; return this; }
    // configuration options
,   deployTo:   targetedSetOrReturn("deployTo")
,   port:       targetedSetOrReturn("port")
,   vhost:      targetedSetOrReturn("vhost")
,   auth:       targetedSetOrReturn("auth")
,   db:         targetedSetOrReturn("db")
// ,   favicon:    targetedSetOrReturn("favicon")
// ,   index:      targetedSetOrReturn("index")
// ,   layout:     targetedSetOrReturn("layout")
// ,   defaultEngine:  targetedSetOrReturn("defaultEngine")
// ,   lib:        targetedPushOrReturn("lib")
,   use:        function (baseRoute, app) {
        if (!this.conf[this.curTarget].apps) this.conf[this.curTarget].apps = {};
        this.conf[this.curTarget].apps[baseRoute] = app;
        return this;
    }
    // produce the configuration for the target
,   resolve:    function (target) {
        var target = target || this.conf.target
        ,   targets = "all dev prod test".split(" ")
        ;
        var ret = _.extend(this.conf, this.conf.all, this.conf[target]);
        ret.target = target;
        for (var i = 0, n = targets.length; i < n; i++) delete ret[targets[i]];
        if (ret.deployTo === ret.vhost)
            throw new Error("You should not use the same host for deployTo and vhost.");
        return ret;
    }
    // call the deployer
,   deploy: function (cb) {
        // XXX this needs implementation
        if (cb) cb();
    }
};


module.exports = function () {
    return new Couth();
};
