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

vratService.service('bannerAd',function($q){
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
this.prepareInitial = function(){
  // preppare and load ad resource in background, e.g. at begining of game level
  //  if(typeof(AdMob) !== 'undefined') AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:true},function(s){
  //     console.log('initial success',s);
  //  },function(fail){
  //    console.log('inital failed',fail);
  //  });
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
  if(AdMob) AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:true},function(s){
    AdMob.showInterstitial();
  },function(e){
  });
      // check and show it at end of a game level
      AdMob.isInterstitialReady(function(ready){
        if(ready) AdMob.showInterstitial();
      });
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

vratService.service('askedForUpate',function($q,$ionicPopup,$window){
  var deffer = $q.defer();
  this.asked = function(){
    var confirmPopup = $ionicPopup.confirm({
      title: 'Alert!',
      template: 'Would to like to check the update',
      cancelText: 'No Thanks',
      okText:'Yes Please'
  });
  confirmPopup.then(function(res) {
        if(res) {
         $window.open('market://details?id=com.deucen.gujarativratkathao', '_system', 'location=yes');
       } else {
          //Do nothing
        }
        deffer.resolve(true);
      });
 return deffer.promise 
 }
})

vratService.service('askedForRating',function($q,$cordovaAppRate){
  var deffer = $q.defer();
  this.askedForRate = function(){
    AppRate.preferences = {
      openStoreInApp: true,
      useCustomRateDialog: false,
      displayAppName: 'Vrat Kahatao',
      // usesUntilPrompt: 5,
      promptAgainForEachNewVersion: false,
      storeAppURL: {
      ios: '<my_app_id>',
      android: 'market://details?id=com.deucen.gujarativratkathao',
      windows: 'ms-windows-store://pdp/?ProductId=<the apps Store ID>',
      blackberry: 'appworld://content/[App Id]/',
      windows8: 'ms-windows-store:Review?name=<the Package Family Name of the application>'
    },
    customLocale: {
      title: "Rate us",
      message: "Would you like to Rate us ?",
      cancelButtonLabel: "No, Thanks",
      laterButtonLabel: "Remind Me Later",
      rateButtonLabel: "Yes, Sure"
    },
    callbacks: {
    onRateDialogShow: function(callback){
      callback(0) // do nothing
     deffer.resolve(true); 
   },
    onButtonClicked: function(buttonIndex){
    //do noting  
    }
  }
 };
  AppRate.promptForRating(true);
  return deffer.promise;
  }
})