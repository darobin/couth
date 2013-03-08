
var fs = require("fs")
,   request = require("request")
,   expect = require("expect.js")
;

function AppTester (name, localConfigPath) {
    this.name = name;
    if (!fs.existsSync(localConfigPath)) throw new Error("You need a local-config.json so as to test against a dev version.");
    var local = require(localConfigPath);
    this.server = "http://" + local.auth.username + ":" + local.auth.password + "@" + local.vhost + ":" + local.port;
    this.anonServer = "http://" + local.vhost + ":" + local.port;
}

AppTester.prototype = {
    populate:   function (objects, cb) {
        objects = objects.concat([]);
        // for each object
        //  set its type
        //  POST it to the path
        var url = this.server + "/" + this.name + "/create", self = this;
        function sendObj () {
            if (!objects.length) return cb();
            var obj = objects.shift();
            obj.couthType = self.name;
            request.post(url, { json: obj }, function (err, res, doc) {
                expect(err).to.not.be.ok();
                expect(res.statusCode).to.equal(201);
                obj._rev = res.headers["x-couch-update-newrev"];
                obj._id = doc.id;
                sendObj();
            });
        }
        sendObj();
    }
,   each: function (key, objects, cb) {
        objects = objects.concat([]);
        var url = this.server + "/" + this.name + "/";
        function sendObj () {
            if (!objects.length) return cb();
            var obj = objects.shift();
            request.get(url + obj[key], function (err, res, doc) {
                doc = JSON.parse(doc);
                expect(err).to.not.be.ok();
                expect(res.statusCode).to.equal(200);
                expect(doc._id).to.equal(obj._id);
                sendObj();
            });
        }
        sendObj();
    }
,   all: function (objects, cb) {
        var url = this.server + "/" + this.name;
        request.get(url, function (err, res, docs) {
            docs = JSON.parse(docs);
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(200);
            var docMap = {};
            for (var i = 0, n = docs.rows.length; i < n; i++) docMap[docs.rows[i]._id] = true;
            for (var i = 0, n = objects.length; i < n; i++) expect(docMap[objects[i]._id]).to.be.ok();
            cb();
        });
    }
,   update: function (obj, cb) {
        var url = this.server + "/" + this.name + "/" + obj._id;
        request.put(url, { json: obj }, function (err, res) {
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(201);
            obj._rev = res.headers["x-couch-update-newrev"];
            cb();
        });
    }
,   noGuestCreate:  function (obj, cb) {
        obj.couthType = this.name;
        var url = this.anonServer + "/" + this.name + "/create";
        request.post(url, { json: obj }, function (err, res, doc) {
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(403);
            expect(doc.error).to.equal("forbidden");
            cb();
        });
        
    }
,   noGuestUpdate:  function (obj, key, cb) {
        var url = this.anonServer + "/" + this.name + "/" + obj._id;
        request.put(url, { json: obj }, function (err, res, doc) {
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(403);
            expect(doc.error).to.equal("forbidden");
            cb();
        });
    }
,   noGuestDelete:  function (obj, cb) {
        var url = this.anonServer + "/" + this.name + "/" + obj._id;
        request.del(url, function (err, res, doc) {
            doc = JSON.parse(doc);
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(403);
            expect(doc.error).to.equal("forbidden");
            cb();
        });
        
    }
,   noInvalid:  function (obj, cb) {
        var url = this.server + "/" + this.name + "/create";
        obj.couthType = this.name;
        request.post(url, { json: obj }, function (err, res, doc) {
            expect(err).to.not.be.ok();
            expect(res.statusCode).to.equal(403);
            expect(doc.error).to.equal("forbidden");
            cb();
        });
        
    }
,   remove: function (objects, cb) {
        objects = objects.concat([]);
        var url = this.server + "/" + this.name + "/";
        function sendObj () {
            if (!objects.length) return cb();
            var obj = objects.shift();
            request.del(url + obj._id, function (err, res) {
                expect(err).to.not.be.ok();
                expect(res.statusCode).to.equal(201);
                sendObj();
            });
        }
        sendObj();
    }
};

module.exports = AppTester;
