//heavily based on https://github.com/gelicia/tweetSkirt/tree/master/sparktweet-twitter-bot

//twitter
var Twit = require('twit');
//rest calls
var rest = require('restler');
//storage
var levelup = require('level');
//promises
var q = require('q');

//include config files
var T = new Twit(require('./twitterConfig.js'));
var sparkConfig = require('./sparkConfig.js');

levelup.destroy('./grabbedTweets');
var displayed_db = levelup('./grabbedTweets');

var tweetQueue = [];

var MENTIONS = 0;
var RETWEETS = 1;
var FAVORITES = 2;

function twitterAPICall(data, type){
  var now = new Date(); 
  for (var i = 0; i < data.length; i++) {
	var dataOfInterest = data[i];
	//only look for tweets less than 24 hours old
	var tweetDate = new Date(dataOfInterest.created_at);
	if(now - tweetDate < (1000*60*60*24)) {
	  //check that the tweet has not yet been used
	  //we send all the data to it because the loop will keep running and we want to keep the data attached to the promise
	  var isUsedPromise = isAlreadyUsed(dataOfInterest);
	  isUsedPromise.done(function(result) {
	    if(result.toQueue) { //tweet not found! queue it up!
		  var queueTweet = {
				"id"      : result.data.id,
				type      : type,
				created_at: new Date(result.data.created_at),
				message   : result.data.text
				//"@" + result.data.user.screen_name + " - " + (result.data.text).substring(result.data.in_reply_to_screen_name.length+2)
		  };
		  tweetQueue.push(queueTweet);
		  console.log("queueing ", queueTweet.message, "queue at ", tweetQueue.length);
	    }
	  });
    }
  }
}

function queueTweets() {
  console.log("looking for tweets...");    

  q.fcall(function(){
    T.get('statuses/mentions_timeline', {count:5}, function (error, data) {
	  twitterAPICall(data, MENTIONS);
    });    	
  }).then(function(){
    T.get('statuses/retweets_of_me', {count:5}, function (error, data) {
	  twitterAPICall(data, RETWEETS);
    });
  });
}  

function isAlreadyUsed(tweetData){
  var deferred = q.defer();
  displayed_db.get(tweetData.id, function (err, value) {
    if (err) {
	  if (err.notFound){
		deferred.resolve({toQueue: true, data:tweetData});
	  } else {
		//count it as displayed (will not queue up) if there's an error, it should get queued next time around
		deferred.resolve({toQueue: false, data:tweetData});
	  }
	} else {
	  deferred.resolve({toQueue: false, data:tweetData});
	}
  });
  return deferred.promise;
}

function checkColorChange() {
  console.log("looking to change color, queue length is ", tweetQueue.length);	
  if (tweetQueue.length > 0){
    var tweet = tweetQueue.pop();
    var colorRGB = [];
    switch (tweet.type) {
      case MENTIONS:
        colorRGB = [0,0,255];
        break;
      case RETWEETS:
        colorRGB = [0,255,0];
        break;
    }

    sendMessageToSpark(colorRGB).done(function(){
	  displayed_db.put(tweet.id, tweet.created_at);
	  console.log("display done, length is ", tweetQueue.length);
    });
  }
}

function sendMessageToSpark(colorRGB){
  var deferred = q.defer();
  rest.post('https://api.spark.io/v1/devices/' + sparkConfig.deviceID + '/changeColor', {
		data: { 'access_token': sparkConfig.accessToken,
		'args': colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2]}
  }).on('complete', function(data, response) {
	//TODO error handling here when the program is running but the spark is offline
    console.log("msg sent : ", colorRGB);
	deferred.resolve();
  });
  return deferred.promise;
}

queueTweets();

//find tweets every three minutes
setInterval(queueTweets, 3 * 1000 * 60);

//display a tweet every 30 seconds
setInterval(checkColorChange, 1000 * 30);