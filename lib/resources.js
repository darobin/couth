var Couth =     require("./core").Couth
,   pth =       require("path")
,   type2form = require("./forms").generate
;

Couth.prototype.couthResources = function () {
    if (!Object.keys(this.types).length) return;
    var allTypes = [];
    for (var t in this.types) {
        allTypes.push({
            name:           t
        ,  crudOptions:    this.types[t].crudOptions
        });
        var path = "/couth/types/" + t + ".json";
        this.addRewrite(path, path);
        this.addAttachment(path.replace(/^\//, ""),
                            new Buffer(JSON.stringify(this.types[t].jsonSchema)),
                            "application/json");
        var form = "/couth/forms/" + t + ".html";
        this.addRewrite(form, form);
        this.addAttachment(form.replace(/^\//, ""),
                            new Buffer(type2form(this.types[t].jsonSchema, t, this.types[t].hints)),
                            "text/html");
    }
    if (this.conf.exposeUsers) {
        allTypes.push({
            name:   "couth-users"
        ,   crudOptions: {
                id: "_id",
                paths:  {
                    list:   "/couth-users",
                    create: "/couth/signup",
                    read:   "/couth-users/:key",
                    update: "XXX",
                    del:    "XXX"
                }
            }
        });
    }

    // generate one big JS with all the dependencies
    var js = this.readRelFile("../vendor/jquery.min.js") +
             this.readRelFile("../vendor/jquery-ui-1.10.1.custom.min.js") +
             this.readRelFile("../vendor/angular.min.js") +
             this.readRelFile("client/couth-resource-api.tmpl.js")
                    .replace('["REPLACE ME"]', JSON.stringify(allTypes, null, 4)) +
             this.readRelFile("client/couth-client.js");
    // XXX at some point, build one big HTML file with all the HTML templates in <script>s
    // so that Angular can make just that one request and get all of them (if that's possible
    // it will likely have to be a build step)
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
    ,   {
            path:       "/couth/pagination.html"
        ,   content:    pth.join(__dirname, "client/pagination.html")
        }
    ,   {
            path:       "/couth/edit-item.html"
        ,   content:    pth.join(__dirname, "client/edit-item.html")
        }
    ,   {
            path:       "/couth/confirm-delete-item.html"
        ,   content:    pth.join(__dirname, "client/confirm-delete-item.html")
        }
    ]);
};
