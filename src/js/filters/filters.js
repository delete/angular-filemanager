(function() {
    'use strict';
    angular
    .module('FileManagerApp')
    .filter('strLimit', strLimit)
    .filter('fileExtension', fileExtension)
    .filter('formatDate', formatDate)
    .filter('humanReadableFileSize', humanReadableFileSize)
    .filter('formatRecycle', formatRecycle);


    strLimit.$inject = ['$filter'];
    /* @ngInject */
    function strLimit($filter) {
        return function(input, limit, more) {
            if (input.length <= limit) {
                return input;
            }
            return $filter('limitTo')(input, limit) + (more || '...');
        };
    }


    fileExtension.$inject = ['$filter'];

    /* @ngInject */
    function fileExtension($filter) {
        return function(input) {
            return /\./.test(input) && $filter('strLimit')(input.split('.').pop(), 3, '..') || '';
        };
    }


    formatDate.$inject = ['$filter'];

    /* @ngInject */
    function formatDate() {
        return function(input) {
            return input instanceof Date ?
                input.toISOString().substring(0, 19).replace('T', ' ') :
                (input.toLocaleString || input.toString).apply(input);
        };
    }


    humanReadableFileSize.$inject = ['$filter', 'fileManagerConfig'];

    /* @ngInject */
    function humanReadableFileSize($filter, fileManagerConfig) {
        // See https://en.wikipedia.org/wiki/Binary_prefix
        var decimalByteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
        var binaryByteUnits = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        return function(input) {
            var i = -1;
            var fileSizeInBytes = input;

            do {
                fileSizeInBytes = fileSizeInBytes / 1024;
                i++;
            } while (fileSizeInBytes > 1024);

            var result = fileManagerConfig.useBinarySizePrefixes ? binaryByteUnits[i] : decimalByteUnits[i];
            return Math.max(fileSizeInBytes, 0.1).toFixed(1) + ' ' + result;
        };
    }


    formatRecycle.$inject = ['$filter'];

    /* @ngInject */
    function formatRecycle() {
        return function(input) {
            var recycleRegex = /^recycle.+/;
            if (recycleRegex.test(input)) {
                return 'Lixeira';
            }
            return input;
        };
    }
})();
