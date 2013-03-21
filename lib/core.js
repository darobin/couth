
var _ =         require("underscore")
,   fs =        require("fs")
,   pth =       require("path")
;

// very basic logging
function verbose (msg) {
    console.log(msg);
}
function silent () {}
var clog = verbose;

// configuration helpers
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

function Couth (conf) {
    if (!conf) conf = {};
    this.conf = _.extend({
        target:     "dev"
    ,   debug:      false
    ,   silent:     false
    ,   session:    7776000 // 90 days
    ,   all:        { port: 5984 }
    ,   dev:        { port: 5984 }
    ,   prod:       { port: 5984 }
    ,   test:       { port: 5984 }
    }, conf);
    this.curTarget = "all";

    if (this.conf.silent) {
        clog = silent;
        this.log = silent;
    }
    else {
        this.log = verbose;
    }
    this.design = {
        _id:        "_design/couth"
    // ,   signatures: {}
    ,   views:      {}
    ,   lib:       {}
    ,   types:      {}
    ,   updates:    {}
    // ,   shows:      {}
    ,   lists:      {}
    // ,   templates:  {}
    };
    this.requests = [];
    this.rewrites = [];
    this.types = {};
    this.libCache = {};
    // this.scripts = {};
    this.seenAttachment = {};
}

Couth.prototype = {
    // deployment target: dev, prod, test
    target: setOrReturn("target")
    // debug: boolean
,   debug:  setOrReturn("debug")
    // silent: boolean
,   silent: setOrReturn("silent")
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
,   index:      targetedSetOrReturn("index")
,   webAppRoot: targetedSetOrReturn("webAppRoot")
,   session:    targetedSetOrReturn("session")
,   exposeUsers:    targetedSetOrReturn("exposeUsers")
// ,   layout:     targetedSetOrReturn("layout")
// ,   defaultEngine:  targetedSetOrReturn("defaultEngine")
// ,   lib:        targetedPushOrReturn("lib")
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
        if (ret.deployTo) ret.deployTo = ret.deployTo.replace(/\/$/, "");
        return ret;
    }
,   error:  function (msg) {
        this.log("[ERROR] " + msg);
        throw new Error(msg);
    }
,   readRelFile:    function (path) {
        return fs.readFileSync(pth.join(__dirname, path), "utf8");
    }
    // all content can be either a string path to a file, or a buffer
,   loadContent:    function (source) {
        if (_.isString(source)) return fs.readFileSync(source);
        else return source;
    }
,   loadConfigFile: function (path) {
        var conf = JSON.parse(fs.readFileSync(path, "utf8"));
        for (var target in conf) {
            if (!/^(all|dev|prod|test)$/.test(target)) {
                this.error("Unknown target in configuration: " + target);
            }
            this[target]();
            for (var item in conf[target]) {
                if (!this[item]) this.error("Unknown configuration parameter: " + item);
                this[item](conf[target][item]);
            }
        }
    }
};

exports.Couth = Couth;
