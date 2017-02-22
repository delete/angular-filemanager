(function() {
    'use strict';
    angular
        .module('FileManagerApp')
        .controller('FileManagerCtrl', FileManagerCtrl);

    FileManagerCtrl.$inject = ['$scope', '$rootScope', '$window', '$translate', '$timeout',
        'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware', 'navbarButtonsService',
        'RestoreDialog', 'ToastService'
    ];

    /* @ngInject */
    function FileManagerCtrl($scope, $rootScope, $window, $translate, $timeout, fileManagerConfig,
        Item, FileNavigator, ApiMiddleware, navbarButtonsService, RestoreDialog, ToastService) {
        var $ = window.$;
        var $storage = $window.localStorage;
        navbarButtonsService.clearAllEnableButtons();

        $rootScope.activePage = 'files';
        $rootScope.showFooter = false;
        $rootScope.isLoading = false;

        $scope.config = fileManagerConfig;
        $scope.reverse = false;
        $scope.predicate = ['model.type', 'model.name'];
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };
        $scope.query = '';
        $scope.fileNavigator = new FileNavigator();
        $scope.apiMiddleware = new ApiMiddleware();
        $scope.uploadFileList = [];

        var viewTemplate = $storage.getItem('viewTemplate') || false;
        if (viewTemplate == 'true') {
            $scope.viewTemplate = true;
        } else if (viewTemplate == 'false') {
            $scope.viewTemplate = false;
        }

        $scope.fileList = [];
        $scope.temps = [];

        $scope.$watch('temps', function() {
            if ($scope.singleSelection()) {
                $scope.temp = $scope.singleSelection();
            } else {
                $scope.temp = new Item({
                    rights: 644
                });
                $scope.temp.multiple = true;
            }
            $scope.temp.revert();
        });

        $scope.fileNavigator.onRefresh = function() {
            $scope.temps = [];
            $scope.query = '';
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
        };

        $scope.setTemplate = function(name) {
            $storage.setItem('viewTemplate', name);
            $scope.viewTemplate = name;
        };

        $scope.changeLanguage = function(locale) {
            if (locale) {
                $storage.setItem('language', locale);
                return $translate.use(locale);
            }
            $translate.use($storage.getItem('language') || fileManagerConfig.defaultLang);
        };

        $scope.isSelected = function(item) {
            return $scope.temps.indexOf(item) !== -1;
        };

        $scope.selectOrUnselect = function(item, $event) {
            var indexInTemp = $scope.temps.indexOf(item);
            var isRightClick = $event && $event.which == 3;

            if ($event && $event.target.hasAttribute('prevent')) {
                $scope.temps = [];
                navbarButtonsService.clearAllEnableButtons();
                return;
            }
            if (!item || (isRightClick && $scope.isSelected(item))) {
                return;
            }
            if ($event && $event.shiftKey && !isRightClick) {
                var list = $scope.fileList;
                var indexInList = list.indexOf(item);
                var lastSelected = $scope.temps[0];
                var i = list.indexOf(lastSelected);
                var current = undefined;
                if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                    $scope.temps = [];
                    while (i <= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i++;
                    }
                    navbarButtonsService.clearAllEnableButtons();
                    enableButtons($scope.temps);
                    return;
                }
                if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                    $scope.temps = [];
                    while (i >= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i--;
                    }
                    navbarButtonsService.clearAllEnableButtons();
                    enableButtons($scope.temps);
                    return;
                }
            }
            if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);

                if (!$scope.isSelected) {
                    navbarButtonsService.disableButtonTo(item.model.status);
                } else {
                    navbarButtonsService.enableButtonTo(item.model.status);
                }
                return;
            }
            $scope.temps = [item];

            navbarButtonsService.clearAllEnableButtons();
            enableButtons($scope.temps);
        };

        function enableButtons(items) {
            angular.forEach(items, function(item) {
                navbarButtonsService.enableButtonTo(item.model.status);
            });
        }

        $scope.isButtonEnabled = function(action) {
            return navbarButtonsService.isEnable(action);
        };

        $scope.hasButtonsEnable = function() {
            return navbarButtonsService.hasEnable();
        };

        $scope.singleSelection = function() {
            return $scope.temps.length === 1 && $scope.temps[0];
        };

        $scope.totalSelecteds = function() {
            return {
                total: $scope.temps.length
            };
        };

        $scope.selectionHas = function(type) {
            return $scope.temps.find(function(item) {
                return item && item.model.type === type;
            });
        };

        $scope.amIOnTrash = function() {
            var currentPath = $scope.fileNavigator.currentPath;
            var alterdataBkpRegex = /recycle\..*/;
            return alterdataBkpRegex.test(currentPath);
        };

        $scope.prepareNewFolder = function() {
            var item = new Item(null, $scope.fileNavigator.currentPath);
            $scope.temps = [item];
            return item;
        };

        $scope.smartClick = function(item) {
            var pick = $scope.config.allowedActions.pickFiles;
            if (item.isFolder()) {
                // Fix bug: when an folder is opened, the buttons still appears
                navbarButtonsService.clearAllEnableButtons();
                return $scope.fileNavigator.folderClick(item);
            }

            if (typeof $scope.config.pickCallback === 'function' && pick) {
                var callbackSuccess = $scope.config.pickCallback(item.model);
                if (callbackSuccess === true) {
                    return;
                }
            }

            if (item.isImage()) {
                if ($scope.config.previewImagesInModal) {
                    return $scope.openImagePreview(item);
                }
                return $scope.apiMiddleware.download(item, true);
            }

            if (item.isEditable()) {
                return $scope.openEditItem(item);
            }
        };

        $scope.openImagePreview = function() {
            var item = $scope.singleSelection();
            $scope.apiMiddleware.apiHandler.inprocess = true;
            $scope.modal('imagepreview', null, true)
                .find('#imagepreview-target')
                .attr('src', $scope.apiMiddleware.getUrl(item))
                .unbind('load error')
                .on('load error', function() {
                    $scope.apiMiddleware.apiHandler.inprocess = false;
                    $scope.$apply();
                });
        };

        $scope.openEditItem = function() {
            var item = $scope.singleSelection();
            $scope.apiMiddleware.getContent(item).then(function(data) {
                item.tempModel.content = item.model.content = data.result;
            });
            $scope.modal('edit');
        };

        $scope.modal = function(id, hide, returnElement) {
            var element = $('#' + id);
            element.modal(hide ? 'hide' : 'show');
            $scope.apiMiddleware.apiHandler.error = '';
            $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            return returnElement ? element : true;
        };

        $scope.modalWithPathSelector = function(id) {
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            return $scope.modal(id);
        };

        $scope.isInThisPath = function(path) {
            var currentPath = $scope.fileNavigator.currentPath.join('/') + '/';
            return currentPath.indexOf(path + '/') !== -1;
        };

        $scope.edit = function() {
            $scope.apiMiddleware.edit($scope.singleSelection()).then(function() {
                $scope.modal('edit', true);
            });
        };

        $scope.changePermissions = function() {
            $scope.apiMiddleware.changePermissions($scope.temps, $scope.temp).then(function() {
                $scope.modal('changepermissions', true);
            });
        };

        $scope.download = function() {
            var item = $scope.singleSelection();
            if ($scope.selectionHas('dir')) {
                return;
            }
            if (item) {
                return $scope.apiMiddleware.download(item);
            }
            return $scope.apiMiddleware.downloadMultiple($scope.temps);
        };

        $scope.downloadFromCloud = function() {
            var item = $scope.singleSelection();
            if ($scope.selectionHas('dir')) {
                return;
            }
            var message = 'Processo de download de arquivos iniciado.';
            ToastService.newToastTemplate(message);

            var files = filesName($scope.temps);
            $rootScope.working.add('downloading', 'Baixando arquivo:', files);

            if (item) {
                return $scope.apiMiddleware.downloadFromCloud([item]).then(function() {
                    downloadFinished();
                    $rootScope.working.remove('downloading');
                
                    $timeout(function() {
                        $scope.fileNavigator.refresh();
                    }, 1000);
                });
            }
            return $scope.apiMiddleware.downloadFromCloud($scope.temps).then(function() {
                downloadFinished();
                $rootScope.working.remove('downloading');
                
                $timeout(function() {
                    $scope.fileNavigator.refresh();
                }, 1000);
            });

            function downloadFinished() {
                var message = 'Processo de download de arquivos finalizado.';
                ToastService.newToastTemplate(message);
            }
        };

        $scope.copy = function() {
            var item = $scope.singleSelection();
            if (item) {
                var name = item.tempModel.name.trim();
                var nameExists = $scope.fileNavigator.fileNameExists(name);
                if (nameExists && validateSamePath(item)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                if (!name) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
            }
            $scope.apiMiddleware.copy($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('copy', true);
            });
        };

        $scope.compress = function() {
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.compress($scope.temps, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (!$scope.config.compressAsync) {
                    return $scope.modal('compress', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.extract = function() {
            var item = $scope.temp;
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.extract(item, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (!$scope.config.extractAsync) {
                    return $scope.modal('extract', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.remove = function() {
            var message = 'Processo de remoção de arquivos iniciado.';
            ToastService.newToastTemplate(message);

            var files = filesName($scope.temps);
            $rootScope.working.add('removing', 'Removendo arquivo: ', files);

            $scope.modal('remove', true);
            $scope.apiMiddleware.remove($scope.temps).then(function() {
                var message = 'Processo de remoção de arquivos finalizado.';
                ToastService.newToastTemplate(message);
                navbarButtonsService.clearAllEnableButtons();
                $rootScope.working.remove('removing');

                $timeout(function() {
                    $scope.fileNavigator.refresh();
                }, 1000);
            });
        };

        $scope.restoreFromTrash = function() {
            var startMessage = 'Processo de restauração de arquivos iniciado.',
                successMessage = 'Processo de restauração de arquivos finalizado.';

            ToastService.newToastTemplate(startMessage);

            var files = filesName($scope.temps);
            $rootScope.working.add('restoringFromTrash', 'Restaurando arquivo da lixeira:', files);

            $scope.apiMiddleware.restoreFromTrash($scope.temps).then(function() {
                ToastService.newToastTemplate(successMessage);

                $timeout(function() {
                    $scope.fileNavigator.refresh();
                }, 1000);
                navbarButtonsService.clearAllEnableButtons();
                $rootScope.working.remove('restoringFromTrash');
            });
        };

        $scope.move = function() {
            var anyItem = $scope.singleSelection() || $scope.temps[0];
            if (anyItem && validateSamePath(anyItem)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_move_same_path');
                return false;
            }
            $scope.apiMiddleware.move($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('move', true);
            });
        };

        $scope.rename = function() {
            var item = $scope.singleSelection();
            var name = item.tempModel.name;
            var samePath = item.tempModel.path.join('') === item.model.path.join('');
            if (!name || (samePath && $scope.fileNavigator.fileNameExists(name))) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            $scope.apiMiddleware.rename(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('rename', true);
            });
        };

        $scope.createFolder = function() {
            var item = $scope.singleSelection();
            var name = item.tempModel.name;
            if (!name || $scope.fileNavigator.fileNameExists(name)) {
                return $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
            }
            $scope.apiMiddleware.createFolder(item).then(function() {
                $scope.modal('newfolder', true);
                
                $timeout(function() {
                    $scope.fileNavigator.refresh();
                }, 1000);
            });
        };

        $scope.addForUpload = function($files) {
            $scope.uploadFileList = $scope.uploadFileList.concat($files);
            $scope.modal('uploadfile');
        };

        $scope.removeFromUpload = function(index) {
            $scope.uploadFileList.splice(index, 1);
        };

        $scope.uploadFiles = function() {
            var startMessage = 'Processo de upload de arquivos iniciado.',
                successMessage = 'Processo de upload de arquivos finalizado.',
                errorMessage = 'Ocorreu um erro no processo de upload.';

            ToastService.newToastTemplate(startMessage);

            var files = filesName($scope.temps);
            $rootScope.working.add('uploading', 'Enviando arquivo:', files);

            $scope.modal('uploadfile', true);

            $scope.apiMiddleware.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(function() {
                ToastService.newToastTemplate(successMessage);
                $scope.uploadFileList = [];
                $rootScope.working.remove('uploading');
                    
                $timeout(function() {
                    $scope.fileNavigator.refresh();
                }, 1500);
            }, function(data) {
                var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
                ToastService.newToastTemplate(errorMessage);
                $scope.apiMiddleware.apiHandler.error = errorMsg;
                $rootScope.working.remove('uploading');
            });
        };

        $scope.loadTrash = function() {
            var item = mockFolderItem('/recycle_aws');
            $scope.fileNavigator.folderClick(item);
        };

        $scope.loadMyFiles = function() {
            var item = mockFolderItem('/');
            $scope.fileNavigator.folderClick(item);
        };

        function mockFolderItem(path) {
            var item = {
                isFolder: function() {
                    return true;
                },
                model: {
                    fullPath: function() {
                        return (path);
                    }
                }
            };
            return item;
        }

        $scope.restoreBackup = function() {
            var files = $scope.apiMiddleware.getFileList($scope.temps);
            var dialog = new RestoreDialog('databases-list/databases-list.html', 'RestoreDatabasesList', files);
            dialog.then(function() {
                //eslint-disable-next-line
                console.log($scope.temps);
            });
        };

        var validateSamePath = function(item) {
            var selectedPath = $rootScope.selectedModalPath.join('');
            var selectedItemsPath = item && item.model.path.join('');
            return selectedItemsPath === selectedPath;
        };

        var getQueryParam = function(param) {
            var found = $window.location.search.substr(1).split('&').filter(function(item) {
                return param === item.split('=')[0];
            });
            return found[0] && found[0].split('=')[1] || undefined;
        };

        function filesName(files) {
            var rawNames = [];
            angular.forEach(files, function(file) {
                rawNames.push(file.model.name);
            });
            var names = rawNames.join(', ');
            return names;
        }

        $scope.changeLanguage(getQueryParam('lang'));
        $scope.isWindows = getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();

    }
})();
