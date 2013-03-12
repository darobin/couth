/*global angular */

angular.module("my-stuff", ["CouthClient", "CouthResourceAPI"])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider
            .when("/", { templateUrl: "/templates/home.html" })
            .when("/app/books/", { controller: "BooksCtrl", templateUrl: "/templates/books.html" })
            .otherwise({ redirectTo: "/" });
    })
    .controller("NavCtrl", function ($scope, $rootScope, $location) {
        $rootScope.pathActive = function (path) {
            return ($location.path().substr(0, path.length) === path) ? "active" : "";
        };
    })
    .controller("BooksCtrl", function ($scope, Books, CouthSimpleCRUD) {
        CouthSimpleCRUD.runForType({
            type:   Books
        ,   name:   "Book"
        ,   scope:  $scope
        ,   onload: function (data) {
                $scope.books = data.rows;
                $scope.count = data.total_rows;
            }
        ,   pagination: {
                pageSize:   10
            ,   countExpr:  "count"
            }
        });
    })
;
