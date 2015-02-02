;(function(angular,moment) {
  "use strict";

  var root = this
  var seneca = root.seneca
  var prefix = (seneca.config.admin ? seneca.config.admin.prefix : null ) || '/admin'


  var senecaAdminSummaryModule = angular.module('senecaAdminSummaryModule',[])


  senecaAdminSummaryModule.directive('senecaAdminSummary', ['$http',function($http) {
    var def = {
      restrict:'A',
      scope:{
      },
      link: function( scope, elem, attrs ){
        scope.act = {}



        $http({method: 'GET', url: prefix+'/stats', cache: false}).
          success(function(data, status) {
            var upsecs = Math.floor( data.uptime / 1000 )

            scope.act      = data.act
            scope.start    = moment(data.start).calendar()
            scope.now      = moment(data.now).utc().format('ddd MMM Do YYYY HH:mm:ss')+' UTC'
            scope.running  = moment.duration(upsecs,'seconds').humanize()
          })
      },
      templateUrl: prefix+"/_admin_summary_template.html"
    }
    return def
  }])


}.call(window,angular,moment));

