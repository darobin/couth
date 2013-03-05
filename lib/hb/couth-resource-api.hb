/*global angular*/

// XXX
//  this is not working out well, instead do this:
//  - remove the logger (I don't know how it interacts, but it probably does)
//  - remove this
//  - create an ad hoc service for Specs (it really has a Specs service, not something higher level)
//  - don't build it with $resource, hand roll it
//  - make sure it supports promises (same interface as $resource basically)
//  - make sure it hides away all the nasties involved in exposing the Couch stuff
//  - once that works, refactor it into something generic that knows about the list of
//    types that Couth has (these should be loaded separately, let's avoid codegen please)


(function () {
    var cr = angular.module('CouthResourceAPI', ['ngResource'])
    ,   allTypes = {{{couthTypes}}}
    ,   type2key = {{{type2key}}}
    ;
    
    var strictAccept = { Accept: "application/json" };
    for (var i = 0, n = allTypes.length; i < n; i++) {
        var type = allTypes[i];
        // NOTE: what the below implies is that the key that is used should always
        //       be _id, even when passed to methods that don't use that
        cr.factory(type[0].toUpperCase() + type.substr(1), function ($resource, $rootScope) {
            if (!$rootScope.$couthTypes) $rootScope.$couthTypes = [];
            if (!$rootScope.$couthType2ID) $rootScope.$couthType2ID = {};
            $rootScope.$couthTypes.push(type);
            $rootScope.$couthType2ID[type] = type2key[type];
            return $resource("/" + type + "/:_id", {}, {
                    list:   {
                        method: "GET"
                    ,   headers:    strictAccept
                    }
                ,   create: {
                        method: "POST"
                    ,   params: { _id: "create" }
                    ,   headers:    strictAccept
                    }
                ,   read: {
                        method: "GET"
                    ,   headers:    strictAccept
                    }
                ,   update: {
                        method: "PUT"
                    ,   headers:    strictAccept
                    }
                ,   del: {
                        method: "DELETE"
                    ,   headers:    strictAccept
                    }
            });
        });
    }
}());



