/*global angular*/

// possible enhancement
// this could have interceptors for errors (or whatever works)
// http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
// except that we have 403 for this, and that we should also intercept 409,

(function () {
    var types = ["REPLACE ME"];
    var cr = angular.module("CouthResourceAPI", [])
    ,   rep = function (path, id) {
            return path.replace(/:key|\*/, id);
        }
    ;
    
    angular.forEach(types, function (type) {
        var opt = type.crudOptions
        ,   realName = type.name.replace(/^./, function (c) { return c.toUpperCase(); })
                                .replace(/-(.)/g, function (all, c) { return c.toUpperCase(); })
        ;
        cr.factory(realName, function ($http, $q, $rootScope) {
            // we need this to avoid stupid Couch behaviour of returning text/plain errors
            var strictAccept = { headers: { Accept: "application/json" }}
            ,   errorMap = { // XXX Couch may return others
                    forbidden:  403
                ,   not_found:  404
                }
            ;
            if (!$rootScope.$couthTypes) $rootScope.$couthTypes = {};
            $rootScope.$couthTypes[type.name] = type;
            
            return {
                list:   function (success, error) {
                    var prom = $http.get(opt.paths.list, strictAccept);
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
                    $http.get(rep(opt.paths.read, id), strictAccept)
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
                                        return deferred.reject({ data: { error: "conflict", reason: "ID already exists." }});
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
                    $http.post(opt.paths.create, obj, strictAccept)
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
                    $http.put(rep(opt.paths.update, obj._id), obj, strictAccept)
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
                    var prom = $http["delete"](rep(opt.paths.del, obj._id), strictAccept);
                    if (success) prom.success(success);
                    if (error) prom.error(error);
                    return prom;
                }
            };
        });
    });
}());
