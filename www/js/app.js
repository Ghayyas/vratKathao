//vrat Kahatao Application
//By Ghayyas Mubashir
//Date: 7/1/17

var db = null;

angular.module('vrat', ['ionic', 'ionic.cloud', 'vrat.controllers', 'vratFilter', 'vrat.Service', 'ngStorage', 'ngCordova'])


  .run(function ($ionicPlatform, $ionicPush, $timeout, $cordovaSplashscreen, $state, $rootScope, $http,$localStorage,httpRequest,$cordovaSQLite) {


    $ionicPlatform.ready(function () {
     
    db = $cordovaSQLite.openDB({ name: "vrat.db", location: 'default' });
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS categories (id integer primary key, title text)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS posts (id integer primary key, post text)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS allPosts (id integer primary key, post key)");
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS allCategories (id integer primary key,categories text)")
    $cordovaSQLite.execute(db,"CREATE TABLE IF NOT EXISTS bookmark (id integer primary key,bookmark text)")



 
 




      //Fetch first Time data
      
      $http.get(WordPress_url +'/?json=get_category_index' + 1).then(function (d) {
         console.log('_self.data',d.data);

        $localStorage.categoryDetailArray = d.data.posts;
 
    }, function (err) {
      
    });
      
      
      
      
      
      
      
      
      
      
  //     $http.get(WordPress_url +'/?json=get_category_posts/?id=' + 1).then(function (d) {
      
      
  //     // $localStorage.categoryDetailTitle = d.data.category.title;
  //     // $localStorage.categoryDetailArray = d.data.posts;
 
  //    var query = "DELETE FROM posts";
  //       $cordovaSQLite.execute(db, query);
  //     var query2 = "DELETE FROM allPosts";
  //     $cordovaSQLite.execute(db,query2);
  //   //  var query = "DELETE FROM categories";
  //   //     $cordovaSQLite.execute(db, query);
        
  //     var query = "SELECT * FROM categories";
  //         $cordovaSQLite.execute(db, query).then(function(res) {
  //             if(res.rows.length > 0) {
                
  //           } else {
  //               // console.log("No results found");
                
  //           var title = d.data.data.varta_lists;
  //           var query = "INSERT INTO categories (title) VALUES (?)";
  //            $cordovaSQLite.execute(db, query, [title]).then(function(res) {
  //           // console.log("INSERT ID -> " + res.insertId);
  //       }, function (err) {
  //           // console.error(err);
  //       });
  //           }
  //       }, function (err) {
  //           // console.error(err);
  //       });
      
      
  //       var query = "SELECT * FROM posts";
  //         $cordovaSQLite.execute(db, query).then(function(res) {
  //             if(res.rows.length > 0) {
                
  //           } else {
  //               // console.log("No results found");
                
  //           var posts = d.data.posts;
  
  //           var query = "INSERT INTO posts (post) VALUES (?)";
  //           for(var i=0; i < posts.length; i++){
  //           // console.log('posts',posts[i]);
  //            $cordovaSQLite.execute(db, query, [JSON.stringify(posts[i])]).then(function(res) {
               
  //           //  console.log(" post INSERT ID -> " , res);
           
  //       }, function (err) {
  //           // console.error(err);
  //       }); 
  //           }
             
  //           }
  //       }, function (err) {
  //           console.error(err);
  //       });
          
  //       // }, function (err) {
  //       //     console.error(err);
  //       // });
    
 
 
 
      
    
    
  //     var query = "SELECT * FROM categories";
  //         $cordovaSQLite.execute(db, query).then(function(res) {
  //             if(res.rows.length > 0) {
  //             // console.log('rows',res);
  //             for(var i = 0; i < res.rows.length; i++){
  //               // console.log("categories -> " + res.rows.item(i).title + " " , res.rows.item(i));
                
  //             }
  //           } else {
  //               // console.log("No results found");
  //           }
  //       }, function (err) {
  //           // console.error(err);
  //       });


    
      
    httpRequest.httpFunc().then(function (d) {

        var allPost = d.data.posts;
        var query = "SELECT * FROM allPosts";
            $cordovaSQLite.execute(db, query).then(function(res) {
              if(res.rows.length > 0) {
                
              }  
                else {
                   // console.log("No results found");
                
  
                      var query = "INSERT INTO allPosts (post) VALUES (?)";
                      for(var i=0; i < allPost.length; i++){
                      // console.log('posts',posts[i]);
                      $cordovaSQLite.execute(db, query, [JSON.stringify(allPost[i])]).then(function(res) {
                        
                      //  console.log("All post INSERT ID -> " , res);
                    
             }, function (err) {
                  // Sqlite Error
          }); 
           }
          }
         }, function (err) {
                   // http Error
       });
    });
        
        
  //   //    }, function (e) {


  //   //  })
  //  }, function (e) {
     
  //  });  
      
      
      
      
      
      $ionicPush.register().then(function (t) {
        return $ionicPush.saveToken(t);
      }).then(function (t) {
      });


      $rootScope.$on('cloud:push:notification', function (event, data) {
        // console.log('data', data);
        var msg = data.message;
        var payload = data.message.payload;
        console.log("type",typeof(payload),'id');
        if (payload !== undefined) {
          // console.log('payload is not undefined')
          $http.get(WordPress_url +'/?json=get_post&post_id='+ payload.id).then(function (d) {
            var jsonStn = JSON.stringify(d.data.post);
            // console.log('data', d, 'jsontring', jsonStn);

            $state.go('menu.postDetail', {postID: jsonStn});

          }, function (e) {
            // console.log('getting error');
          })
        }
      });


      $rootScope.$on('$stateChangeSuccess', function () {


        if (typeof analytics !== 'undefined') {
          analytics.debugMode();
          // analytics.startTrackerWithId("UA-84119416-1");
          analytics.startTrackerWithId("UA-89946979-1");
          window.analytics.trackEvent('Category', 'Action', 'Label', 12);
          window.analytics.trackException('Description', true);
          window.analytics.trackTiming('Category', 3334, 'Variable', 'Label');
          window.analytics.addTransaction('ID', 'Affiliation', 34, 43, 55, 'Currency Code');

          analytics.trackView($state.current.name);
        }
        else {
          // console.log("Google Analytics Unavailable");
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
    //Ionic Push

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
