
var Couth =     require("./core").Couth
,   _ =         require("underscore")
,   urlParser = require("url")
,   request =   require("request")
;

Couth.prototype.addRequest = function (req) {
    this.requests.push(req);
};
Couth.prototype.vhostInfo =  function () {
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
};
Couth.prototype.enforceConfig =  function () {
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
};
// sets up the vhost server configuration
// curl -X PUT http://${user}:${pass}@${host}/_config/vhosts/${vhost} -d '"/${db}/_design/${something}/_rewrite"'
Couth.prototype.prepareVHost =   function () {
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
};
