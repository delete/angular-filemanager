(function() {
    'use strict';
    angular
        .module('FileManagerApp')
        .provider('fileManagerConfig', fileManagerConfig);

    function fileManagerConfig(configurationsProvider) {
        var URI = configurationsProvider.ApiUri();
        var values = {
            appName: 'backupApp',
            defaultLang: 'pt',

            listUrl: URI + '/files',
            uploadUrl: URI + '/files/upload',
            renameUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            copyUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            moveUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            removeUrl: URI + '/files/remove',
            editUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            getContentUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            createFolderUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            downloadFileUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            downloadMultipleUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            compressUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            extractUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            permissionsUrl: 'http://angular-filemanager.zendelsolutions.com/bridges/php/handler.php',
            restoreUrl: URI + '/files/restore',
            downloadFromCloudUrl: URI + '/files/download',
            basePath: '/',

            searchForm: true,
            sidebar: true,
            // breadcrumb: true,
            allowedActions: {
                upload: true,
                // rename: true,
                // move: true,
                // copy: true,
                // edit: true,
                // changePermissions: true,
                // compress: true,
                // compressChooseName: true,
                // extract: true,
                download: true,
                downloadMultiple: true,
                // preview: true,
                remove: true,
                createFolder: true
                // pickFiles: false,
                // pickFolders: false
            },

            multipleDownloadFileName: 'alterdatabackup.zip',
            filterFileExtensions: [],
            showExtensionIcons: false,
            showSizeForDirectories: false,
            useBinarySizePrefixes: false,
            downloadFilesByAjax: true,
            previewImagesInModal: true,
            enablePermissionsRecursive: true,
            compressAsync: false,
            extractAsync: false,
            pickCallback: null,

            isEditableFilePattern: /\.(txt|diff?|patch|svg|asc|cnf|cfg|conf|html?|.html|cfm|cgi|aspx?|ini|pl|py|md|css|cs|js|jsp|log|htaccess|htpasswd|gitignore|gitattributes|env|json|atom|eml|rss|markdown|sql|xml|xslt?|sh|rb|as|bat|cmd|cob|for|ftn|frm|frx|inc|lisp|scm|coffee|php[3-6]?|java|c|cbl|go|h|scala|vb|tmpl|lock|go|yml|yaml|tsv|lst)$/i,
            isImageFilePattern: /\.(jpe?g|gif|bmp|png|svg|tiff?)$/i,
            isExtractableFilePattern: /\.(gz|tar|rar|g?zip)$/i,
            tplPath: 'modules/files/components/angular-filemanager/src/templates'
        };

        return {
            $get: function() {
                return values;
            },
            set: function (constants) {
                angular.extend(values, constants);
            }
        };
    }
})();
