(function(){
    /**
     * Show or hide the navbar buttons with context
     */

    'use strict';
    angular.module('FileManagerApp')
        .service('navbarButtonsService', NavBarButtonsService);

    NavBarButtonsService.$inject = [];

    function NavBarButtonsService() {
        var enableButtons = [];

        var buttonsTypes = {
            'SYNCHRONIZED': ['remove'],
            'NOT_EXISTS_LOCAL': ['remove', 'download'],
            'TRASH': ['remove', 'download', 'restore'],
            'OUTDATED_REMOTE': ['remove', 'download']
        };

        // public functions
        var service = {
            enableButtonTo: enableButtonTo,
            disableButtonTo: disableButtonTo,
            isEnable: exists,
            clearAllEnableButtons: clearAllEnableButtons,
            hasEnable: hasEnable
        };

        return service;

        function enableButtonTo(buttonType) {
            angular.forEach(buttonsTypes[buttonType], function (button) {
                enableButtons.push(button);
            });
        }

        function disableButtonTo(buttonType) {
            angular.forEach(buttonsTypes[buttonType], function (button) {
                removeFromArray(button, enableButtons);
            });
        }

        function hasEnable() {
            return enableButtons.length > 0;
        }

        function clearAllEnableButtons() {
            enableButtons = [];
        }

        function exists(item) {
            return enableButtons.indexOf(item) > -1;
        }

        function removeFromArray(item, arrayToRemove) {
            var itemIndex = arrayToRemove.indexOf(item);
            arrayToRemove.splice(itemIndex, 1);
        }
    }

})();
