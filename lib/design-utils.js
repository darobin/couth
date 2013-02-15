
/*jshint boss: true */

// utility functions that get loaded into the design document and
// can be used from other parts of it

exports.viewFor = function (type, key, doc, emit) {
    if (doc.$type === type) {
        // note that for now we only support simple string keys
        // for flattening (e.g. indexing on tags) or array keys (that may be hierarchical)
        // see the original couth (pilfering if needed)
        // note however that this works for hierarchical data, e.g. if key is a date
        // captured as [YYYY, MM, ...] then the array gets emitted
        emit(doc[key], null);
    }
};

exports.listFor = function (head, req, perm, provides, send, getRow) {
    var user = req.userCtx;
    if (perm && perm !== "*") {
        if (perm === "admin") {
            if (user.roles.indexOf("_admin") === -1)
                throw({ forbidden: "Only admins can read these objects." });
        }
        else if (perm === "logged") {
            if (user.name === null)
                throw({ forbidden: "You must be logged in to read these objects." });
            
        }
        else {
            throw({ forbidden: "Unknown permissions constraint '" + perm + "' for list." });
        }
    }
    provides("json", function () {
        var row, started = false;
        send('{"total_rows":' + head.total_rows + ',"offset":' + head.offset +
             ',"update_seq":' + head.update_seq + ',"rows":[');
        while (row = getRow()) {
            var cnt = '';
            if (started) cnt = ",";
            started = true;
            send(cnt + JSON.stringify(row));
        }
        send(']}');
    });
};

// it would be great if we could make this use the *key* id instead of the _id
exports.updateFor = function (doc, req) {
    var obj = JSON.parse(req.body);
    obj._id = req.id ? req.id : req.uuid;
    return [obj, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id: obj._id }) }];
};

// this is called show, but we use a list so that we can get the document we want
exports.showFor = function (head, req, provides, send, getRow) {
    provides("json", function () {
        var doc = getRow();
        if (!doc) throw (["error", "not_found", "Not found"]);
        send(JSON.stringify(doc.doc));
    });
};

// same as updateFor
exports.deleteFor = function (doc) {
    if (!doc) return [null, { headers: { "Content-Type": "application/json"}, body: JSON.stringify({ ok: false, errors: ["Not found."] }) }];
    doc._deleted = true;
    return [doc, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) }];
};
