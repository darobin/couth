/*global angular*/



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



