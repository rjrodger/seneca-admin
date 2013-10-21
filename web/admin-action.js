;(function(angular,moment) {
  "use strict";

  var root = this
  var seneca = root.seneca
  var prefix = (seneca.config.admin ? seneca.config.admin.prefix : null ) || '/admin'


  var senecaAdminActionModule = angular.module('senecaAdminActionModule',[])



  senecaAdminActionModule.directive('senecaAdminAction', ['$http',function($http) {
    var def = {
      restrict:'A',
      scope:{
      },
      link: function( scope, elem, attrs ){


      },
      controller: function( $scope ){
        $scope.execute = function() {
          var args = jsonic( $scope.input )
          console.log(args)

          $http({method: 'POST', data:args, url: prefix+'/act', cache: false}).
            success(function(data, status) {
              $scope.output = JSON.stringify( data, null, true )
              console.log($scope.output)
            })
        }
      },
      templateUrl: prefix+"/_admin_action_template.html"
    }
    return def
  }])


}.call(window,angular,moment));

