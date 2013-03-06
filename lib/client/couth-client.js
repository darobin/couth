/*global angular */

angular.module("CouthClient", ["CouthResourceAPI"])
    .directive("couthType", function () {
        return function (scope, element, attrs) {
            scope.$emit("couth:register-editor", attrs.couthType, scope);
        };
    })
    // built from http://www.smartjava.org/content/drag-and-drop-angularjs-using-jquery-ui
    .directive("couthDnd", function() {
        return function (scope, element, attrs) {
            var toUpdate
            ,   startIndex = -1
            ,   path = attrs.couthDnd
            ;
            // watch the model so we know which element is where
            scope.$watch(attrs.couthDnd, function (val) { toUpdate = val; }, true);

            // use jqUI to make the element sortable
            $(element[0]).sortable({
                items:          "> fieldset"
            ,   cursor:         "move"
            ,   handle:         ".couth-move"
            ,   axis:           "y"
            ,   placeholder:    "couth-placeholder"
            ,   tolerance:      "pointer"
            ,   forcePlaceholderSize:   true
            ,   opacity:        0.6
            ,   start:  function (event, ui) {
                    startIndex = $(ui.item).index();
                }
            ,   stop:   function (event, ui) {
                    // on stop we determine the new index of the
                    // item and store it there
                    var newIndex = $(ui.item).index()
                    ,   toMove = toUpdate[startIndex];
                    toUpdate.splice(startIndex, 1);
                    toUpdate.splice(newIndex, 0, toMove);
                    // trigger an update in angular use $apply()
                    // since we're outside angulars lifecycle
                    scope.$apply(scope.$eval(path));
                }
            });
        };
    })
    .controller("CouthCtrl", function ($scope, $rootScope, $http) {
        function loading () { $scope.$emit("couth:loading"); }
        function done () { $scope.$emit("couth:done"); }
        loading();

        // manage users
        function resetUser () {
            $rootScope.$couthUser = {
                name:       null
            ,   roles:      []
            ,   isAdmin:    false
            };
        }
        function isAdmin (roles) {
            return roles.indexOf("_admin") > -1;
        }
        $http.get("/couth/session")
            .success(function (data) {
                done();
                $rootScope.$couthUser = data.userCtx;
                $rootScope.$couthUser.isAdmin = isAdmin(data.userCtx.roles);
            })
            .error(function () {
                done();
                resetUser();
                $scope.$emit("couth:error", { reason: "Failed to open a session with the server." });
            })
        ;
        $rootScope.$couthLogin = function (username, password, cb) {
            loading();
            $http.post("/couth/login", { name: username, password: password })
                .success(function (data) {
                    done();
                    if (!$rootScope.$couthUser) $rootScope.$couthUser = {};
                    $rootScope.$couthUser.name = username; // Couch returns null for that
                    $rootScope.$couthUser.roles = data.roles;
                    $rootScope.$couthUser.isAdmin = isAdmin(data.roles);
                    cb();
                })
                .error(function (data, status) {
                    done();
                    resetUser();
                    $scope.$emit("couth:error", { status: status, reason: data.reason || "Login failed." });
                })
            ;
        };
        $rootScope.$couthLogout = function () {
            loading();
            $http["delete"]("/couth/logout")
                .success(function () {
                    done();
                    resetUser();
                })
                .error(function () {
                    done();
                    // I'm not sure this can ever happen
                    $scope.$emit("couth:error", { reason: "Logout failed." });
                })
            ;
        };
        $rootScope.$couthSignup = function (username, password, cb) {
            var id = encodeURIComponent("org.couchdb.user:" + username);
            loading();
            $http.put("/couth/signup/" + id, { name: username, password: password, type: "user", roles: [] })
                .success(function () {
                    done();
                    if (!$rootScope.$couthUser) $rootScope.$couthUser = {};
                    $rootScope.$couthUser.name = username;
                    $rootScope.$couthUser.roles = [];
                    $rootScope.$couthUser.isAdmin = false;
                    cb();
                })
                .error(function (data, status) {
                    done();
                    $scope.$emit("couth:error", { status: status, reason: data.reason || "Signup failed." });
                })
            ;
        };
        // expose the above to forms
        $rootScope.$couthSignupForm = function (evt, username, password) {
            evt.preventDefault();
            $rootScope.$couthSignup(username, password, function () {
                // this isn't kosher, but I can't think of a cleaner way of tell Bootstrap
                // to remove its dropdown
                $("body").trigger("click");
            });
        };
        $rootScope.$couthLoginForm = function (evt, username, password) {
            evt.preventDefault();
            $rootScope.$couthLogin(username, password, function () {
                // this isn't kosher, but I can't think of a cleaner way of tell Bootstrap
                // to remove its dropdown
                $("body").trigger("click");
            });
        };
        
        // loading indicator
        $scope.$couthLoading = false;
        $scope.$on("couth:loading", function () {
            $scope.$couthLoading = true;
        });
        $scope.$on("couth:done", function () {
            $scope.$couthLoading = false;
        });
        
        // XXX make these managed in a nicer fashion (remove, animate, scroll to, whatever)
        // errors and successes messaging
        $scope.$couthError = false;
        $scope.$on("couth:error", function (evt, data) {
            $scope.$couthError = data.reason;
        });
        $scope.$couthSuccess = false;
        $scope.$on("couth:success", function (evt, data) {
            $scope.$couthSuccess = data.reason;
        });
        
        // editor management
        $scope.$couthEditors = {};
        $scope.$on("couth:register-editor", function (evt, type, scope) {
            $scope.$couthEditors[type] = scope;
        });
        $scope.$on("couth:edit", function (evt, obj) {
            if (!obj.couthType) return;
            var ed = $scope.$couthEditors[obj.couthType];
            if (!ed) return;
            ed.$couthInstance = obj;
            ed.$couthMode = "edit";
            ed.$couthFormShow = true;
        });
        $scope.$on("couth:new", function (evt, type) {
            var ed = $scope.$couthEditors[type];
            if (!ed) return;
            ed.$couthInstance = { couthType: type };
            ed.$couthMode = "new";
            ed.$couthFormShow = true;
        });
    })
    .controller("CouthFormCtrl", function ($scope, $parse) {
        $scope.$couthMode = "new";
        $scope.$couthSave = function () {
            if (!$scope.$couthForm.$valid) {
                // XXX add some details here
                $scope.$emit("couth:error", { reason: "Form is invalid." });
                return;
            }
            // dispatch an event (couth:create or couth:update) to which a higher-up controller can listen
            $scope.$emit($scope.$couthMode === "new" ? "couth:create" : "couth:update", $scope.$couthInstance, $scope);
        };
        $scope.$couthReset = function (evt) {
            // XXX need to revert in edit mode (otherwise we maintain weird data)
            $scope.$couthFormShow = false;
            evt.preventDefault();
        };
        $scope.$couthArrayDel = function (path, idx, evt) {
            $scope.$eval(path).splice(idx, 1);
            evt.preventDefault();
        };
        $scope.$couthArrayAdd = function (path, type, evt) {
            var empty;
            if (type === "object" || type === "any" || !type) empty = {};
            else if (type === "array") empty = [];
            else if (type === "string") empty = "";
            else if (type === "number") empty = 0;
            else if (type === "boolean") empty = false;
            else if (type === "null") empty = null;
            
            var getter = $parse(path)
            ,   arr = getter($scope)
            ;
            if (!arr) {
                arr = [];
                getter.assign($scope, arr);
            }
            arr.push(empty);
            evt.preventDefault();
        };
        // XXX
        // pagination
    })
;
