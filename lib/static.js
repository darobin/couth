
var Couth =     require("./core").Couth
,   pth =       require("path")
,   wrench =    require("wrench")
,   fs =        require("fs")
,   mime =      require("mime")
,   _ =         require("underscore")
;

Couth.prototype.addStaticDir = function (path, opts) {
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
};
Couth.prototype.addStatics =   function (statics) {
    if (!_.isArray(statics)) statics = [statics];
    var self = this;
    _.each(statics, function (stat) {
        // the rewrite to self is actually needed
        self.addRewrite(stat.path, stat.path);
        self.addAttachment(stat.path.replace(/^\//, ""), stat.content, stat.type);
    });
    return this;
};
Couth.prototype.addAttachment = function (url, source, mediaType) {
    var mt = mediaType || mime.lookup(source)
    ,   showURL = _.isString(source)
    ,   body = this.loadContent(source)
    ,   self = this
    ;
    this.seenAttachment[url] = true;
    this.addRequest({
        run:    function (cradle, cb) {
            cradle.addAttachment(self.design, {
                name:           url
            ,   contentType:    mt
            ,   body:           body
            }, function (err, res) {
                if (err) self.error(err);
                self.design._rev = res._rev;
                cb();
            });
        }
    ,   reason: "Uploading attachment of type " + mt + " to " + url + " from " + (showURL ? source : "[memory]")
    });
    return this;
};
