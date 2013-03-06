/*global angular*/

// possible enhancement
// this could have interceptors for errors (or whatever works)
// http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
// except that we have 403 for this, and that we should also intercept 409,

(function () {
    var types = ["REPLACE ME"];
    var cr = angular.module("CouthResourceAPI", []);
    angular.forEach(types, function (type) {
        cr.factory(type.name[0].toUpperCase() + type.name.substr(1), function ($http, $q) {
            // we need this to avoid stupid Couch behaviour of returning text/plain errors
            var strictAccept = { headers: { Accept: "application/json" }}
            ,   errorMap = { // XXX Couch may return others
                    forbidden:  403
                ,   not_found:  404
                }
            ;
            return {
                list:   function (success, error) {
                    var prom = $http.get("/specs/", strictAccept);
                    if (success) prom.success(success);
                    if (error) prom.error(error);
                    return prom;
                }
            ,   read:   function (obj, success, error) {
                    var id = angular.isString(obj) ? obj : obj[type.crudOptions.id]
                    ,   deferred = $q.defer()
                    ,   prom = deferred.promise;
                    if (success && !error) prom = prom.then(success);
                    else if (success && error) prom = prom.then(success, error);
                    $http.get("/specs/" + id, strictAccept)
                         .then(
                             function (result) {
                                if (angular.isString(result.data)) {
                                    try { result.data = JSON.parse(result.data); }
                                    catch (e) {
                                        result.status = 500;
                                        return deferred.reject(result);
                                    }
                                }
                                if (result.data.error) {
                                    result.status = errorMap[result.data.error] || 500;
                                    return deferred.reject(result);
                                }
                                if (!angular.isString(obj)) {
                                    if (result.data._id) obj._id = result.data._id;
                                    if (result.data._rev) obj._id = result.data._rev;
                                }
                                return deferred.resolve(result);
                            }
                        ,   function (result) {
                                return deferred.reject(result);
                            }
                    );
                    return prom;
                }
            ,   create: function (obj, success, error) {
                    if (type.crudOptions.id !== "_id") {
                        var deferred = $q.defer()
                        ,   prom = deferred.promise;
                        if (success && !error) prom = prom.then(success);
                        else if (success && error) prom = prom.then(success, error);
                        // check that it doesn't exist before creating
                        var self = this;
                        this.read(obj
                                ,   function () {
                                        return deferred.reject({ error: "conflict", reason: "ID already exists." });
                                    }
                                ,   function () {
                                        return self._create(obj, function (res) { return deferred.resolve(res); }
                                                               , function (res) { return deferred.reject(res); });
                                    }
                        );
                        return prom;
                    }
                    else {
                        return this._create(obj, success, error);
                    }
                }
            ,   _create: function (obj, success, error) {
                    var deferred = $q.defer()
                    ,   prom = deferred.promise;
                    if (success && !error) prom = prom.then(success);
                    else if (success && error) prom = prom.then(success, error);
                    $http.post("/specs/create", obj, strictAccept)
                         .then(
                             function (result) {
                                 obj._id = result.data.id;
                                 obj._rev = result.headers("x-couch-update-newrev");
                                 return deferred.resolve(obj);
                            }
                        ,   function (result) {
                                return deferred.reject(result);
                            }
                    );
                }
            ,   update: function (obj, success, error) {
                    var deferred = $q.defer()
                    ,   prom = deferred.promise;
                    if (success && !error) prom = prom.then(success);
                    else if (success && error) prom = prom.then(success, error);
                    $http.put("/specs/" + obj._id, obj, strictAccept)
                         .then(
                             function (result) {
                                 obj._rev = result.data.rev;
                                 return deferred.resolve(obj);
                            }
                        ,   function (result) {
                                return deferred.reject(result);
                            }
                    );
                }
            ,   del:   function (obj, success, error) {
                    var prom = $http["delete"]("/specs/" + obj._id, strictAccept);
                    if (success) prom.success(success);
                    if (error) prom.error(error);
                    return prom;
                }
            };
        });
    });
}());
