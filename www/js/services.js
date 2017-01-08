/**
 * 
 * Loading service
 * 
 */

  //show loading
var vratService = angular.module('vrat.Service',[]);
vratService.service('showLoading',function($ionicLoading) {
  this.show = function() {
    $ionicLoading.show({
      template: 'Please wait...'
    }).then(function(){
    });
  }; 
  
});

//hide loading
vratService.service('stopLoading',function($ionicLoading){
     this.hide = function(){
    $ionicLoading.hide().then(function(){
    });
  };
});


/**
 * 
 * Http Request to get Data From Server
 * 
 */
  vratService.service('httpRequest',function($http,$q){
 
   var deffered = $q.defer();
  //  var q = 1;
  
   this.httpFunc = function() { 
     $http.get(WordPress_url+'/?json=get_recent_posts&count=').then(function(resolved){
      // console.log('resolved'); 
       deffered.resolve(resolved);
  },function(rejected){
    
    deffered.reject(rejected);
  })
  
   return deffered.promise;
 }
   
});




/**
 * 
 * Alert Service
 * 
 */

vratService.service('alertService',function($ionicPopup) {
   this.showAlert = function(title,template) {
   var alertPopup = $ionicPopup.alert({
     title: title,
     template: template
   });

   alertPopup.then(function(res) {
     return true;
   });
 };
});


/**
 * 
 * Local storage Service
 * 
 */
 
vratService.factory ('StorageService', function ($localStorage,$q) {
 var deffered = $q.defer();
 $localStorage = $localStorage.$default({
    item: []
  });
  

var _getAll = function () {
  
  return $localStorage.item;
 
};

var _add = function (d) {
 
  var success = $localStorage.item.push(d);
  if(success){
    deffered.resolve(true)
    
  }
  else{
    deffered.reject(true);
  }
  return deffered.promise;
}
var _remove = function (d) {
 
  var success = $localStorage.item.splice($localStorage.item.indexOf(d), 1);
  if(success){
    deffered.resolve(true);
  }
  else{
    deffered.reject(true)
  }
  return deffered.promise;
}
return {
    getAll: _getAll,
    add: _add,
    remove: _remove
  };
})

/**
 * 
 * Ad Banner
 * 
 */

vratService.service('bannerAd',function(){
     var admobid = {};
  if( /(android)/i.test(navigator.userAgent) ) { // for android & amazon-fireos
    admobid = {
      banner: 'ca-app-pub-7631554899487555/3771586229', // or DFP format "/6253334/dfp_example_ad"
      interstitial: 'ca-app-pub-7631554899487555/5248319426'
    };
  } else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) { // for ios
    admobid = {
      banner: 'ca-app-pub-7631554899487555/3771586229', // or DFP format "/6253334/dfp_example_ad"
      interstitial: 'ca-app-pub-7631554899487555/5248319426'
    };
  } else { // for windows phone
    admobid = {
      banner: 'ca-app-pub-7631554899487555/3771586229', // or DFP format "/6253334/dfp_example_ad"
      interstitial: 'ca-app-pub-7631554899487555/5248319426'
    };
  }
  
  this.banner = function(){
  
    if(AdMob) AdMob.createBanner({
    adId: admobid.banner,
    position: AdMob.AD_POSITION.BOTTOM_CENTER,
    autoShow: true });
}

this.hideBanner = function(){
  if(AdMob) AdMob.removeBanner();
}
  
  this.showInter = function(){
      // preppare and load ad resource in background, e.g. at begining of game level
   if(AdMob) AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:true} );

  // show the interstitial later, e.g. at end of game level
  if(AdMob) AdMob.showInterstitial();
  }
})


vratService.service('fbLikeService',function($q,$window){
      var deffer = $q.defer();
       this.openWindow = function(){ 
        var d = $window.open('fb://page/1519563958349711', '_system');
        if(d){
          deffer.resolve(true);
        }
        else{
          deffer.reject(true);
        }
      
      return deffer.promise;
   }
})