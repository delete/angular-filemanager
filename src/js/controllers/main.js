(function(angular, $) {
    'use strict';
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', '$translate', 'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware', 'navbarButtonsService',
        function($scope, $rootScope, $window, $translate, fileManagerConfig, Item, FileNavigator, ApiMiddleware, navbarButtonsService) {

        var $storage = $window.localStorage;
        
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
        if ( viewTemplate == 'true') {
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
                $scope.temp = new Item({rights: 644});
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

        $scope.changeLanguage = function (locale) {
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
            if (! item || (isRightClick && $scope.isSelected(item))) {
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
                    navbarButtonsService.disableButtonTo(item.status);
                } else {
                    navbarButtonsService.enableButtonTo(item.status);
                }
                return;
            }
            $scope.temps = [item];

            enableButtons($scope.temps);
        };

        function enableButtons(items) {
            angular.forEach(items, function (item) {
                item.status = 'TRASH';
                navbarButtonsService.enableButtonTo(item.status);
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
                if (! $scope.config.compressAsync) {
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
                if (! $scope.config.extractAsync) {
                    return $scope.modal('extract', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.remove = function() {
            $scope.apiMiddleware.remove($scope.temps).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('remove', true);
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
                $scope.fileNavigator.refresh();
                $scope.modal('newfolder', true);
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
            $scope.apiMiddleware.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.uploadFileList = [];
                $scope.modal('uploadfile', true);
            }, function(data) {
                var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
                $scope.apiMiddleware.apiHandler.error = errorMsg;
            });
        };

        // $scope.loadTrash = function () {
        //     var path = 'Test';
        //     $scope.fileNavigator.currentPath = [path];
        //
        //     $scope.fileNavigator.list().then(function(data) {
        //         self.fileList = (data.result || []).map(function(file) {
        //             return new Item(file, $scope.fileNavigator.currentPath);
        //         });
        //         $scope.fileNavigator.buildTree(path);
        //         $scope.fileNavigator.onRefresh();
        //     }).finally(function() {
        //         $scope.fileNavigator.requesting = false;
        //     });
        // };

        var validateSamePath = function(item) {
            var selectedPath = $rootScope.selectedModalPath.join('');
            var selectedItemsPath = item && item.model.path.join('');
            return selectedItemsPath === selectedPath;
        };

        var getQueryParam = function(param) {
            var found = $window.location.search.substr(1).split('&').filter(function(item) {
                return param ===  item.split('=')[0];
            });
            return found[0] && found[0].split('=')[1] || undefined;
        };

        $scope.changeLanguage(getQueryParam('lang'));
        $scope.isWindows = getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();

    }]);
})(angular, jQuery);
