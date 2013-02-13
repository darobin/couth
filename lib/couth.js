

var _ =         require("underscore")
,   nopt =      require("nopt")
,   urlParser = require("url")
,   request =   require("request")
,   cradle =    require("cradle")
;

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

function setupDB (conf) {
    var cradleOpt = { host: conf.deployTo, port: conf.port };
    if (conf.auth) cradleOpt.auth = { username: conf.auth.username, password: conf.auth.password };
    return new cradle.Connection(cradleOpt).database(conf.db);
}
function verbose (msg) {
    console.log(msg);
}
function silent () {}
var clog = verbose;


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

    if (this.conf.silent) clog = silent;
    this.design = {
        _id:        "_design/couth"
    // ,   signatures: {}
    // ,   views:      {}
    // ,   libs:       {}
    // ,   types:      {}
    // ,   updates:    {}
    // ,   shows:      {}
    // ,   lists:      {}
    // ,   templates:  {}
    };
    this.requests = [];
    this.rewrites = [];
    // this.types = {};
    // this.scripts = {};
    this.cradle = setupDB(conf);
    this.prepareVHost();
}


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
,   error:  function (msg) {
        clog("[ERROR] " + msg);
        throw new Error(msg);
    }
    // call the deployer
,   deploy: function (done) {
        var self = this, conf = self.conf;
        this.loadCurrentDesign(function (err) {
            if (err) self.error("Problem loading current design document: [" + err.error + "] " + err.reason);
            if (conf.debug) self.fakeDeploy(done);
            else            self.realDeploy(done);
        });
    }
,   fakeDeploy: function (done) {
        clog(JSON.stringify(this.design, null, 4));
        _.each(this.requests, function (req) {
            clog("[" + req.reason + "]");
        });
        if (done) done(null);
    }
,   realDeploy: function (done) {
        var self = this;
        // requests MUST come after the design doc because some (e.g. attachments)
        // are not allowed before the document exists
        var makeRequest = function () {
            if (self.requests && self.requests.length) {
                var req = self.requests.shift();
                clog(req.reason);
                req.run(self.cradle, function (err) {
                    if (err) self.error(err);
                    clog("OK");
                    makeRequest();
                });
            }
            else {
                if (done) done(null);
            }
        };
        var deploy = function () {
            // deploy design doc
            clog("Installing couth design document");
            self.cradle.save(self.design, function (err, res) {
                if (err) self.error(err);
                clog("OK");
                self.design._rev = res._rev;
                makeRequest();
            });
        };
        
        self.cradle.exists(function (err, exists) {
            if (err) self.error(err);
            if (exists) deploy();
            else {
                self.cradle.create(function (err) {
                    if (err) self.error(err);
                    deploy();
                });
            }
        });
    }
,   loadCurrentDesign: function (cb) {
        var self = this;
        this.cradle.get("_design/couth", function (err, res) {
            if (err) {
                if (err.error === "not_found") {
                    cb(null, self.design);
                }
                else cb(err);
            }
            else {
                _.extend(self.design, res);
                // need to re-init things that are always generated
                self.design.rewrites = [];
                cb(null, self.design);
            }
        });
    }
,   addRequest: function (req) {
        this.requests.push(req);
    }
,   vhostInfo:  function () {
        var conf = this.conf
        ,   res = []
        ;
        if (!conf.vhost) return;
        if (!_.isArray(conf.vhost)) conf.vhost = [conf.vhost];
        _.each(conf.vhost, function (vh) {
            var url = urlParser.parse(conf.deployTo);
            delete url.host;
            if (conf.port) url.port = conf.port;
            if (conf.auth) url.auth = conf.auth.username + ":" + conf.auth.password;
            url.pathname = "/_config/vhosts/" + vh;
            res.push({ url: urlParser.format(url), body: "\"/" + conf.db + "/_design/couth/_rewrite\"", vh: vh });
        });
        return res;
    }
    // sets up the vhost server configuration
    // curl -X PUT http://${user}:${pass}@${host}/_config/vhosts/${vhost} -d '"/${db}/_design/${something}/_rewrite"'
,   prepareVHost:   function () {
        var vhostInfo = this.vhostInfo()
        ,   self = this
        ;
        _.each(vhostInfo, function (vh) {
            self.addRequest({
                // we roll our own request because it's rather specific for the configuration
                run:    function (cradle, cb) {
                    request.put({
                        url:    vh.url
                    ,   body:   vh.body
                    }, cb);
                }
            ,   reason: "installing virtual host " + vh.vh + " (PUT " + vh.url + " with " + vh.body + ")"
            });
        });
    }
};


module.exports = function () {
    return new Couth();
};
