/*global */

var _ = require("underscore")
,   Couth = require("./core").Couth
,    pth =  require("path")
;

// helpers
function makeView (type, id) {
    return {
        map:    "function (doc) {\n" +
                "    return require('views/lib/utils').viewFor('" + type + "', '" + id + "', doc, emit);\n" +
                "}\n"
    };
}

function makeList (perm) {
    return "function (head, req) {\n" +
           "    return require('lib/utils').listFor(head, req, '" + perm + "', provides, send, start, getRow, log);\n" +
           "}";
}

function makeUpdate () {
    return function (doc, req) {
                return require("lib/utils").updateFor(doc, req);
           }.toString();
}

function makeRead (jsonp) {
    var jsonp = jsonp || false;
    return "function (head, req) {\n" +
           "    return require('lib/utils').showFor(head, req, provides, send, getRow, registerType, " + jsonp + ", start, log);\n" +
           "}";
}

function makeDelete () {
    return function (doc, req) {
                return require("lib/utils").deleteFor(doc, req);
           }.toString();
}

function Type (name) {
    this.name = name;
    this.schema({ type: "object" });
    this.perms = {
        create: "*"
    ,   read:   "*"
    ,   update: "*"
    ,   del:    "*"
    };
    this.crudOptions = {};
    this.hints = {};
}

Type.prototype = {
    schema: function (sch) {
        if (!sch) return this.jsonSchema;
        if (!sch.type || sch.type !== "object") throw new Error("The root schema type has to be 'object'.");
        if (!sch.properties) sch.properties = {};
        if (!sch.properties.couthType) sch.properties.couthType = { type: "string", "enum": [this.name], "required": true };
        this.jsonSchema = sch;
        return this;
    }
,   permissions: function (perms) {
        if (!perms) return this.perms;
        this.perms = _.extend(this.perms, perms);
        return this;
    }
,   crudify: function (opts) {
        if (!opts) return this.crudOptions;
        var name = this.name;
        
        // paths
        if (!opts.paths) opts.paths = {};
        //  list        GET     /name/
        if (!opts.paths.list) opts.paths.list = "/" + name;
        //  create      POST    /name/create
        if (!opts.paths.create) opts.paths.create = "/" + name + "/create";
        //  read        GET     /name/:key or /name/:id
        if (!opts.paths.read) opts.paths.read = "/" + name + "/:key";
        //  update      PUT     /name/:id
        if (!opts.paths.update) opts.paths.update = "/" + name + "/*";
        //  delete      DELETE  /name/:id
        if (!opts.paths.del) opts.paths.del = "/" + name + "/*";
        
        if (!opts.id) opts.id = "_id";
        this.crudOptions = opts;
        return this;
    }
,   hint:   function (path, opts) {
        this.hints[path] = opts;
        return this;
    }
,   deploy: function (couth, ddoc) {
        // add self to design document
        if (!ddoc.types) ddoc.types = {};
        ddoc.types[this.name] = {
            schema:         this.jsonSchema
        ,   permissions:    this.perms
        };
        
        // --- Create the requisite paths
        var opts = this.crudOptions
        ,   viewName = this.name + "." + opts.id
        ;
        // view
        ddoc.views[viewName] = makeView(this.name, opts.id);
        
        // list
        ddoc.lists[viewName] = makeList(this.perms.read);
        couth.addRewrite(opts.paths.list,
                        "_list/" + viewName + "/" + viewName + "/",
                        "GET",
                        { include_docs: true }
        );
        
        // create & update
        ddoc.updates[this.name] = makeUpdate();
        couth.addRewrite(opts.paths.create,
                        "_update/" + this.name + "/",
                        "POST");
        couth.addRewrite(opts.paths.update,
                        "_update/" + this.name + "/*",
                        "PUT");
        
        // read
        var renderKey = viewName + ".render";
        ddoc.lists[renderKey] = makeRead(opts.jsonp);
        couth.addRewrite(opts.paths.read,
                        "_list/" + renderKey + "/" + viewName,
                        "GET",
                        { include_docs: true });
        
        // delete
        var delKey = this.name + ".delete";
        ddoc.updates[delKey] = makeDelete();
        couth.addRewrite(opts.paths.del,
                        "_update/" + delKey + "/*",
                        "DELETE");
        return this;
    }
};

module.exports = Type;

Couth.prototype.type = function (name) {
    if (!this.types[name]) this.types[name] = new Type(name);
    return this.types[name];
};
Couth.prototype.prepareValidation = function () {
    if (Object.keys(this.types).length) {
        this.addLib("underscore", pth.join(__dirname, "../node_modules/underscore/underscore-min.js"));
        this.addLib("web-schema", pth.join(__dirname, "../node_modules/web-schema/lib/web-schema.js"));
        this.addLib("utils", pth.join(__dirname, "couch/design-utils.js"));
        var validation = function (newDoc, oldDoc, user) {
            // ensure you can't change a resource's type
            var couthType = oldDoc && oldDoc.couthType ? oldDoc.couthType : newDoc.couthType
            ,   WebSchema = require("lib/web-schema").WebSchema
            ;
            // skip validation if we're deleting
            if (!newDoc._deleted) {
                // couthType is always required
                if (!couthType) throw({ forbidden: "All objects must have a couthType" });
                var schema = this.types[couthType].schema;
                if (!schema) { throw({ forbidden: "Object of unknown couthType: " + couthType }); }
                var validator = new WebSchema();
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
};
