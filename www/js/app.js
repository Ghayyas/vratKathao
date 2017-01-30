//vrat Kahatao Application
//By Ghayyas Mubashir
//Date: 7/1/17

var db = null;
angular.module('vrat', ['ionic', 'ionic.cloud', 'vrat.controllers', 'vratFilter', 'vrat.Service', 'ngStorage', 'ngCordova'])
.run(function ($ionicPlatform, $ionicPush, $timeout, $cordovaSplashscreen, $state, $rootScope, $http,$localStorage,httpRequest,$cordovaSQLite,$ionicPopup,askedForUpate,askedForRating,bannerAd) {
   $ionicPlatform.ready(function () {
    //Checking or update and rate the app_id
    bannerAd.prepareInitial();
    var date = new Date();
    var TodaysDate = date.getDate();
    $timeout(function(){
    var checkForUpdateInLocal = $localStorage.updateDialog;
    var checkForRateInLocal = $localStorage.rateDialog;
   if(TodaysDate > 1 && TodaysDate < 6){
     if(!checkForUpdateInLocal){
       askedForUpate.asked().then(function(s){
      if(s){
        $localStorage.updateDialog = true;
      }
      else{
        $localStorage.updateDialog = false;
      }
    });
  }
}
else{
    $localStorage.updateDialog = false;
  }
if(TodaysDate > 6 && TodaysDate < 11){
     if(!checkForRateInLocal){
       askedForRating.askedForRate().then(function(s){
      if(s){
        $localStorage.rateDialog = true;
      }
      else{
        $localStorage.rateDialog = false;
      }
    });
  }
}
else{
  $localStorage.rateDialog = false;
}
  //   if(TodaysDate > 10){
  //       $localStorage.updateDialog = false;
  //   }
  //  if(TodaysDate > 20 && TodaysDate < 22){
  //       $localStorage.rateDialog = false;
  //   }
    
    if(TodaysDate === 1){
     if(!checkForUpdateInLocal){
      askedForUpate.asked().then(function(s){
      if(s){
        $localStorage.updateDialog = true
      }
      else{
        $localStorage.updateDialog = false;
      }
    })
  }}
    else if(TodaysDate === 6){
      if(!checkForRateInLocal){
   askedForRating.askedForRate().then(function(s){
     if(s){
        $localStorage.rateDialog = true
      }
      else{
        $localStorage.rateDialog = false;
      }
    })}}      
    },3000);

    db = $cordovaSQLite.openDB({ name: "vrat.db", location: 'default' });
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS categories (id integer primary key, title text)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS posts (id integer primary key, post text)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS allPosts (id integer primary key, post key)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS allCategories (id integer primary key,categories text)")
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS bookmark (id integer primary key,bookmark text)")
 //Fetch first Time data
      $http.get(WordPress_url +'/?json=get_category_index' + 1).then(function (d) {
        $localStorage.categoryDetailArray = d.data.posts;
     }, function (err) {
    });
    httpRequest.httpFunc().then(function (d) {
        var allPost = d.data.posts;
        var query = "SELECT * FROM allPosts";
            $cordovaSQLite.execute(db, query).then(function(res) {
              if(res.rows.length > 0) {
                //do nothing
              }  
                else {
                  var query = "INSERT INTO allPosts (post) VALUES (?)";
                      for(var i=0; i < allPost.length; i++){
                      $cordovaSQLite.execute(db, query, [JSON.stringify(allPost[i])]).then(function(res) {
             }, function (err) {
                  // Sqlite Error
          }); 
           }
          }
         }, function (err) {
                   // http Error
       });
    });
      $ionicPush.register().then(function (t) {
        return $ionicPush.saveToken(t);
      }).then(function (t) {
      });
      $rootScope.$on('cloud:push:notification', function (event, data) {
        var msg = data.message;
        var payload = data.message.payload;
        console.log("type",typeof(payload),'id');
        if (payload !== undefined) {
          $http.get(WordPress_url +'/?json=get_post&post_id='+ payload.id).then(function (d) {
            var jsonStn = JSON.stringify(d.data.post);
            $state.go('menu.postDetail', {postID: jsonStn});
           }, function (e) {
           //do nothing 
          })
        }
      });
      $rootScope.$on('$stateChangeSuccess', function () {
        if (typeof analytics !== 'undefined') {
          analytics.debugMode();
          analytics.startTrackerWithId("UA-89946979-1");
          window.analytics.trackEvent('Category', 'Action', 'Label', 12);
          window.analytics.trackException('Description', true);
          window.analytics.trackTiming('Category', 3334, 'Variable', 'Label');
          window.analytics.addTransaction('ID', 'Affiliation', 34, 43, 55, 'Currency Code');
          analytics.trackView($state.current.name);
        }
        else {
          // Google Analytics Unavailable
        }
      });
      if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
          cordova.plugins.Keyboard.disableScroll(true);
      }
      if (window.StatusBar) {
        if (ionic.Platform.isAndroid()) {
          StatusBar.backgroundColorByHexString('#1976D2');
        } else {
          StatusBar.styleLightContent();
        }
      }
      $timeout(function () {
        $cordovaSplashscreen.hide();
      }, 3000);
    });
    })
  .config(function ($stateProvider, $urlRouterProvider, $ionicCloudProvider) {
    $ionicCloudProvider.init({
      "core": {
        "app_id": "65e1f05d"
      },
      "push": {
        "sender_id": "188530049779",  
        "pluginConfig": {
          "ios": {
            "badge": true,  
            "sound": true
          },
          "android": {
            "iconColor": "#f52727"
          }
        }
      }
    });
    $stateProvider
      .state('menu', {
        url: '/menu',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppCtrl'
      })
      .state('menu.home', {
        url: '/home',
        views: {
          'menuContent': {
            templateUrl: 'templates/home.html',
            controller: 'homeCtrl as home'
          }
        }
      })
       .state('menu.search', {
        url: '/search',
        views: {
          'menuContent': {
            templateUrl: 'templates/search.html',
            controller: 'searchCtrl as search'
          }
        }
      })
      .state('menu.category', {
        url: '/category',
        views: {
          'menuContent': {
            templateUrl: 'templates/categories.html',
            controller: 'categoryCtrl as category'
          }
        }
      })
      .state('menu.categoryDetail', {
        url: '/detail/:category/:title',
        views: {
          'menuContent': {
            templateUrl: 'templates/categoryDetail.html',
            controller: 'categoryDetailCtrl as categoryDetail'
          }
        }
      })
      .state('menu.postDetail', {
        url: '/postDetail/:postID',
        views: {
          'menuContent': {
            templateUrl: 'templates/postDetail.html',
            controller: 'postDetailCtrl as postDetail'
          }
        }
      })
      .state('menu.bookmark', {
        url: '/bookmark',
        views: {
          'menuContent': {
            templateUrl: 'templates/bookmark.html',
            controller: 'bookmarkCtrl as bookmark'
          }
        }
      })
      .state('menu.about', {
        url: '/about',
        views: {
          'menuContent': {
            templateUrl: 'templates/about.html',
            controller: 'aboutCtrl as about'
          }
        }
      });
    $urlRouterProvider.otherwise('/menu/category');
  });