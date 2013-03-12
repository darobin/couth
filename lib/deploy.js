
var Couth =     require("./core").Couth
,   _ =         require("underscore")
,   nopt =      require("nopt")
,   cradle =    require("cradle")
;

Couth.prototype.cli =    function () {
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
};
// call the deployer
Couth.prototype.deploy = function (done) {
    var self = this, conf = this.conf = this.resolve(this.target());
    var cradleOpt = { host: conf.deployTo, port: conf.port };
    if (conf.auth) cradleOpt.auth = { username: conf.auth.username, password: conf.auth.password };
    this.cradle = new cradle.Connection(cradleOpt).database(conf.db);
    this.enforceConfig();
    this.prepareVHost();
    this.loadCurrentDesign(function (err) {
        if (err) self.error("Problem loading current design document: [" + err.error + "] " + err.reason);
        if (conf.index) {
            self.addRewrite("", conf.index);
            if (conf.webAppRoot) {
                var root = conf.webAppRoot;
                if (!/\*$/.test(root)) {
                    if (!/\/$/.test(root)) root += "/";
                    root += "*";
                }
                self.addRewrite(root, conf.index);
            }
        }
        if (self.rewrites.length) self.design.rewrites = self.rewrites.sort(function (a, b) {
            if (a.from.length > b.from.length) return -1;
            if (a.from.length < b.from.length) return 1;
            return 0;
        });
        self.prepareValidation();
        self.couthResources();
        self.couthUserRoutes();
        for (var k in self.types) {
            self.types[k].deploy(self, self.design);
        }
        for (var att in self.design._attachments) {
            if (!self.seenAttachment[att]) {
                (function (att) {
                    self.addRequest({
                        run:    function (cradle, cb) {
                            cradle.removeAttachment(self.design, att, function (err, res) {
                                if (err) self.error(err);
                                self.design._rev = res._rev;
                                cb();
                            });
                        }
                    ,   reason: "removing " + att + " from design document"
                    });
                }(att));
            }
        }
        if (conf.debug) self.fakeDeploy(done);
        else            self.realDeploy(done);
    });
};
Couth.prototype.fakeDeploy = function (done) {
    this.log(JSON.stringify(this.design, null, 4));
    var self = this;
    _.each(this.requests, function (req) {
        self.log("[" + req.reason + "]");
    });
    if (done) done(null);
};
Couth.prototype.realDeploy = function (done) {
    var self = this;
    // requests MUST come after the design doc because some (e.g. attachments)
    // are not allowed before the document exists
    var makeRequest = function () {
        if (self.requests && self.requests.length) {
            var req = self.requests.shift();
            self.log(req.reason);
            req.run(self.cradle, function (err) {
                if (err) self.error(err);
                self.log("OK");
                makeRequest();
            });
        }
        else {
            if (done) done(null);
        }
    };
    var deploy = function () {
        // deploy design doc
        self.log("Installing couth design document");
        self.cradle.save(self.design, function (err, res) {
            if (err) self.error(err);
            self.log("OK");
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
};
Couth.prototype.loadCurrentDesign = function (cb) {
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
            self.design.lib = {};
            self.design.lists = {};
            self.design.types = {};
            self.design.updates = {};
            self.design.views = {};
            cb(null, self.design);
        }
    });
};
