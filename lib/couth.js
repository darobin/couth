
var _ =         require("underscore")
,   nopt =      require("nopt")
,   urlParser = require("url")
,   request =   require("request")
,   cradle =    require("cradle")
,   mime =      require("mime")
// ,   crypto =    require("crypto")
,   fs =        require("fs")
,   pth =       require("path")
,   wrench =    require("wrench")
,   Type =      require("./type")
,   type2form = require("./forms").generate
;

// XXX TODO:
//  - automatically configure session duration to be something much longer than 10min
//    (e.g. timeout=7776000)
//  - automatically set secure_rewrites to false
//      curl -XPUT "$couch/_config/httpd/secure_rewrites" -d 'false'

// helpers
function readRelFile (path) {
    return fs.readFileSync(pth.join(__dirname, path), "utf8");
}
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

// all content can be either a string path to a file, or a buffer
function loadContent (source) {
    if (_.isString(source)) return fs.readFileSync(source);
    else return source;
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

    if (this.conf.silent) clog = silent;
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
,   index:      targetedSetOrReturn("index")
,   webAppRoot: targetedSetOrReturn("webAppRoot")
,   session:    targetedSetOrReturn("session")
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
        var self = this, conf = this.conf = this.resolve(this.target());
        this.cradle = setupDB(conf);
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
            // XXX would be good to detect deleted files that are uploaded
            // either that or blow all attachments away and replace them (but that's costly)
            self.prepareValidation();
            self.couthResources();
            self.buildResourceAPI();
            self.couthUserRoutes();
            for (var k in self.types) {
                self.types[k].deploy(self, self.design);
            }
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
,   enforceConfig:  function () {
        var conf = this.conf;
        // prepare url
        var url = urlParser.parse(conf.deployTo);
        delete url.host;
        if (conf.port) url.port = conf.port;
        if (conf.auth) url.auth = conf.auth.username + ":" + conf.auth.password;
        // session
        url.pathname = "/_config/couch_httpd_auth/timeout";
        var sessURL = urlParser.format(url);
        this.addRequest({
            run:    function (cradle, cb) {
                request.put({
                    url:    sessURL
                ,   body:   '"' + conf.session + '"'
                }, cb);
            }
        ,   reason: "enforcing session duration to " + conf.session + " (PUT " + urlParser.format(url) + ")"
        });
        // secure rewrites off (these aren't secure anyway)
        url.pathname = "/_config/httpd/secure_rewrites";
        var rewURL = urlParser.format(url);
        this.addRequest({
            run:    function (cradle, cb) {
                request.put({
                    url:    rewURL
                ,   body:   '"false"'
                }, cb);
            }
        ,   reason: "enforcing secure rewrites to false (PUT " + urlParser.format(url) + ")"
        });
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
,   addRewrite: function (from, to, method, query) {
        var rew = { from: from, to: to };
        if (method) rew.method = method;
        if (query) {
            rew.query = query;
            for (var k in rew.query) {
                if (typeof rew.query[k] === "boolean" ||
                    typeof rew.query[k] === "number") rew.query[k] = "" + rew.query[k];
            }
        }
        this.rewrites.push(rew);
        return this;
    }
,   addStaticDir:   function (path, opts) {
        opts = opts || { keepDotFiles: false };
        var files = wrench.readdirSyncRecursive(path)
        ,   statics = []
        ;
        for (var i = 0, n = files.length; i < n; i++) {
            var f = files[i]
            ,   fullPath = pth.join(path, f)
            ,   basename = pth.basename(fullPath)
            ;
            if (fs.statSync(fullPath).isDirectory()) continue;
            if (basename.indexOf(".") === 0 && !opts.keepDotFiles) continue;
            statics.push({ path: "/" + f,   content: fullPath });
        }
        return this.addStatics(statics);
    }
,   addStatics:   function (statics) {
        if (!_.isArray(statics)) statics = [statics];
        var self = this;
        _.each(statics, function (stat) {
            // the rewrite to self is actually needed
            self.addRewrite(stat.path, stat.path);
            self.addAttachment(stat.path.replace(/^\//, ""), stat.content, stat.type);
        });
        return this;
    }
,   addAttachment: function (url, source, mediaType) {
        var mt = mediaType || mime.lookup(source)
        ,   showURL = _.isString(source)
        ,   body = loadContent(source)
        ,   self = this
        // ,   md5 = "md5-" + crypto.createHash("md5")
        //                          .update(body)
        //                          .digest("base64")
        ;
        this.addRequest({
            run:    function (cradle, cb) {
                // console.log(self.design.signatures[url], md5);
                // if (self.design.signatures[url] === md5) {
                //     clog("Skipping attachment " + url + " as it's already deployed.");
                //     cb();
                // }
                // else {
                    // self.design.signatures[url] = md5;
                    cradle.addAttachment(self.design, {
                        name:           url
                    ,   contentType:    mt
                    ,   body:           body
                    }, function (err, res) {
                        if (err) self.error(err);
                        self.design._rev = res._rev;
                        cb();
                    });
                // }
            }
        ,   reason: "Uploading attachment of type " + mt + " to " + url + " from " + (showURL ? source : "[memory]")
        });
        // return md5;
        return this;
    }
,   type:   function (name) {
        if (!this.types[name]) this.types[name] = new Type(name);
        return this.types[name];
    }
,   prepareValidation:  function () {
        if (Object.keys(this.types).length) {
            this.addLib("underscore", pth.join(__dirname, "../node_modules/underscore/underscore-min.js"));
            this.addLib("json-validation", pth.join(__dirname, "../node_modules/json-validation/lib/json-validation.js"));
            this.addLib("utils", pth.join(__dirname, "couch/design-utils.js"));
            var validation = function (newDoc, oldDoc, user) {
                // ensure you can't change a resource's type
                var couthType = oldDoc && oldDoc.couthType ? oldDoc.couthType : newDoc.couthType
                ,   JSONValidation = require("lib/json-validation").JSONValidation
                ;
                // skip validation if we're deleting
                if (!newDoc._deleted) {
                    // couthType is always required
                    if (!couthType) throw({ forbidden: "All objects must have a couthType" });
                    var schema = this.types[couthType].schema;
                    if (!schema) { throw({ forbidden: "Object of unknown couthType: " + couthType }); }
                    var validator = new JSONValidation();
                    var report = validator.validate(newDoc, schema);
                    if (!report.ok) {
                        throw({ forbidden: "Validation errors: '" + report.errors[0] + "' at " + report.path });
                    }
                }
                // manage permissions
                var perms = couthType && this.types[couthType] ? this.types[couthType].permissions : {}
                ,   checkPermissions = function (action, name) {
                        if (!name) name = action;
                        if (perms[action] && perms[action] !== "*") {
                            if (perms[action] === "admin") {
                                if (user.roles.indexOf("_admin") === -1)
                                    throw({ forbidden: "Only admins can " + name + " objects of type: " + couthType});
                            }
                            else if (perms[action] === "logged") {
                                if (user.name === null)
                                    throw({ forbidden: "You must be logged in to " + name + " objects of type: " + couthType});
                            }
                            else {
                                throw({ forbidden: "Unknown permissions constraint '" + perms[action] + "' for type: " + couthType });
                            }
                        }
                    }
                ;
                if (perms) {
                    if (oldDoc) {
                        if (newDoc._deleted) checkPermissions("del", "delete");
                        else checkPermissions("update");
                    }
                    else {
                        checkPermissions("create");
                    }
                }
            };
            this.design.validate_doc_update = validation.toString();
        }
    }
,   addLib: function (libName, libPath) {
        if (!this.design.lib) this.design.lib = {};
        if (!this.design.views.lib) this.design.views.lib = {};
        if (this.libCache[libName]) return;
        this.libCache[libName] = true;
        this.design.lib[libName] = loadContent(libPath).toString("utf8");
        this.design.views.lib[libName] = this.design.lib[libName];
    }
,   couthResources: function () {
        for (var t in this.types) {
            var path = "/couth/types/" + t + ".json";
            this.addRewrite(path, path);
            this.addAttachment(path.replace(/^\//, ""),
                               new Buffer(JSON.stringify(this.types[t].jsonSchema)),
                               "application/json");
            var form = "/couth/forms/" + t + ".html";
            this.addRewrite(form, form);
            this.addAttachment(form.replace(/^\//, ""),
                               new Buffer(type2form(this.types[t].jsonSchema, t)),
                               "text/html");
        }
    }
,   couthUserRoutes: function () {
        // NOTE: this requires secure_rewrites to be set to false
        var sessionDB = "../../../_session";
        this.addRewrite("couth/session", sessionDB, "GET");
        this.addRewrite("couth/login", sessionDB, "POST");
        this.addRewrite("couth/logout", sessionDB, "DELETE");
        this.addRewrite("couth/signup/*", "../../../_users/*", "PUT");
    }
,   buildResourceAPI:   function () {
        if (!Object.keys(this.types).length) return;
        var allTypes = [];
        for (var t in this.types) {
            allTypes.push({
                name:           t
            ,   crudOptions:    this.types[t].crudOptions
            });
        }
        
        // generate one big JS with all the dependencies
        var js = readRelFile("../vendor/jquery.min.js") +
                 readRelFile("../vendor/jquery-ui-1.10.1.custom.min.js") +
                 readRelFile("../vendor/angular.min.js") +
                 readRelFile("client/couth-resource-api.tmpl.js")
                    .replace('["REPLACE ME"]', JSON.stringify(allTypes, null, 4)) +
                 readRelFile("client/couth-client.js");
        this.addStatics([
            {
                path:       "/couth/js/all.js"
            ,   content:    new Buffer(js)
            ,   type:       "text/javascript"
            }
        ,   {
                path:       "/couth/css/couth-core.css"
            ,   content:    pth.join(__dirname, "client/couth-core.css")
            ,   type:       "text/css"
            }
        ,   {
                path:       "/couth/load-indicator.html"
            ,   content:    pth.join(__dirname, "client/load-indicator.html")
            }
        ,   {
                path:       "/couth/img/loader.gif"
            ,   content:    pth.join(__dirname, "client/loader.gif")
            }
        ,   {
                path:       "/couth/user.html"
            ,   content:    pth.join(__dirname, "client/user.html")
            }
        ,   {
                path:       "/couth/messages.html"
            ,   content:    pth.join(__dirname, "client/messages.html")
            }
        ]);
    }
};

module.exports = function () {
    return new Couth();
};
