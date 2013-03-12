
var Couth =     require("./core").Couth
;

Couth.prototype.addRewrite = function (from, to, method, query) {
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
};
Couth.prototype.addLib = function (libName, libPath) {
    if (!this.design.lib) this.design.lib = {};
    if (!this.design.views.lib) this.design.views.lib = {};
    if (this.libCache[libName]) return;
    this.libCache[libName] = true;
    this.design.lib[libName] = this.loadContent(libPath).toString("utf8");
    this.design.views.lib[libName] = this.design.lib[libName];
};
