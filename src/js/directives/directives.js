(function() {
    'use strict';
    angular
        .module('FileManagerApp')
        .directive('angularFilemanager', angularFilemanager)
        .directive('ngFile', ngFile)
        .directive('ngRightClick', ngRightClick);

    angularFilemanager.$inject = ['$parse', 'fileManagerConfig'];
    /* @ngInject */
    function angularFilemanager($parse, fileManagerConfig) {
        return {
            restrict: 'EA',
            templateUrl: fileManagerConfig.tplPath + '/main.html'
        };
    }


    ngFile.$inject = ['$parse'];
    /* @ngInject */
    function ngFile($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var model = $parse(attrs.ngFile);
                var modelSetter = model.assign;

                element.bind('change', function() {
                    scope.$apply(function() {
                        modelSetter(scope, element[0].files);
                    });
                });
            }
        };
    }


    ngRightClick.$inject = ['$parse'];
    /* @ngInject */
    function ngRightClick($parse) {
        return function(scope, element, attrs) {
            var fn = $parse(attrs.ngRightClick);
            element.bind('contextmenu', function(event) {
                scope.$apply(function() {
                    event.preventDefault();
                    fn(scope, { $event: event });
                });
            });
        };
    }

})();
